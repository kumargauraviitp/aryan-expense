/**
 * Main Application Orchestrator & Event Controller
 * Technical, developer-grade interaction handling with Dual-Theme Engine
 */
import { StorageService, DEFAULT_CATEGORIES, CURRENCIES, SVG_ICONS } from './storage.js';
import { AuthService } from './auth.js';
import { UI } from './ui.js';
import { AuthBackground } from './auth-bg.js';
import { Config } from './config.js';
import { SupabaseService } from './supabase.js';

class AppController {
  constructor() {
    this.currentUser = null;
    this.currentTab = 'dashboard';
    this.activeTxType = 'expense';
    this.selectedCategoryId = 'food';
    this.editingTxId = null;
    this.authBg = null;
    this.txFilters = {
      search: '',
      type: 'all',
      category: 'all',
      period: 'this_month',
      sort: 'date_desc'
    };
  }

  async init() {
    StorageService.init();
    this.initTheme();
    await Config.loadEnv();
    this.updateSupabaseStatusUI();
    this.authBg = new AuthBackground('auth-canvas');
    this.bindGlobalEvents();
    this.setupSupabaseAuthListener();
    await this.checkSession();
  }

  // ---------------- DUAL-THEME ENGINE (DARK / LIGHT) ----------------
  initTheme() {
    const savedTheme = localStorage.getItem('fintrack_theme');
    let theme = savedTheme;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    this.applyTheme(theme, false);

    // Listen to OS preference changes if user hasn't explicitly set one
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('fintrack_theme')) {
        this.applyTheme(e.matches ? 'light' : 'dark', false);
      }
    });
  }

  applyTheme(theme, notify = true) {
    const doApply = () => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('fintrack_theme', theme);
      this.updateThemeToggleIcons(theme);

      const metaTheme = document.getElementById('meta-theme-color');
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'light' ? '#f8fafc' : '#09090b');
      }

      const settingsThemeSelect = document.getElementById('settings-theme');
      if (settingsThemeSelect) {
        settingsThemeSelect.value = theme;
      }

      if (this.authBg && this.authBg.isRunning) {
        this.authBg.draw();
      }

      if (this.currentUser && Config.isSupabaseConfigured()) {
        SupabaseService.saveSettings(this.currentUser.id, { theme }).catch(e => console.warn('[Supabase Settings Warning]', e));
      }

      if (notify) {
        UI.showToast(`Switched to ${theme === 'light' ? 'Light' : 'Dark'} mode`, 'info');
        this.refreshCurrentView();
      }
    };

    if (document.startViewTransition && notify) {
      document.startViewTransition(doApply);
    } else {
      doApply();
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next, true);
  }

  updateThemeToggleIcons(theme) {
    // Sun icon for dark mode (click to go light), Moon icon for light mode (click to go dark)
    const sunSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.innerHTML = theme === 'light' ? moonSvg : sunSvg;
      btn.setAttribute('title', theme === 'light' ? 'Switch to Dark mode (Press T)' : 'Switch to Light mode (Press T)');
    });
  }

  // ---------------- SESSION & AUTH CHECK ----------------
  async checkSession() {
    this.currentUser = await AuthService.getCurrentUser();
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (this.currentUser) {
      if (this.authBg) this.authBg.stop();
      if (authView) authView.classList.add('hidden');
      if (dashboardView) dashboardView.classList.remove('hidden');
      this.setupUserUI();
      this.navigateTo('dashboard');
    } else {
      if (dashboardView) dashboardView.classList.add('hidden');
      if (authView) authView.classList.remove('hidden');
      if (this.authBg) this.authBg.start();
      this.updateSupabaseStatusUI();
    }
  }

  setupSupabaseAuthListener() {
    if (!Config.isSupabaseConfigured()) return;
    SupabaseService.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth Event]:', event);
      if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        StorageService.clearSession();
        await this.checkSession();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!this.currentUser && session?.user) {
          await this.checkSession();
        }
      }
    });
  }

  setupUserUI() {
    if (!this.currentUser) return;

    // Apply stored user theme if available
    const userSettings = StorageService.getUserSettings(this.currentUser.id);
    if (userSettings && userSettings.theme && userSettings.theme !== document.documentElement.getAttribute('data-theme')) {
      this.applyTheme(userSettings.theme, false);
    }

    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');
    const avatarEl = document.getElementById('user-avatar-badge');
    const greetingEl = document.getElementById('topbar-greeting-text');

    if (greetingEl) {
      greetingEl.innerHTML = `${UI.escapeHTML(this.currentUser.name)} <span style="font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; background: var(--bg-surface-elevated); border: 1px solid var(--border-medium); border-radius: 3px; color: var(--text-muted); margin-left: 6px; font-weight: normal;">WORKSPACE</span>`;
    }

    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (emailEl) emailEl.textContent = this.currentUser.email;
    if (avatarEl) {
      avatarEl.textContent = this.currentUser.name.charAt(0).toUpperCase();
    }

    const currencySelect = document.getElementById('settings-currency');
    if (currencySelect) {
      currencySelect.value = this.currentUser.currency || 'INR';
    }
    const profileNameInput = document.getElementById('settings-name');
    if (profileNameInput) {
      profileNameInput.value = this.currentUser.name;
    }

    this.updateSupabaseStatusUI();
  }

  updateSupabaseStatusUI() {
    const supabaseUrlInput = document.getElementById('supabase-url');
    const supabaseKeyInput = document.getElementById('supabase-anon-key');
    const supabaseBadge = document.getElementById('supabase-status-badge');
    const authStatusText = document.getElementById('auth-status-text');
    const authFooterText = document.getElementById('auth-footer-text');

    const url = Config.getSupabaseUrl();
    const key = Config.getSupabaseAnonKey();
    const source = Config.getSource();

    if (supabaseUrlInput) supabaseUrlInput.value = url;
    if (supabaseKeyInput) supabaseKeyInput.value = key;

    if (Config.isSupabaseConfigured()) {
      if (authStatusText) {
        authStatusText.textContent = `SUPABASE AUTH • TLS 1.3 ENCRYPTED (${source === 'env.local' ? '.env.local' : 'CLOUD'})`;
      }
      if (authFooterText) {
        authFooterText.textContent = 'SECURED VIA SUPABASE AUTH • SERVER-SIDE BCRYPT • ROW-LEVEL SECURITY';
      }
      if (supabaseBadge) {
        supabaseBadge.style.background = 'var(--income-dim)';
        supabaseBadge.style.color = 'var(--income)';
        supabaseBadge.style.borderColor = 'var(--income-border)';
        
        let label = 'Cloud Connected';
        if (source === 'env.local') label = 'Connected (.env.local)';
        else if (source === 'window') label = 'Connected (Vercel Env)';
        else if (source === 'localStorage') label = 'Connected (Manual Key)';
        
        supabaseBadge.textContent = label;
      }
    } else {
      if (authStatusText) {
        authStatusText.textContent = 'LOCAL STORAGE MODE • OFFLINE SANDBOX';
      }
      if (authFooterText) {
        authFooterText.textContent = 'LOCAL PERSISTENCE LAYER • CONFIGURE SUPABASE FOR CLOUD AUTH';
      }
      if (supabaseBadge) {
        supabaseBadge.style.background = 'var(--bg-surface-elevated)';
        supabaseBadge.style.color = 'var(--text-muted)';
        supabaseBadge.style.borderColor = 'var(--border-medium)';
        supabaseBadge.textContent = 'Local Storage Mode';
      }
    }
  }

  // ---------------- NAVIGATION ----------------
  navigateTo(tabId) {
    const doNavigate = () => {
      this.currentTab = tabId;

      document.querySelectorAll('.nav-item-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      document.getElementById('app-sidebar')?.classList.remove('open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');

      document.querySelectorAll('.app-tab-page').forEach(page => {
        if (page.id === `page-${tabId}`) {
          page.classList.remove('hidden');
        } else {
          page.classList.add('hidden');
        }
      });

      this.refreshCurrentView();
    };

    if (document.startViewTransition) {
      document.startViewTransition(doNavigate);
    } else {
      doNavigate();
    }
  }

  refreshCurrentView() {
    if (!this.currentUser) return;
    const transactions = StorageService.getUserTransactions(this.currentUser.id);
    const budgets = StorageService.getUserBudgets(this.currentUser.id);
    const goals = StorageService.getUserGoals(this.currentUser.id);

    if (this.currentTab === 'dashboard') {
      UI.renderDashboard(this.currentUser, transactions, budgets);
    } else if (this.currentTab === 'transactions') {
      this.populateCategoryFilterDropdown();
      const filtered = this.applyTransactionFilters(transactions);
      UI.renderTransactionsTable(filtered, this.currentUser.currency);
    } else if (this.currentTab === 'budgets') {
      UI.renderBudgetsView(budgets, transactions, this.currentUser.currency);
      UI.renderGoalsView(goals, this.currentUser.currency);
    } else if (this.currentTab === 'analytics') {
      UI.renderAnalyticsView(transactions, this.currentUser.currency);
    }
  }

  // ---------------- TRANSACTION FILTERING ----------------
  applyTransactionFilters(transactions) {
    const { search, type, category, period, sort } = this.txFilters;
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let result = transactions.filter(tx => {
      if (search) {
        const q = search.toLowerCase();
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const catMatch = (tx.categoryName || '').toLowerCase().includes(q);
        const notesMatch = (tx.notes || '').toLowerCase().includes(q);
        if (!titleMatch && !catMatch && !notesMatch) return false;
      }

      if (type !== 'all' && tx.type !== type) return false;
      if (category !== 'all' && tx.categoryId !== category) return false;

      if (period !== 'all') {
        const txDate = new Date(tx.date);
        if (period === 'this_month') {
          if (txDate.getMonth() !== curMonth || txDate.getFullYear() !== curYear) return false;
        } else if (period === 'last_month') {
          const lastMonthDate = new Date(curYear, curMonth - 1, 1);
          if (txDate.getMonth() !== lastMonthDate.getMonth() || txDate.getFullYear() !== lastMonthDate.getFullYear()) {
            return false;
          }
        } else if (period === 'last_30_days') {
          const diffDays = (now - txDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (period === 'this_year') {
          if (txDate.getFullYear() !== curYear) return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sort === 'date_desc') return new Date(b.date) - new Date(a.date);
      if (sort === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (sort === 'amount_desc') return Number(b.amount) - Number(a.amount);
      if (sort === 'amount_asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return result;
  }

  populateCategoryFilterDropdown() {
    const select = document.getElementById('filter-category');
    if (!select || select.options.length > 1) return;

    const allCats = [...DEFAULT_CATEGORIES.expense, ...DEFAULT_CATEGORIES.income];
    const unique = [];
    allCats.forEach(c => {
      if (!unique.find(u => u.id === c.id)) unique.push(c);
    });

    unique.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  }

  renderCategoryPickerGrid(type = 'expense') {
    const container = document.getElementById('category-picker-grid');
    if (!container) return;

    const categories = DEFAULT_CATEGORIES[type] || DEFAULT_CATEGORIES.expense;
    container.innerHTML = categories.map((cat, idx) => {
      const isSelected = (cat.id === this.selectedCategoryId) || (idx === 0 && !this.selectedCategoryId);
      if (isSelected && !this.selectedCategoryId) {
        this.selectedCategoryId = cat.id;
      }
      const iconSvg = UI.getCategoryIconSvg(cat.iconKey);
      return `
        <div class="cat-picker-item ${isSelected ? 'selected' : ''}" data-cat-id="${cat.id}">
          <div class="cat-icon-svg">${iconSvg}</div>
          <span class="cat-title">${cat.name}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.cat-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.cat-picker-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedCategoryId = item.getAttribute('data-cat-id');
      });
    });
  }

  openTransactionModal(editTxId = null) {
    const dialog = document.getElementById('transaction-modal');
    if (!dialog) return;

    this.editingTxId = editTxId;
    const modalTitle = document.getElementById('tx-modal-title');
    const form = document.getElementById('transaction-form');
    form.reset();

    const currencySymbolPrefix = document.getElementById('tx-currency-prefix');
    if (currencySymbolPrefix && this.currentUser) {
      currencySymbolPrefix.textContent = UI.getCurrencySymbol(this.currentUser.currency);
    }

    if (editTxId) {
      const all = StorageService.getUserTransactions(this.currentUser.id);
      const tx = all.find(t => t.id === editTxId);
      if (tx) {
        modalTitle.textContent = 'Edit Ledger Entry';
        this.activeTxType = tx.type;
        this.selectedCategoryId = tx.categoryId;
        document.getElementById('tx-title').value = tx.title;
        document.getElementById('tx-amount').value = tx.amount;
        document.getElementById('tx-date').value = tx.date;
        document.getElementById('tx-payment-method').value = tx.paymentMethod || 'Bank Transfer';
        document.getElementById('tx-notes').value = tx.notes || '';
        document.getElementById('tx-recurring').checked = !!tx.isRecurring;
      }
    } else {
      modalTitle.textContent = 'New Ledger Entry';
      this.activeTxType = 'expense';
      this.selectedCategoryId = DEFAULT_CATEGORIES.expense[0].id;
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    }

    this.updateTypeToggleUI();
    this.renderCategoryPickerGrid(this.activeTxType);

    dialog.showModal();
  }

  updateTypeToggleUI() {
    const btnExpense = document.getElementById('type-toggle-expense');
    const btnIncome = document.getElementById('type-toggle-income');

    if (this.activeTxType === 'expense') {
      btnExpense.className = 'type-toggle-btn active expense';
      btnIncome.className = 'type-toggle-btn';
    } else {
      btnExpense.className = 'type-toggle-btn';
      btnIncome.className = 'type-toggle-btn active income';
    }
  }

  closeModal(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) dialog.close();
  }

  bindGlobalEvents() {
    // Theme Toggle Buttons (Topbar, Auth View)
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });

    document.getElementById('settings-theme')?.addEventListener('change', (e) => {
      this.applyTheme(e.target.value, true);
    });

    // Auth Tabs Switch
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.getAttribute('data-tab');
        const loginPanel = document.getElementById('login-panel');
        const registerPanel = document.getElementById('register-panel');

        if (tab === 'login') {
          loginPanel.classList.remove('hidden');
          registerPanel.classList.add('hidden');
        } else {
          loginPanel.classList.add('hidden');
          registerPanel.classList.remove('hidden');
        }
      });
    });

    document.getElementById('btn-demo-login')?.addEventListener('click', async () => {
      const demoBtn = document.getElementById('btn-demo-login');
      demoBtn?.classList.add('is-loading');
      try {
        const res = await AuthService.loginDemo();
        if (res.success) {
          UI.showToast(`Workspace loaded [${res.user?.name || 'Aryan Sharma'}]`, 'success');
          await this.checkSession();
        } else {
          UI.showToast(res.message, 'error');
        }
      } catch (err) {
        UI.showToast(err.message || 'Demo launch failed', 'error');
      } finally {
        demoBtn?.classList.remove('is-loading');
      }
    });

    // Password visibility eye toggles
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.title = isPassword ? 'Hide password' : 'Show password';
        btn.innerHTML = isPassword
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
      });
    });

    // Forgot Password Modal Controls
    const forgotModal = document.getElementById('forgot-password-modal');
    document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
      const emailInput = document.getElementById('forgot-email');
      const loginEmail = document.getElementById('login-email')?.value;
      if (emailInput && loginEmail) emailInput.value = loginEmail;
      forgotModal?.showModal();
    });

    document.getElementById('btn-close-forgot-modal')?.addEventListener('click', () => {
      forgotModal?.close();
    });
    document.getElementById('btn-cancel-forgot-modal')?.addEventListener('click', () => {
      forgotModal?.close();
    });

    document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email')?.value;
      const submitBtn = document.getElementById('btn-submit-forgot');
      try {
        submitBtn?.classList.add('is-loading');
        const res = await AuthService.resetPassword(email);
        if (res.success) {
          UI.showToast(res.message, 'success');
          forgotModal?.close();
        } else {
          UI.showToast(res.message, 'error');
        }
      } finally {
        submitBtn?.classList.remove('is-loading');
      }
    });

    // Notice Switch Back to Sign In
    document.getElementById('btn-notice-switch-login')?.addEventListener('click', () => {
      document.getElementById('auth-notice-card')?.classList.add('hidden');
      const loginTabBtn = document.querySelector('.auth-tab-btn[data-tab="login"]');
      loginTabBtn?.click();
    });

    // Sign In Submit (Supabase Auth)
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-login-submit');

      try {
        submitBtn?.classList.add('is-loading');
        const res = await AuthService.login(email, pass);

        if (res.success) {
          UI.showToast(`Authenticated: ${res.user.name}`, 'success');
          await this.checkSession();
        } else {
          UI.showToast(res.message, 'error');
          const container = document.querySelector('.auth-card');
          container?.classList.add('shake');
          setTimeout(() => container?.classList.remove('shake'), 400);
        }
      } finally {
        submitBtn?.classList.remove('is-loading');
      }
    });

    // Create Account Submit (Supabase Auth)
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-password').value;
      const currency = document.getElementById('reg-currency').value;
      const balance = document.getElementById('reg-balance').value;
      const submitBtn = document.getElementById('btn-register-submit');

      try {
        submitBtn?.classList.add('is-loading');
        const res = await AuthService.register({ name, email, password: pass, currency, initialBalance: balance });
        if (res.success) {
          if (res.confirmed) {
            UI.showToast(`Workspace initialized for ${res.user.name}`, 'success');
            await this.checkSession();
          } else {
            // Email confirmation required by project settings
            const noticeCard = document.getElementById('auth-notice-card');
            const noticeDesc = document.getElementById('notice-desc');
            if (noticeDesc) {
              noticeDesc.innerHTML = `We've sent a verification link to <strong>${UI.escapeHTML(email)}</strong>. Please click the confirmation link to activate your Supabase account.`;
            }
            noticeCard?.classList.remove('hidden');
            UI.showToast('Verification email dispatched by Supabase', 'info');
          }
        } else {
          UI.showToast(res.message, 'error');
          const container = document.querySelector('.auth-card');
          container?.classList.add('shake');
          setTimeout(() => container?.classList.remove('shake'), 400);
        }
      } finally {
        submitBtn?.classList.remove('is-loading');
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await AuthService.logout();
      this.currentUser = null;
      UI.showToast('Session terminated', 'info');
      await this.checkSession();
    });

    document.querySelectorAll('.nav-item-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (tab) this.navigateTo(tab);
      });
    });

    const menuBtn = document.getElementById('btn-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    menuBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      backdrop?.classList.toggle('active');
    });
    backdrop?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      backdrop?.classList.remove('active');
    });

    document.querySelectorAll('.btn-open-tx-modal').forEach(btn => {
      btn.addEventListener('click', () => this.openTransactionModal());
    });

    document.getElementById('type-toggle-expense')?.addEventListener('click', () => {
      this.activeTxType = 'expense';
      this.selectedCategoryId = DEFAULT_CATEGORIES.expense[0].id;
      this.updateTypeToggleUI();
      this.renderCategoryPickerGrid('expense');
    });

    document.getElementById('type-toggle-income')?.addEventListener('click', () => {
      this.activeTxType = 'income';
      this.selectedCategoryId = DEFAULT_CATEGORIES.income[0].id;
      this.updateTypeToggleUI();
      this.renderCategoryPickerGrid('income');
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const dialog = btn.closest('dialog');
        if (dialog) dialog.close();
      });
    });

    document.getElementById('transaction-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.currentUser) return;

      const title = document.getElementById('tx-title').value.trim();
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const date = document.getElementById('tx-date').value;
      const paymentMethod = document.getElementById('tx-payment-method').value;
      const notes = document.getElementById('tx-notes').value.trim();
      const isRecurring = document.getElementById('tx-recurring').checked;

      if (!title || isNaN(amount) || amount <= 0 || !date) {
        UI.showToast('Please provide title, valid amount, and date.', 'error');
        return;
      }

      const allCats = [...DEFAULT_CATEGORIES.expense, ...DEFAULT_CATEGORIES.income];
      const catObj = allCats.find(c => c.id === this.selectedCategoryId) || { name: 'Miscellaneous', iconKey: 'other' };

      const txRecord = {
        id: this.editingTxId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: this.currentUser.id,
        type: this.activeTxType,
        title,
        amount,
        categoryId: this.selectedCategoryId,
        categoryName: catObj.name,
        iconKey: catObj.iconKey,
        date,
        paymentMethod,
        notes,
        isRecurring
      };

      StorageService.saveTransaction(txRecord);
      if (Config.isSupabaseConfigured()) {
        SupabaseService.saveTransaction(txRecord).catch(err => console.warn('[Supabase Sync Error]', err));
        SupabaseService.logActivity(this.currentUser.id, this.editingTxId ? 'UPDATE_TRANSACTION' : 'RECORD_TRANSACTION', 'transaction', txRecord.id, { title: txRecord.title, amount: txRecord.amount, type: txRecord.type });
      }
      this.closeModal('transaction-modal');
      UI.showToast(
        this.editingTxId ? 'Ledger entry updated' : 'Ledger entry recorded',
        'success'
      );
      this.editingTxId = null;
      this.refreshCurrentView();
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-tx-btn');
      if (editBtn) {
        const txId = editBtn.getAttribute('data-id');
        this.openTransactionModal(txId);
        return;
      }

      const deleteBtn = e.target.closest('.delete-tx-btn');
      if (deleteBtn) {
        const txId = deleteBtn.getAttribute('data-id');
        const deleted = StorageService.deleteTransaction(txId);
        if (deleted) {
          if (Config.isSupabaseConfigured()) {
            SupabaseService.deleteTransaction(txId).catch(err => console.warn('[Supabase Sync Error]', err));
            SupabaseService.logActivity(this.currentUser.id, 'DELETE_TRANSACTION', 'transaction', txId, { title: deleted.title });
          }
          this.refreshCurrentView();
          UI.showToast(`Deleted "${deleted.title}"`, 'info', () => {
            StorageService.saveTransaction(deleted);
            if (Config.isSupabaseConfigured()) {
              SupabaseService.saveTransaction(deleted).catch(err => console.warn('[Supabase Sync Error]', err));
              SupabaseService.logActivity(this.currentUser.id, 'RESTORE_TRANSACTION', 'transaction', deleted.id, { title: deleted.title });
            }
            this.refreshCurrentView();
            UI.showToast(`Restored "${deleted.title}"`, 'success');
          });
        }
        return;
      }

      const addFundsBtn = e.target.closest('.add-funds-btn');
      if (addFundsBtn) {
        const goalId = addFundsBtn.getAttribute('data-id');
        this.openAddFundsModal(goalId);
        return;
      }

      const deleteGoalBtn = e.target.closest('.delete-goal-btn');
      if (deleteGoalBtn) {
        const goalId = deleteGoalBtn.getAttribute('data-id');
        if (confirm('Delete this reserve goal?')) {
          StorageService.deleteGoal(goalId);
          if (Config.isSupabaseConfigured()) {
            SupabaseService.deleteGoal(goalId).catch(err => console.warn('[Supabase Sync Error]', err));
            SupabaseService.logActivity(this.currentUser.id, 'DELETE_GOAL', 'goal', goalId, {});
          }
          this.refreshCurrentView();
          UI.showToast('Reserve goal removed', 'info');
        }
        return;
      }

      if (e.target.id === 'btn-quick-create-budget' || e.target.id === 'btn-open-new-budget-modal') {
        this.openBudgetModal();
        return;
      }

      if (e.target.id === 'btn-open-new-goal-modal') {
        this.openGoalModal();
        return;
      }
    });

    const searchInput = document.getElementById('filter-search');
    searchInput?.addEventListener('input', (e) => {
      this.txFilters.search = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('filter-type')?.addEventListener('change', (e) => {
      this.txFilters.type = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.txFilters.category = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('filter-period')?.addEventListener('change', (e) => {
      this.txFilters.period = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('filter-sort')?.addEventListener('change', (e) => {
      this.txFilters.sort = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('btn-header-add-budget')?.addEventListener('click', () => this.openBudgetModal());
    document.getElementById('budget-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const catId = document.getElementById('budget-category').value;
      const limit = parseFloat(document.getElementById('budget-amount').value);

      if (!catId || isNaN(limit) || limit <= 0) {
        UI.showToast('Specify category and positive limit threshold.', 'error');
        return;
      }

      const budgetRecord = {
        id: `b_${this.currentUser.id}_${catId}`,
        userId: this.currentUser.id,
        categoryId: catId,
        monthlyLimit: limit
      };

      StorageService.saveBudget(budgetRecord);
      if (Config.isSupabaseConfigured()) {
        SupabaseService.saveBudget(budgetRecord).catch(err => console.warn('[Supabase Sync Error]', err));
        SupabaseService.logActivity(this.currentUser.id, 'SAVE_BUDGET', 'budget', budgetRecord.id, { categoryId: catId, limit });
      }

      this.closeModal('budget-modal');
      UI.showToast('Threshold committed', 'success');
      this.refreshCurrentView();
    });

    document.getElementById('btn-header-add-goal')?.addEventListener('click', () => this.openGoalModal());
    document.getElementById('goal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('goal-title').value.trim();
      const target = parseFloat(document.getElementById('goal-target').value);
      const initial = parseFloat(document.getElementById('goal-current').value) || 0;
      const deadline = document.getElementById('goal-deadline').value;

      if (!title || isNaN(target) || target <= 0) {
        UI.showToast('Please provide a goal identifier and target capital.', 'error');
        return;
      }

      const goalRecord = {
        id: `g_${Date.now()}`,
        userId: this.currentUser.id,
        title,
        targetAmount: target,
        currentAmount: initial,
        deadline
      };

      StorageService.saveGoal(goalRecord);
      if (Config.isSupabaseConfigured()) {
        SupabaseService.saveGoal(goalRecord).catch(err => console.warn('[Supabase Sync Error]', err));
        SupabaseService.logActivity(this.currentUser.id, 'CREATE_GOAL', 'goal', goalRecord.id, { title, target });
        if (initial > 0) {
          const depRecord = {
            id: `dep_${Date.now()}`,
            goalId: goalRecord.id,
            userId: this.currentUser.id,
            amount: initial,
            date: new Date().toISOString().split('T')[0],
            notes: 'Initial allocation at goal creation'
          };
          StorageService.saveGoalDeposit(depRecord);
          SupabaseService.addGoalDeposit(depRecord).catch(err => console.warn('[Supabase Sync Error]', err));
        }
      }

      this.closeModal('goal-modal');
      UI.showToast('Reserve goal tracked', 'success');
      this.refreshCurrentView();
    });

    document.getElementById('add-funds-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const goalId = document.getElementById('add-funds-goal-id').value;
      const amount = parseFloat(document.getElementById('add-funds-amount').value);

      if (isNaN(amount) || amount <= 0) {
        UI.showToast('Enter valid allocation figure.', 'error');
        return;
      }

      const updated = StorageService.addGoalDeposit(goalId, amount);
      if (updated) {
        const depositRecord = {
          id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          goalId: goalId,
          userId: this.currentUser.id,
          amount: amount,
          date: new Date().toISOString().split('T')[0],
          notes: `Capital allocation to "${updated.title}"`
        };
        StorageService.saveGoalDeposit(depositRecord);
        if (Config.isSupabaseConfigured()) {
          SupabaseService.addGoalDeposit(depositRecord).catch(err => console.warn('[Supabase Sync Error]', err));
          SupabaseService.logActivity(this.currentUser.id, 'ALLOCATE_FUNDS', 'goal', goalId, { amount, title: updated.title });
        }
        this.closeModal('add-funds-modal');
        UI.showToast(`Allocated ${UI.formatAmount(amount, this.currentUser.currency)} to "${updated.title}"`, 'success');
        this.refreshCurrentView();
      }
    });

    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value;
      const currency = document.getElementById('settings-currency').value;

      const res = await AuthService.updateProfile(this.currentUser.id, { name, currency });
      if (res.success) {
        this.currentUser = res.user;
        if (Config.isSupabaseConfigured()) {
          SupabaseService.saveSettings(this.currentUser.id, { currency }).catch(e => console.warn(e));
          SupabaseService.logActivity(this.currentUser.id, 'UPDATE_PROFILE', 'profile', this.currentUser.id, { name, currency });
        }
        this.setupUserUI();
        UI.showToast('Preferences updated', 'success');
        this.refreshCurrentView();
      }
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      if (!this.currentUser) return;
      const csv = StorageService.exportToCSV(this.currentUser.id);
      if (!csv) {
        UI.showToast('Ledger empty', 'info');
        return;
      }
      this.downloadFile(csv, `ledger_${this.currentUser.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      UI.showToast('CSV export downloaded', 'success');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      if (!this.currentUser) return;
      const json = StorageService.exportUserData(this.currentUser.id);
      this.downloadFile(json, `ledger_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      UI.showToast('JSON backup downloaded', 'success');
    });

    const importInput = document.getElementById('import-json-input');
    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      importInput?.click();
    });

    importInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = StorageService.importUserData(this.currentUser.id, event.target.result);
        if (ok) {
          UI.showToast('Ledger restored from JSON', 'success');
          this.refreshCurrentView();
        } else {
          UI.showToast('Malformed backup file schema', 'error');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-reset-user-data')?.addEventListener('click', () => {
      if (confirm('CRITICAL: Purge all ledger transactions, thresholds, and goals for current account?')) {
        StorageService.resetUserData(this.currentUser.id);
        UI.showToast('Ledger purged', 'info');
        this.refreshCurrentView();
      }
    });

    // Supabase Cloud Configuration Handlers
    document.getElementById('supabase-config-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-anon-key').value.trim();

      if (!url || !key) {
        UI.showToast('Please provide both Supabase URL and Anon Key', 'error');
        return;
      }

      Config.setSupabaseConfig(url, key);
      SupabaseService.resetClient();
      this.updateSupabaseStatusUI();

      UI.showToast('Connecting to Supabase...', 'info');
      const test = await SupabaseService.testConnection();
      if (test.success) {
        UI.showToast('Connected to Supabase Cloud!', 'success');
        this.updateSupabaseStatusUI();
      } else {
        UI.showToast(`Saved, but ping failed: ${test.message}`, 'error');
      }
    });

    document.getElementById('btn-test-supabase')?.addEventListener('click', async () => {
      UI.showToast('Pinging Supabase...', 'info');
      const test = await SupabaseService.testConnection();
      if (test.success) {
        UI.showToast('Supabase connection verified!', 'success');
        this.updateSupabaseStatusUI();
      } else {
        UI.showToast(test.message, 'error');
      }
    });

    document.getElementById('btn-sync-to-cloud')?.addEventListener('click', async () => {
      if (!this.currentUser) return;
      if (!Config.isSupabaseConfigured()) {
        UI.showToast('Configure Supabase credentials first', 'error');
        return;
      }

      const syncBtn = document.getElementById('btn-sync-to-cloud');
      syncBtn?.classList.add('is-loading');
      UI.showToast('Pushing complete ledger to Supabase...', 'info');
      try {
        const txs = StorageService.getUserTransactions(this.currentUser.id);
        const budgets = StorageService.getUserBudgets(this.currentUser.id);
        const goals = StorageService.getUserGoals(this.currentUser.id);
        const deposits = StorageService.getUserGoalDeposits(this.currentUser.id);
        const categories = StorageService.getUserCategories(this.currentUser.id);
        const settings = StorageService.getUserSettings(this.currentUser.id);

        await SupabaseService.pushLocalDataToCloud(this.currentUser.id, txs, budgets, goals, deposits, categories, settings);
        await SupabaseService.logActivity(this.currentUser.id, 'MANUAL_CLOUD_SYNC', 'sync', 'full', { transactionsCount: txs.length, budgetsCount: budgets.length, goalsCount: goals.length });
        
        // Re-pull to synchronize state
        await SupabaseService.pullCloudDataToLocal(this.currentUser.id);
        this.refreshCurrentView();

        UI.showToast('All available data successfully stored in Supabase!', 'success');
      } catch (err) {
        UI.showToast(`Sync error: ${err.message}`, 'error');
      } finally {
        syncBtn?.classList.remove('is-loading');
      }
    });

    document.getElementById('btn-clear-supabase')?.addEventListener('click', () => {
      Config.setSupabaseConfig('', '');
      SupabaseService.resetClient();
      const urlInput = document.getElementById('supabase-url');
      const keyInput = document.getElementById('supabase-anon-key');
      if (urlInput) urlInput.value = '';
      if (keyInput) keyInput.value = '';
      this.updateSupabaseStatusUI();
      UI.showToast('Disconnected from Supabase. Using Local Storage.', 'info');
    });

    // Light dismiss fallback for all native dialogs (click outside content closes modal)
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          const isInside = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
          );
          if (!isInside) {
            dialog.close();
          }
        }
      });
    });

    // Global Keyboard Shortcuts (⌘K for new entry, T for theme toggle, 1-5 for tabs, Esc for modal dismiss)
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // ⌘K or Ctrl+K -> New Entry
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openTransactionModal();
        return;
      }

      // T -> Theme Toggle (only when not typing)
      if (e.key.toLowerCase() === 't' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.toggleTheme();
        return;
      }

      // 1-5 -> Quick Tab Navigation (only when authenticated and not typing)
      if (this.currentUser && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); this.navigateTo('dashboard'); return; }
        if (e.key === '2') { e.preventDefault(); this.navigateTo('transactions'); return; }
        if (e.key === '3') { e.preventDefault(); this.navigateTo('budgets'); return; }
        if (e.key === '4') { e.preventDefault(); this.navigateTo('analytics'); return; }
        if (e.key === '5') { e.preventDefault(); this.navigateTo('settings'); return; }
      }

      // Escape -> Close Modals
      if (e.key === 'Escape') {
        document.querySelectorAll('dialog[open]').forEach(d => d.close());
      }
    });
  }

  openBudgetModal() {
    const dialog = document.getElementById('budget-modal');
    if (!dialog) return;

    const select = document.getElementById('budget-category');
    select.innerHTML = DEFAULT_CATEGORIES.expense.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');

    const prefix = document.getElementById('budget-currency-prefix');
    if (prefix && this.currentUser) {
      prefix.textContent = UI.getCurrencySymbol(this.currentUser.currency);
    }

    dialog.showModal();
  }

  openGoalModal() {
    const dialog = document.getElementById('goal-modal');
    if (!dialog) return;

    const prefix = document.getElementById('goal-currency-prefix');
    if (prefix && this.currentUser) {
      prefix.textContent = UI.getCurrencySymbol(this.currentUser.currency);
    }

    dialog.showModal();
  }

  openAddFundsModal(goalId) {
    const dialog = document.getElementById('add-funds-modal');
    if (!dialog) return;

    document.getElementById('add-funds-goal-id').value = goalId;
    document.getElementById('add-funds-amount').value = '';

    const prefix = document.getElementById('add-funds-prefix');
    if (prefix && this.currentUser) {
      prefix.textContent = UI.getCurrencySymbol(this.currentUser.currency);
    }

    dialog.showModal();
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
