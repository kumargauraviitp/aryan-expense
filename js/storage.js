/**
 * Storage & Database Engine (localStorage backed)
 * Precision data structure with clean SVG icon mapping
 */

const STORAGE_KEYS = {
  USERS: 'fintrack_users_db',
  SESSION: 'fintrack_active_session',
  TRANSACTIONS: 'fintrack_transactions_db',
  BUDGETS: 'fintrack_budgets_db',
  GOALS: 'fintrack_goals_db',
  CATEGORIES: 'fintrack_categories_db',
  GOAL_DEPOSITS: 'fintrack_goal_deposits_db',
  SETTINGS: 'fintrack_settings_db',
  ACTIVITY_LOGS: 'fintrack_activity_logs_db',
  INITIALIZED: 'fintrack_seeded_v2'
};

export const SVG_ICONS = {
  food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  groceries: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  housing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  transport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M9 18v2"/><path d="M15 18v2"/><path d="M4 11h16"/></svg>`,
  shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8 8a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
  entertainment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="15" x="2" y="3" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
  bills: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  health: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  education: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>`,
  salary: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
  freelance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  investment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  bonus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`
};

export const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', name: 'Dining & Provisions', iconKey: 'food', color: '#f59e0b' },
    { id: 'groceries', name: 'Groceries & Pantry', iconKey: 'groceries', color: '#10b981' },
    { id: 'housing', name: 'Housing & Office', iconKey: 'housing', color: '#6366f1' },
    { id: 'transport', name: 'Transit & Logistics', iconKey: 'transport', color: '#38bdf8' },
    { id: 'shopping', name: 'Hardware & Supplies', iconKey: 'shopping', color: '#ec4899' },
    { id: 'entertainment', name: 'Media & Subscriptions', iconKey: 'entertainment', color: '#8b5cf6' },
    { id: 'bills', name: 'Utilities & Power', iconKey: 'bills', color: '#eab308' },
    { id: 'health', name: 'Health & Wellness', iconKey: 'health', color: '#14b8a6' },
    { id: 'education', name: 'Books & Resources', iconKey: 'education', color: '#a855f7' },
    { id: 'other', name: 'Miscellaneous', iconKey: 'other', color: '#71717a' }
  ],
  income: [
    { id: 'salary', name: 'Payroll & Retainer', iconKey: 'salary', color: '#22c55e' },
    { id: 'freelance', name: 'Client Contracts', iconKey: 'freelance', color: '#06b6d4' },
    { id: 'investment', name: 'Capital Yield & Divs', iconKey: 'investment', color: '#6366f1' },
    { id: 'bonus', name: 'Incentives & Performance', iconKey: 'bonus', color: '#f59e0b' },
    { id: 'other', name: 'Other Inflows', iconKey: 'other', color: '#22c55e' }
  ]
};

