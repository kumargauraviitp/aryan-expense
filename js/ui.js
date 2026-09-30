/**
 * Technical UI Rendering & DOM Management
 * Clean SVG icons, monospaced figures and high-density tables
 */
import { CURRENCIES, DEFAULT_CATEGORIES, SVG_ICONS } from './storage.js';
import { ChartEngine } from './charts.js';

export const UI = {
  getCurrencySymbol(currencyCode = 'INR') {
    return CURRENCIES[currencyCode]?.symbol || '₹';
  },

  formatAmount(amount, currencyCode = 'INR') {
    const symbol = this.getCurrencySymbol(currencyCode);
    const num = Number(amount) || 0;
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  },

  getCategoryIconSvg(iconKey) {
    return SVG_ICONS[iconKey] || SVG_ICONS.other;
  },

  // ---------------- MINIMALIST SONNER-STYLE TOASTS ----------------
  showToast(message, type = 'success', undoCallback = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-icon">${iconSvg}</div>
        <span>${message}</span>
      </div>
      ${undoCallback ? `<button class="toast-undo-btn" id="toast-undo-btn">Undo</button>` : ''}
    `;

    container.appendChild(toast);

    let undoClicked = false;
    if (undoCallback) {
      const undoBtn = toast.querySelector('#toast-undo-btn');
      undoBtn.addEventListener('click', () => {
        undoClicked = true;
        undoCallback();
        this.dismissToast(toast);
      });
    }

    setTimeout(() => {
      if (!undoClicked) {
        this.dismissToast(toast);
      }
    }, 4000);
  },

  dismissToast(toast) {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      toast.remove();
    }, 200);
  },

  // ---------------- METRICS ENGINE ----------------
  computeMetrics(transactions) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let totalBalance = 0;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    let lastMonthExpense = 0;

    const categoryBreakdown = {};

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const amount = Number(tx.amount) || 0;

      if (tx.type === 'income') {
        totalBalance += amount;
      } else {
        totalBalance -= amount;
      }

      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        if (tx.type === 'income') {
          thisMonthIncome += amount;
        } else {
          thisMonthExpense += amount;

          const catName = tx.categoryName || 'Other';
          if (!categoryBreakdown[catName]) {
            categoryBreakdown[catName] = {
              total: 0,
              iconKey: tx.iconKey || 'other',
              color: this.getCategoryColor(tx.categoryId)
            };
          }
          categoryBreakdown[catName].total += amount;
        }
      }

      if (txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear) {
        if (tx.type === 'expense') {
          lastMonthExpense += amount;
        }
      }
    });

    const netSavings = thisMonthIncome - thisMonthExpense;
    const savingsRate = thisMonthIncome > 0 ? Math.max(0, (netSavings / thisMonthIncome) * 100) : 0;

    let expenseGrowth = 0;
    if (lastMonthExpense > 0) {
      expenseGrowth = ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
    }

    return {
      totalBalance,
      thisMonthIncome,
      thisMonthExpense,
      netSavings,
      savingsRate,
      expenseGrowth,
      categoryBreakdown
    };
  },

  getCategoryColor(catId) {
    const all = [...DEFAULT_CATEGORIES.expense, ...DEFAULT_CATEGORIES.income];
    const found = all.find(c => c.id === catId);
    return found ? found.color : '#71717a';
  },

  // ---------------- RENDER DASHBOARD ----------------
  renderDashboard(user, transactions, budgets) {
    const currency = user.currency || 'INR';
    const symbol = this.getCurrencySymbol(currency);
    const metrics = this.computeMetrics(transactions);

    const elBalance = document.getElementById('kpi-balance-val');
    const elIncome = document.getElementById('kpi-income-val');
    const elExpense = document.getElementById('kpi-expense-val');
    const elSavings = document.getElementById('kpi-savings-val');
    const elSavingsDesc = document.getElementById('kpi-savings-desc');
    const elExpenseTrend = document.getElementById('kpi-expense-trend');

    if (elBalance) elBalance.textContent = this.formatAmount(metrics.totalBalance, currency);
    if (elIncome) elIncome.textContent = `+${this.formatAmount(metrics.thisMonthIncome, currency)}`;
    if (elExpense) elExpense.textContent = `-${this.formatAmount(metrics.thisMonthExpense, currency)}`;
    if (elSavings) elSavings.textContent = `${metrics.savingsRate.toFixed(1)}%`;
    if (elSavingsDesc) {
      elSavingsDesc.textContent = `${metrics.netSavings >= 0 ? '+' : ''}${this.formatAmount(metrics.netSavings, currency)} net capital delta`;
    }

    if (elExpenseTrend) {
      if (metrics.expenseGrowth > 0) {
        elExpenseTrend.className = 'trend-pill trend-down';
        elExpenseTrend.textContent = `+${metrics.expenseGrowth.toFixed(1)}% MoM`;
      } else if (metrics.expenseGrowth < 0) {
        elExpenseTrend.className = 'trend-pill trend-up';
        elExpenseTrend.textContent = `${metrics.expenseGrowth.toFixed(1)}% MoM`;
      } else {
        elExpenseTrend.className = 'trend-pill';
        elExpenseTrend.textContent = `Flat vs last cycle`;
      }
    }

    ChartEngine.renderCategoryBreakdown('categoryDoughnutChart', metrics.categoryBreakdown, symbol);

    const monthlyCashflow = this.computeMonthlyCashflow(transactions);
    ChartEngine.renderCashflowComparison('cashflowBarChart', monthlyCashflow, symbol);

    this.renderRecentTransactions(transactions.slice(0, 6), currency);
    this.renderBudgetsSnapshot(budgets, transactions, currency);
  },

  computeMonthlyCashflow(transactions) {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

      let income = 0;
      let expense = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === mIdx && txDate.getFullYear() === yr) {
          if (tx.type === 'income') income += Number(tx.amount);
          if (tx.type === 'expense') expense += Number(tx.amount);
        }
      });

      months.push({ monthLabel: label, income, expense });
    }
    return months;
  },

  renderRecentTransactions(recentTxs, currency) {
    const tbody = document.getElementById('recent-transactions-tbody');
    const emptyState = document.getElementById('recent-transactions-empty');
    if (!tbody) return;

    if (!recentTxs || recentTxs.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = recentTxs.map(tx => {
      const isIncome = tx.type === 'income';
      const formattedAmount = `${isIncome ? '+' : '-'}${this.formatAmount(tx.amount, currency)}`;
      const iconSvg = this.getCategoryIconSvg(tx.iconKey || tx.categoryId);

      return `
        <tr class="tx-row" data-id="${tx.id}">
          <td>
            <div class="tx-item-title">
              <div class="tx-category-icon">${iconSvg}</div>
              <div class="tx-info">
                <span class="tx-name">${this.escapeHTML(tx.title)}</span>
                <span class="tx-date-sub">${this.formatDate(tx.date)} • ${this.escapeHTML(tx.paymentMethod || 'Wire')}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${this.escapeHTML(tx.categoryName || tx.categoryId)}</span>
          </td>
          <td class="tx-amount ${isIncome ? 'income' : 'expense'}">
            ${formattedAmount}
          </td>
        </tr>
      `;
    }).join('');
  },

  renderBudgetsSnapshot(budgets, transactions, currency) {
    const container = document.getElementById('dashboard-budgets-list');
    if (!container) return;

    if (!budgets || budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0;">
          <p style="font-size: 0.78rem;">No spending caps defined for current ledger.</p>
          <button class="btn btn-secondary btn-sm" id="btn-quick-create-budget">+ Set Threshold</button>
        </div>
      `;
      return;
    }

    const now = new Date();
    const curMonth = now.getMonth();
    const curYr = now.getFullYear();

    container.innerHTML = budgets.map(b => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === curMonth && d.getFullYear() === curYr;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const percent = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
      let progressClass = 'progress-safe';
      if (percent >= 90) progressClass = 'progress-danger';
      else if (percent >= 70) progressClass = 'progress-warning';

      const catObj = DEFAULT_CATEGORIES.expense.find(c => c.id === b.categoryId) || { name: b.categoryId, iconKey: 'other' };
      const iconSvg = this.getCategoryIconSvg(catObj.iconKey);

      return `
        <div class="budget-item">
          <div class="budget-item-header">
            <span class="budget-cat-name">${iconSvg} ${catObj.name}</span>
            <span class="budget-amounts">${this.formatAmount(spent, currency)} / ${this.formatAmount(b.monthlyLimit, currency)} [${percent}%]</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${progressClass}" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ---------------- FULL TRANSACTIONS TABLE ----------------
  renderTransactionsTable(transactions, currency) {
    const tbody = document.getElementById('all-transactions-tbody');
    const emptyState = document.getElementById('all-transactions-empty');
    const countBadge = document.getElementById('tx-results-count');
    if (!tbody) return;

    if (countBadge) {
      countBadge.textContent = `${transactions.length} record${transactions.length === 1 ? '' : 's'}`;
    }

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = transactions.map(tx => {
      const isIncome = tx.type === 'income';
      const formattedAmount = `${isIncome ? '+' : '-'}${this.formatAmount(tx.amount, currency)}`;
      const iconSvg = this.getCategoryIconSvg(tx.iconKey || tx.categoryId);

      return `
        <tr class="tx-row" data-id="${tx.id}">
          <td>
            <div class="tx-item-title">
              <div class="tx-category-icon">${iconSvg}</div>
              <div class="tx-info">
                <span class="tx-name">${this.escapeHTML(tx.title)}</span>
                <span class="tx-date-sub">${this.escapeHTML(tx.notes ? tx.notes : tx.paymentMethod || 'Direct')}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${this.escapeHTML(tx.categoryName || tx.categoryId)}</span>
          </td>
          <td>
            <span style="color: var(--text-muted); font-size: 0.78rem; font-family: var(--font-mono);">${this.formatDate(tx.date)}</span>
          </td>
          <td>
            <span class="badge badge-neutral">${this.escapeHTML(tx.paymentMethod || 'Direct')}</span>
          </td>
          <td class="tx-amount ${isIncome ? 'income' : 'expense'}">
            ${formattedAmount}
          </td>
          <td>
            <div class="tx-actions">
              <button class="btn-action-icon edit-tx-btn" data-id="${tx.id}" title="Edit entry">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-action-icon delete delete-tx-btn" data-id="${tx.id}" title="Remove entry">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ---------------- BUDGETS VIEW ----------------
  renderBudgetsView(budgets, transactions, currency) {
    const container = document.getElementById('full-budgets-grid');
    if (!container) return;

    const now = new Date();
    const curMonth = now.getMonth();
    const curYr = now.getFullYear();

    if (!budgets || budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state glass-panel" style="grid-column: 1 / -1; padding: 2.5rem;">
          <div class="empty-state-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          </div>
          <h4>No Spending Thresholds Defined</h4>
          <p>Establish monthly maximum thresholds across operational categories.</p>
          <button class="btn btn-secondary btn-sm" id="btn-open-new-budget-modal" style="margin-top: 0.75rem;">+ Set Threshold</button>
        </div>
      `;
      return;
    }

    container.innerHTML = budgets.map(b => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === curMonth && d.getFullYear() === curYr;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const percent = Math.min(100, Math.round((spent / b.monthlyLimit) * 100));
      const remaining = Math.max(0, b.monthlyLimit - spent);
      const isOverBudget = spent > b.monthlyLimit;

      let statusColor = 'var(--income)';
      let progressClass = 'progress-safe';
      if (percent >= 90) {
        statusColor = 'var(--expense)';
        progressClass = 'progress-danger';
      } else if (percent >= 70) {
        statusColor = 'var(--warning)';
        progressClass = 'progress-warning';
      }

      const catObj = DEFAULT_CATEGORIES.expense.find(c => c.id === b.categoryId) || { name: b.categoryId, iconKey: 'other' };
      const iconSvg = this.getCategoryIconSvg(catObj.iconKey);

      return `
        <div class="glass-panel" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div class="tx-category-icon">${iconSvg}</div>
              <div>
                <h4 style="font-size: 0.88rem; font-weight: 600;">${catObj.name}</h4>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">Cap: ${this.formatAmount(b.monthlyLimit, currency)}</span>
              </div>
            </div>
            <span class="badge" style="background: var(--bg-surface-elevated); color: ${statusColor}; border: 1px solid var(--border-medium);">
              ${percent}% utilized
            </span>
          </div>

          <div class="progress-track" style="height: 6px;">
            <div class="progress-fill ${progressClass}" style="width: ${percent}%;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted); font-family: var(--font-mono);">
            <span>Outflow: <strong style="color: var(--text-primary);">${this.formatAmount(spent, currency)}</strong></span>
            <span>${isOverBudget ? `<span style="color: var(--expense); font-weight: 600;">Over by ${this.formatAmount(spent - b.monthlyLimit, currency)}</span>` : `Headroom: ${this.formatAmount(remaining, currency)}`}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // ---------------- SAVINGS GOALS VIEW ----------------
  renderGoalsView(goals, currency) {
    const container = document.getElementById('full-goals-grid');
    if (!container) return;

    if (!goals || goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state glass-panel" style="grid-column: 1 / -1; padding: 2.5rem;">
          <div class="empty-state-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6Z"/></svg>
          </div>
          <h4>No Capital Reserve Goals Defined</h4>
          <p>Track hardware refreshes, infrastructure reserves, or tax buffers.</p>
          <button class="btn btn-secondary btn-sm" id="btn-open-new-goal-modal" style="margin-top: 0.75rem;">+ Define Goal</button>
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const percent = Math.min(100, Math.round(((Number(g.currentAmount) || 0) / Number(g.targetAmount)) * 100));

      return `
        <div class="goal-card">
          <div class="goal-header">
            <div>
              <h4 class="goal-title">${this.escapeHTML(g.title)}</h4>
              <span class="goal-target">Target: ${this.formatAmount(g.targetAmount, currency)}</span>
            </div>
            <button class="btn-action-icon delete delete-goal-btn" data-id="${g.id}" title="Remove target">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.75rem; font-family: var(--font-mono);">
              <span style="color: var(--income); font-weight: 600;">${this.formatAmount(g.currentAmount, currency)}</span>
              <span style="color: var(--text-muted);">${percent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill progress-safe" style="width: ${percent}%;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.65rem; border-top: 1px solid var(--border-subtle);">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${g.deadline ? `Target: ${this.formatDate(g.deadline)}` : 'Indefinite'}</span>
            <button class="btn btn-secondary btn-sm add-funds-btn" data-id="${g.id}">+ Allocate Funds</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ---------------- ANALYTICS VIEW ----------------
  renderAnalyticsView(transactions, currency) {
    const symbol = this.getCurrencySymbol(currency);
    const metrics = this.computeMetrics(transactions);

    const elTotalSpent = document.getElementById('analytics-total-spent');
    const elAvgTx = document.getElementById('analytics-avg-tx');
    const elTopCat = document.getElementById('analytics-top-cat');

    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExp = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const avgExpense = expenses.length > 0 ? totalExp / expenses.length : 0;

    let topCategory = 'N/A';
    let maxSpent = 0;
    Object.entries(metrics.categoryBreakdown).forEach(([name, data]) => {
      if (data.total > maxSpent) {
        maxSpent = data.total;
        topCategory = `${name} (${symbol}${maxSpent.toLocaleString()})`;
      }
    });

    if (elTotalSpent) elTotalSpent.textContent = this.formatAmount(totalExp, currency);
    if (elAvgTx) elAvgTx.textContent = this.formatAmount(avgExpense, currency);
    if (elTopCat) elTopCat.textContent = topCategory;

    ChartEngine.renderCategoryBreakdown('analyticsCategoryChart', metrics.categoryBreakdown, symbol);
    const monthlyCashflow = this.computeMonthlyCashflow(transactions);
    ChartEngine.renderCashflowComparison('analyticsCashflowChart', monthlyCashflow, symbol);
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