export const CURRENCIES = {
  INR: { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  USD: { symbol: '$', code: 'USD', label: 'USD ($)' },
  EUR: { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  GBP: { symbol: '£', code: 'GBP', label: 'GBP (£)' },
  AED: { symbol: 'AED ', code: 'AED', label: 'AED' },
  CAD: { symbol: 'CA$', code: 'CAD', label: 'CAD ($)' }
};

// Cryptographic hash simulation
export function hashPassword(plainText) {
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + plainText.length;
}

export const StorageService = {
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.seedDemoData();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  // ---------------- USER ACCOUNTS ----------------
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch {
      return [];
    }
  },

  saveUser(user) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  findUserByEmail(email) {
    const users = this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  findUserById(id) {
    const users = this.getUsers();
    return users.find(u => u.id === id);
  },

  // ---------------- SESSION ----------------
  getCurrentSession() {
    return localStorage.getItem(STORAGE_KEYS.SESSION);
  },

  setSession(userId) {
    localStorage.setItem(STORAGE_KEYS.SESSION, userId);
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getCurrentUser() {
    const userId = this.getCurrentSession();
    if (!userId) return null;
    return this.findUserById(userId);
  },

  // ---------------- TRANSACTIONS ----------------
  getAllTransactions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    } catch {
      return [];
    }
  },

  getUserTransactions(userId) {
    const all = this.getAllTransactions();
    return all.filter(tx => tx.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  saveTransaction(tx) {
    const all = this.getAllTransactions();
    const index = all.findIndex(t => t.id === tx.id);
    if (index >= 0) {
      all[index] = tx;
    } else {
      all.push(tx);
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(all));
  },

  deleteTransaction(id) {
    const all = this.getAllTransactions();
    const deleted = all.find(t => t.id === id);
    const filtered = all.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
    return deleted;
  },

  setUserTransactions(userId, transactions) {
    const others = this.getAllTransactions().filter(t => t.userId !== userId);
    const updated = [...others, ...transactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  },

  // ---------------- BUDGETS ----------------
  getUserBudgets(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || [];
      return all.filter(b => b.userId === userId);
    } catch {
      return [];
    }
  },

  saveBudget(budget) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || [];
      const index = all.findIndex(b => b.userId === budget.userId && b.categoryId === budget.categoryId);
      if (index >= 0) {
        all[index] = budget;
      } else {
        all.push(budget);
      }
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving budget', e);
    }
  },

  setUserBudgets(userId, budgets) {
    try {
      const all = (JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || []).filter(b => b.userId !== userId);
      const updated = [...all, ...budgets];
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error setting user budgets', e);
    }
  },

  // ---------------- GOALS ----------------
  getUserGoals(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || [];
      return all.filter(g => g.userId === userId);
    } catch {
      return [];
    }
  },

  saveGoal(goal) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || [];
      const index = all.findIndex(g => g.id === goal.id);
      if (index >= 0) {
        all[index] = goal;
      } else {
        all.push(goal);
      }
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving goal', e);
    }
  },

  setUserGoals(userId, goals) {
    try {
      const all = (JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || []).filter(g => g.userId !== userId);
      const updated = [...all, ...goals];
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error setting user goals', e);
    }
  },

  addGoalDeposit(goalId, amount) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || [];
      const goal = all.find(g => g.id === goalId);
      if (goal) {
        goal.currentAmount = (Number(goal.currentAmount) || 0) + Number(amount);
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(all));
        return goal;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  },

  deleteGoal(goalId) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || [];
      all = all.filter(g => g.id !== goalId);
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(all));
    } catch (e) {
      console.error(e);
    }
  },

  // ---------------- GOAL DEPOSITS ----------------
  getUserGoalDeposits(userId, goalId = null) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOAL_DEPOSITS)) || [];
      return all.filter(d => d.userId === userId && (!goalId || d.goalId === goalId));
    } catch {
      return [];
    }
  },

  saveGoalDeposit(dep) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOAL_DEPOSITS)) || [];
      const idx = all.findIndex(d => d.id === dep.id);
      if (idx >= 0) all[idx] = dep;
      else all.push(dep);
      localStorage.setItem(STORAGE_KEYS.GOAL_DEPOSITS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving goal deposit', e);
    }
  },

  setUserGoalDeposits(userId, deposits) {
    try {
      const all = (JSON.parse(localStorage.getItem(STORAGE_KEYS.GOAL_DEPOSITS)) || []).filter(d => d.userId !== userId);
      const updated = [...all, ...deposits];
      localStorage.setItem(STORAGE_KEYS.GOAL_DEPOSITS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error setting user goal deposits', e);
    }
  },

  // ---------------- CATEGORIES ----------------
  getUserCategories(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
      return all.filter(c => !c.userId || c.userId === userId);
    } catch {
      return [];
    }
  },

  saveCategory(cat) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
      const idx = all.findIndex(c => c.id === cat.id && c.userId === cat.userId);
      if (idx >= 0) all[idx] = cat;
      else all.push(cat);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving category', e);
    }
  },

  setUserCategories(userId, categories) {
    try {
      const all = (JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || []).filter(c => c.userId && c.userId !== userId);
      const updated = [...all, ...categories];
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    } catch (e) {
      console.error('Error setting user categories', e);
    }
  },

  // ---------------- SETTINGS ----------------
  getUserSettings(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {};
      return all[userId] || { theme: 'dark', currency: 'INR', telemetryEnabled: true };
    } catch {
      return { theme: 'dark', currency: 'INR', telemetryEnabled: true };
    }
  },

  saveUserSettings(userId, settings) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {};
      all[userId] = { ...(all[userId] || {}), ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving user settings', e);
    }
  },

  // ---------------- ACTIVITY LOGS ----------------
  getUserActivityLogs(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) || [];
      return all.filter(l => l.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch {
      return [];
    }
  },

  saveActivityLog(log) {
    try {
      let all = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) || [];
      all.unshift(log);
      if (all.length > 200) all = all.slice(0, 200); // cap logs
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving activity log', e);
    }
  },

  setUserActivityLogs(userId, logs) {
    try {
      const all = (JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS)) || []).filter(l => l.userId !== userId);
      const updated = [...all, ...logs];
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error setting user activity logs', e);
    }
  },

  // ---------------- EXPORT / IMPORT ----------------
  exportUserData(userId) {
    const user = this.findUserById(userId);
    const transactions = this.getUserTransactions(userId);
    const budgets = this.getUserBudgets(userId);
    const goals = this.getUserGoals(userId);

    return JSON.stringify({
      schemaVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email, currency: user.currency },
      transactions,
      budgets,
      goals
    }, null, 2);
  },

  exportToCSV(userId) {
    const transactions = this.getUserTransactions(userId);
    if (!transactions.length) return '';

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Notes', 'Recurring'];
    const rows = transactions.map(tx => [
      `"${tx.date}"`,
      `"${tx.type.toUpperCase()}"`,
      `"${tx.categoryName || tx.categoryId}"`,
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      tx.amount,
      `"${tx.paymentMethod || 'N/A'}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
      tx.isRecurring ? 'TRUE' : 'FALSE'
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  importUserData(userId, jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.transactions || !Array.isArray(data.transactions)) {
        throw new Error('Invalid JSON ledger format');
      }

      const allTxs = this.getAllTransactions().filter(t => t.userId !== userId);
      const newTxs = data.transactions.map(t => ({ ...t, userId }));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([...allTxs, ...newTxs]));

      if (data.budgets && Array.isArray(data.budgets)) {
        const allBudgets = (JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || []).filter(b => b.userId !== userId);
        const newBudgets = data.budgets.map(b => ({ ...b, userId }));
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([...allBudgets, ...newBudgets]));
      }

      if (data.goals && Array.isArray(data.goals)) {
        const allGoals = (JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || []).filter(g => g.userId !== userId);
        const newGoals = data.goals.map(g => ({ ...g, userId }));
        localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify([...allGoals, ...newGoals]));
      }

      return true;
    } catch (e) {
      console.error('Import failure', e);
      return false;
    }
  },

  resetUserData(userId) {
    const allTxs = this.getAllTransactions().filter(t => t.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTxs));
    
    let allBudgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || [];
    allBudgets = allBudgets.filter(b => b.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(allBudgets));

    let allGoals = JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || [];
    allGoals = allGoals.filter(g => g.userId !== userId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(allGoals));
  },

  // ---------------- SEED WORKSPACE DEMO ACCOUNT ----------------
  seedDemoData() {
    const demoId = 'user_demo_aryan';
    const demoUser = {
      id: demoId,
      name: 'Aryan Sharma',
      email: 'aryan@workspace.dev',
      passwordHash: hashPassword('demo123'),
      currency: 'INR',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    };

    const users = this.getUsers().filter(u => u.id !== demoId);
    users.push(demoUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const now = new Date();
    const getDateStr = (daysAgo) => {
      const d = new Date(now.getTime() - daysAgo * 86400000);
      return d.toISOString().split('T')[0];
    };

    const demoTransactions = [
      {
        id: 'tx_1',
        userId: demoId,
        type: 'income',
        title: 'Monthly Engineering Retainer',
        amount: 85000,
        categoryId: 'salary',
        categoryName: 'Payroll & Retainer',
        iconKey: 'salary',
        date: getDateStr(1),
        paymentMethod: 'Bank Transfer',
        notes: 'Direct ACH Wire transfer',
        isRecurring: true
      },
      {
        id: 'tx_2',
        userId: demoId,
        type: 'income',
        title: 'Client Architecture Milestone',
        amount: 28000,
        categoryId: 'freelance',
        categoryName: 'Client Contracts',
        iconKey: 'freelance',
        date: getDateStr(4),
        paymentMethod: 'UPI',
        notes: 'Design tokens & dashboard delivery',
        isRecurring: false
      },
      {
        id: 'tx_3',
        userId: demoId,
        type: 'expense',
        title: 'Apartment Lease & Operations',
        amount: 22000,
        categoryId: 'housing',
        categoryName: 'Housing & Office',
        iconKey: 'housing',
        date: getDateStr(2),
        paymentMethod: 'Bank Transfer',
        notes: 'Monthly fixed lease commitment',
        isRecurring: true
      },
      {
        id: 'tx_4',
        userId: demoId,
        type: 'expense',
        title: 'Supermarket Provisions',
        amount: 6450,
        categoryId: 'groceries',
        categoryName: 'Groceries & Pantry',
        iconKey: 'groceries',
        date: getDateStr(3),
        paymentMethod: 'Credit Card',
        notes: 'Fresh produce & pantry restock',
        isRecurring: false
      },
      {
        id: 'tx_5',
        userId: demoId,
        type: 'expense',
        title: 'Bistro Lunch & Coffee',
        amount: 2150,
        categoryId: 'food',
        categoryName: 'Dining & Provisions',
        iconKey: 'food',
        date: getDateStr(5),
        paymentMethod: 'UPI',
        notes: 'Team working lunch',
        isRecurring: false
      },
      {
        id: 'tx_6',
        userId: demoId,
        type: 'expense',
        title: 'Fiber Internet & Power Grid',
        amount: 2850,
        categoryId: 'bills',
        categoryName: 'Utilities & Power',
        iconKey: 'bills',
        date: getDateStr(7),
        paymentMethod: 'UPI',
        notes: 'Gigabit fiber connection + electricity',
        isRecurring: true
      },
      {
        id: 'tx_7',
        userId: demoId,
        type: 'expense',
        title: 'Transit & Fuel Recharge',
        amount: 2400,
        categoryId: 'transport',
        categoryName: 'Transit & Logistics',
        iconKey: 'transport',
        date: getDateStr(9),
        paymentMethod: 'Debit Card',
        notes: 'Airport cab + fuel',
        isRecurring: false
      },
      {
        id: 'tx_8',
        userId: demoId,
        type: 'expense',
        title: 'Mechanical Keychron Keyboard',
        amount: 7999,
        categoryId: 'shopping',
        categoryName: 'Hardware & Supplies',
        iconKey: 'shopping',
        date: getDateStr(11),
        paymentMethod: 'Credit Card',
        notes: 'Tactile hot-swappable switches',
        isRecurring: false
      },
      {
        id: 'tx_9',
        userId: demoId,
        type: 'expense',
        title: 'GitHub Enterprise & Cloud Tier',
        amount: 1499,
        categoryId: 'entertainment',
        categoryName: 'Media & Subscriptions',
        iconKey: 'entertainment',
        date: getDateStr(14),
        paymentMethod: 'Credit Card',
        notes: 'Developer subscriptions bundle',
        isRecurring: true
      },
      {
        id: 'tx_10',
        userId: demoId,
        type: 'income',
        title: 'Index Fund Dividend Yield',
        amount: 4500,
        categoryId: 'investment',
        categoryName: 'Capital Yield & Divs',
        iconKey: 'investment',
        date: getDateStr(18),
        paymentMethod: 'Bank Transfer',
        notes: 'Quarterly payout',
        isRecurring: false
      },
      {
        id: 'tx_11',
        userId: demoId,
        type: 'expense',
        title: 'Health Assessment & Vitamins',
        amount: 1800,
        categoryId: 'health',
        categoryName: 'Health & Wellness',
        iconKey: 'health',
        date: getDateStr(22),
        paymentMethod: 'UPI',
        notes: 'Annual routine panel',
        isRecurring: false
      }
    ];

    // Prior months data
    const priorMonthTxs = [
      {
        id: 'tx_prv_1',
        userId: demoId,
        type: 'income',
        title: 'Previous Month Payroll',
        amount: 85000,
        categoryId: 'salary',
        categoryName: 'Payroll & Retainer',
        iconKey: 'salary',
        date: getDateStr(32),
        paymentMethod: 'Bank Transfer',
        notes: '',
        isRecurring: true
      },
      {
        id: 'tx_prv_2',
        userId: demoId,
        type: 'expense',
        title: 'Apartment Lease',
        amount: 22000,
        categoryId: 'housing',
        categoryName: 'Housing & Office',
        iconKey: 'housing',
        date: getDateStr(33),
        paymentMethod: 'Bank Transfer',
        notes: '',
        isRecurring: true
      },
      {
        id: 'tx_prv_3',
        userId: demoId,
        type: 'expense',
        title: 'Groceries Restock',
        amount: 8700,
        categoryId: 'groceries',
        categoryName: 'Groceries & Pantry',
        iconKey: 'groceries',
        date: getDateStr(38),
        paymentMethod: 'Credit Card',
        notes: '',
        isRecurring: false
      },
      {
        id: 'tx_prv_4',
        userId: demoId,
        type: 'income',
        title: 'Freelance Frontend Audit',
        amount: 15000,
        categoryId: 'freelance',
        categoryName: 'Client Contracts',
        iconKey: 'freelance',
        date: getDateStr(45),
        paymentMethod: 'UPI',
        notes: '',
        isRecurring: false
      },
      {
        id: 'tx_prv_5',
        userId: demoId,
        type: 'expense',
        title: 'Team Dinner',
        amount: 4200,
        categoryId: 'food',
        categoryName: 'Dining & Provisions',
        iconKey: 'food',
        date: getDateStr(50),
        paymentMethod: 'UPI',
        notes: '',
        isRecurring: false
      }
    ];

    const currentTxs = this.getAllTransactions().filter(t => t.userId !== demoId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([...currentTxs, ...demoTransactions, ...priorMonthTxs]));

    const demoBudgets = [
      { id: 'b_1', userId: demoId, categoryId: 'housing', monthlyLimit: 25000 },
      { id: 'b_2', userId: demoId, categoryId: 'food', monthlyLimit: 6000 },
      { id: 'b_3', userId: demoId, categoryId: 'groceries', monthlyLimit: 8000 },
      { id: 'b_4', userId: demoId, categoryId: 'shopping', monthlyLimit: 10000 },
      { id: 'b_5', userId: demoId, categoryId: 'bills', monthlyLimit: 4000 }
    ];
    const otherBudgets = (JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)) || []).filter(b => b.userId !== demoId);
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([...otherBudgets, ...demoBudgets]));

    const demoGoals = [
      {
        id: 'g_1',
        userId: demoId,
        title: 'MacBook Pro Hardware Upgrade',
        targetAmount: 180000,
        currentAmount: 125000,
        deadline: '2026-12-31'
      },
      {
        id: 'g_2',
        userId: demoId,
        title: '6-Month Liquid Reserve',
        targetAmount: 200000,
        currentAmount: 160000,
        deadline: '2027-03-31'
      },
      {
        id: 'g_3',
        userId: demoId,
        title: 'Annual Travel & Tech Conference',
        targetAmount: 120000,
        currentAmount: 52000,
        deadline: '2026-11-15'
      }
    ];
    const otherGoals = (JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || []).filter(g => g.userId !== demoId);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify([...otherGoals, ...demoGoals]));
  }
};
