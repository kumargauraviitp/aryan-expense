/**
 * Supabase Service Integration Layer
 * Provides cloud authentication, real-time database queries, and automatic local-sync fallback.
 */
import { Config } from './config.js';
import { StorageService } from './storage.js';

let supabaseClient = null;

export const SupabaseService = {
  getClient() {
    if (supabaseClient) return supabaseClient;

    if (!Config.isSupabaseConfigured()) {
      return null;
    }

    if (!window.supabase) {
      console.warn('[Supabase] Supabase JS library not loaded on window.');
      return null;
    }

    try {
      const url = Config.getSupabaseUrl();
      const key = Config.getSupabaseAnonKey();
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return supabaseClient;
    } catch (err) {
      console.error('[Supabase] Error initializing client:', err);
      return null;
    }
  },

  resetClient() {
    supabaseClient = null;
  },

  isValidUUID(str) {
    if (!str || typeof str !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  },

  async resolveUserId(providedId) {
    if (this.isValidUUID(providedId)) return providedId;
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user?.id && this.isValidUUID(session.user.id)) {
        return session.user.id;
      }
    } catch {
      // ignore
    }
    return null;
  },

  async testConnection() {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase credentials not configured or incomplete.' };
    }

    try {
      // Simple health ping to auth service
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return { success: true, message: 'Connected to Supabase cloud successfully!' };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to connect to Supabase.' };
    }
  },

  // ---------------- AUTHENTICATION ----------------
  async signUp(email, password, name, currency = 'INR', openingBalance = 0) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          currency,
          opening_balance: Number(openingBalance) || 0
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = this.getClient();
    if (!client) return;
    await client.auth.signOut();
  },

  async resetPassword(email) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');
    const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (!client) return null;
    return client.auth.onAuthStateChange(callback);
  },

  async getCurrentSession() {
    const client = this.getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  },

  // ---------------- USER PROFILES ----------------
  async getProfile(userId) {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Profile fetch error:', error);
      return null;
    }
    return data;
  },

  async upsertProfile(profile) {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        currency: profile.currency || 'INR',
        opening_balance: Number(profile.opening_balance || profile.openingBalance || 0),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Profile upsert error:', error);
      throw error;
    }
    return data;
  },

  // ---------------- TRANSACTIONS ----------------
  async getTransactions(userId) {
    const client = this.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching transactions:', error);
      return [];
    }

    // Map database snake_case to app camelCase
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      amount: Number(row.amount),
      type: row.type,
      categoryId: row.category_id,
      categoryName: row.category_name,
      iconKey: row.icon_key,
      date: row.date,
      paymentMethod: row.payment_method,
      notes: row.notes,
      isRecurring: Boolean(row.is_recurring),
      createdAt: row.created_at
    }));
  },

  async saveTransaction(tx) {
    const client = this.getClient();
    if (!client) return null;

    const validUserId = await this.resolveUserId(tx.userId);
    if (!validUserId) {
      console.warn('[Supabase] Skipping transaction save: user is not authenticated in Supabase.');
      return null;
    }

    const row = {
      id: tx.id,
      user_id: validUserId,
      title: tx.title,
      amount: Number(tx.amount),
      type: tx.type,
      category_id: tx.categoryId,
      category_name: tx.categoryName,
      icon_key: tx.iconKey || 'other',
      date: tx.date,
      payment_method: tx.paymentMethod || 'UPI',
      notes: tx.notes || '',
      is_recurring: Boolean(tx.isRecurring)
    };

    const { data, error } = await client
      .from('transactions')
      .upsert(row, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error saving transaction:', error);
      throw error;
    }
    return data;
  },

  async deleteTransaction(txId) {
    const client = this.getClient();
    if (!client) return;

    const { error } = await client
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (error) {
      console.error('[Supabase] Error deleting transaction:', error);
      throw error;
    }
  },

  // ---------------- BUDGETS ----------------
  async getBudgets(userId) {
    const client = this.getClient();
    if (!client) return [];

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) return [];

    const { data, error } = await client
      .from('budgets')
      .select('*')
      .eq('user_id', validUserId);

    if (error) {
      console.error('[Supabase] Error fetching budgets:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      monthlyLimit: Number(row.monthly_limit),
      createdAt: row.created_at
    }));
  },

  async saveBudget(b) {
    const client = this.getClient();
    if (!client) return null;

    const validUserId = await this.resolveUserId(b.userId);
    if (!validUserId) {
      console.warn('[Supabase] Skipping budget save: user is not authenticated in Supabase.');
      return null;
    }

    const row = {
      id: b.id.includes(validUserId.slice(0, 8)) ? b.id : `b_${validUserId.slice(0, 8)}_${b.categoryId}`,
      user_id: validUserId,
      category_id: b.categoryId,
      monthly_limit: Number(b.monthlyLimit),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('budgets')
      .upsert(row, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error saving budget:', error);
      throw error;
    }
    return data;
  },

  async deleteBudget(budgetId) {
    const client = this.getClient();
    if (!client) return;

    const { error } = await client
      .from('budgets')
      .delete()
      .eq('id', budgetId);

    if (error) {
      console.error('[Supabase] Error deleting budget:', error);
      throw error;
    }
  },

  // ---------------- GOALS ----------------
  async getGoals(userId) {
    const client = this.getClient();
    if (!client) return [];

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) return [];

    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', validUserId);

    if (error) {
      console.error('[Supabase] Error fetching goals:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
      deadline: row.deadline,
      createdAt: row.created_at
    }));
  },

  async saveGoal(g) {
    const client = this.getClient();
    if (!client) return null;

    const validUserId = await this.resolveUserId(g.userId);
    if (!validUserId) {
      console.warn('[Supabase] Skipping goal save: user is not authenticated in Supabase.');
      return null;
    }

    const row = {
      id: g.id,
      user_id: validUserId,
      title: g.title,
      target_amount: Number(g.targetAmount),
      current_amount: Number(g.currentAmount || 0),
      deadline: g.deadline || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('goals')
      .upsert(row, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error saving goal:', error);
      throw error;
    }
    return data;
  },

  async deleteGoal(goalId) {
    const client = this.getClient();
    if (!client) return;

    const { error } = await client
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('[Supabase] Error deleting goal:', error);
      throw error;
    }
  },

  // ---------------- GOAL DEPOSITS ----------------
  async getGoalDeposits(userId, goalId = null) {
    const client = this.getClient();
    if (!client) return [];

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) return [];

    try {
      let query = client
        .from('goal_deposits')
        .select('*')
        .eq('user_id', validUserId)
        .order('date', { ascending: false });

      if (goalId) {
        query = query.eq('goal_id', goalId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[Supabase] Goal deposits fetch notice:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        goalId: row.goal_id,
        userId: row.user_id,
        amount: Number(row.amount),
        date: row.date,
        notes: row.notes,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.warn('[Supabase] getGoalDeposits warning:', err);
      return [];
    }
  },

  async addGoalDeposit(dep) {
    const client = this.getClient();
    if (!client) return null;

    const validUserId = await this.resolveUserId(dep.userId);
    if (!validUserId) {
      console.warn('[Supabase] Skipping goal deposit save: user is not authenticated in Supabase.');
      return null;
    }

    const row = {
      id: dep.id || `dep_${Date.now()}`,
      goal_id: dep.goalId,
      user_id: validUserId,
      amount: Number(dep.amount),
      date: dep.date || new Date().toISOString().split('T')[0],
      notes: dep.notes || ''
    };

    try {
      const { data, error } = await client
        .from('goal_deposits')
        .upsert(row, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Update current_amount in goals
      const { data: currentGoal } = await client
        .from('goals')
        .select('current_amount')
        .eq('id', dep.goalId)
        .maybeSingle();

      if (currentGoal) {
        const newTotal = Number(currentGoal.current_amount || 0) + Number(dep.amount);
        await client
          .from('goals')
          .update({ current_amount: newTotal, updated_at: new Date().toISOString() })
          .eq('id', dep.goalId);
      }

      return data;
    } catch (err) {
      console.warn('[Supabase] addGoalDeposit warning:', err);
      return null;
    }
  },

  // ---------------- CATEGORIES ----------------
  async getCategories(userId) {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${userId}`);

      if (error) {
        console.warn('[Supabase] Categories fetch notice:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        type: row.type,
        iconKey: row.icon_key,
        color: row.color,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.warn('[Supabase] getCategories warning:', err);
      return [];
    }
  },

  async saveCategory(cat) {
    const client = this.getClient();
    if (!client) return null;

    const row = {
      id: cat.id,
      user_id: cat.userId || null,
      name: cat.name,
      type: cat.type,
      icon_key: cat.iconKey || 'other',
      color: cat.color || '#6366f1'
    };

    try {
      const { data, error } = await client
        .from('categories')
        .upsert(row)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] saveCategory warning:', err);
      return null;
    }
  },

  async deleteCategory(catId) {
    const client = this.getClient();
    if (!client) return;

    try {
      await client
        .from('categories')
        .delete()
        .eq('id', catId);
    } catch (err) {
      console.warn('[Supabase] deleteCategory warning:', err);
    }
  },

  // ---------------- USER SETTINGS ----------------
  async getSettings(userId) {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        userId: data.user_id,
        theme: data.theme || 'dark',
        currency: data.currency || 'INR',
        compactView: Boolean(data.compact_view),
        defaultPeriod: data.default_period || 'this_month',
        telemetryEnabled: Boolean(data.telemetry_enabled)
      };
    } catch (err) {
      console.warn('[Supabase] getSettings warning:', err);
      return null;
    }
  },

  async saveSettings(userId, settings) {
    const client = this.getClient();
    if (!client) return null;

    const row = {
      user_id: userId,
      theme: settings.theme,
      currency: settings.currency,
      compact_view: settings.compactView,
      default_period: settings.defaultPeriod,
      telemetry_enabled: settings.telemetryEnabled,
      updated_at: new Date().toISOString()
    };

    Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);

    try {
      const { data, error } = await client
        .from('user_settings')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] saveSettings warning:', err);
      return null;
    }
  },

  // ---------------- ACTIVITY LOGS ----------------
  async logActivity(userId, action, entityType, entityId = null, details = {}) {
    const client = this.getClient();
    if (!client) return null;

    const row = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    };

    try {
      const { data, error } = await client
        .from('activity_logs')
        .insert(row)
        .select()
        .single();
      return data;
    } catch (err) {
      console.warn('[Supabase] Activity log warning:', err);
      return null;
    }
  },

  async getActivityLogs(userId) {
    const client = this.getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return [];
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getActivityLogs warning:', err);
      return [];
    }
  },

  // ---------------- STARTER DATA SEEDER (DIRECT TO SUPABASE) ----------------
  async seedUserStarterData(userId) {
    const client = this.getClient();
    if (!client || !userId) return false;

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) return false;

    try {
      const shortId = validUserId.slice(0, 8);
      const getDateStr = (daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      // 1. Transactions (16 rich ledger transactions)
      const txRows = [
        { id: `tx_1_${shortId}`, user_id: validUserId, title: 'Monthly Engineering Retainer', amount: 85000, type: 'income', category_id: 'salary', category_name: 'Payroll & Retainer', icon_key: 'salary', date: getDateStr(1), payment_method: 'Bank Transfer', notes: 'Direct ACH Wire transfer', is_recurring: true },
        { id: `tx_2_${shortId}`, user_id: validUserId, title: 'Client Architecture Milestone', amount: 28000, type: 'income', category_id: 'freelance', category_name: 'Client Contracts', icon_key: 'freelance', date: getDateStr(4), payment_method: 'UPI', notes: 'Design tokens & dashboard delivery', is_recurring: false },
        { id: `tx_3_${shortId}`, user_id: validUserId, title: 'Apartment Lease & Operations', amount: 22000, type: 'expense', category_id: 'housing', category_name: 'Housing & Office', icon_key: 'housing', date: getDateStr(2), payment_method: 'Bank Transfer', notes: 'Monthly fixed lease commitment', is_recurring: true },
        { id: `tx_4_${shortId}`, user_id: validUserId, title: 'Supermarket Provisions', amount: 6450, type: 'expense', category_id: 'groceries', category_name: 'Groceries & Pantry', icon_key: 'groceries', date: getDateStr(3), payment_method: 'Credit Card', notes: 'Fresh produce & pantry restock', is_recurring: false },
        { id: `tx_5_${shortId}`, user_id: validUserId, title: 'Bistro Lunch & Coffee', amount: 2150, type: 'expense', category_id: 'food', category_name: 'Dining & Provisions', icon_key: 'food', date: getDateStr(5), payment_method: 'UPI', notes: 'Team working lunch', is_recurring: false },
        { id: `tx_6_${shortId}`, user_id: validUserId, title: 'Fiber Internet & Power Grid', amount: 2850, type: 'expense', category_id: 'bills', category_name: 'Utilities & Power', icon_key: 'bills', date: getDateStr(7), payment_method: 'UPI', notes: 'Gigabit fiber connection + electricity', is_recurring: true },
        { id: `tx_7_${shortId}`, user_id: validUserId, title: 'Transit & Fuel Recharge', amount: 2400, type: 'expense', category_id: 'transport', category_name: 'Transit & Logistics', icon_key: 'transport', date: getDateStr(9), payment_method: 'Debit Card', notes: 'Airport cab + fuel', is_recurring: false },
        { id: `tx_8_${shortId}`, user_id: validUserId, title: 'Mechanical Keychron Keyboard', amount: 7999, type: 'expense', category_id: 'shopping', category_name: 'Hardware & Supplies', icon_key: 'shopping', date: getDateStr(11), payment_method: 'Credit Card', notes: 'Tactile hot-swappable switches', is_recurring: false },
        { id: `tx_9_${shortId}`, user_id: validUserId, title: 'GitHub Enterprise & Cloud Tier', amount: 1499, type: 'expense', category_id: 'entertainment', category_name: 'Media & Subscriptions', icon_key: 'entertainment', date: getDateStr(14), payment_method: 'Credit Card', notes: 'Developer subscriptions bundle', is_recurring: true },
        { id: `tx_10_${shortId}`, user_id: validUserId, title: 'Index Fund Dividend Yield', amount: 4500, type: 'income', category_id: 'investment', category_name: 'Capital Yield & Divs', icon_key: 'investment', date: getDateStr(18), payment_method: 'Bank Transfer', notes: 'Quarterly payout', is_recurring: false },
        { id: `tx_11_${shortId}`, user_id: validUserId, title: 'Health Assessment & Vitamins', amount: 1800, type: 'expense', category_id: 'health', category_name: 'Health & Wellness', icon_key: 'health', date: getDateStr(22), payment_method: 'UPI', notes: 'Annual routine panel', is_recurring: false },
        { id: `tx_prv_1_${shortId}`, user_id: validUserId, title: 'Previous Month Payroll', amount: 85000, type: 'income', category_id: 'salary', category_name: 'Payroll & Retainer', icon_key: 'salary', date: getDateStr(32), payment_method: 'Bank Transfer', notes: 'Recurring direct deposit', is_recurring: true },
        { id: `tx_prv_2_${shortId}`, user_id: validUserId, title: 'Apartment Lease', amount: 22000, type: 'expense', category_id: 'housing', category_name: 'Housing & Office', icon_key: 'housing', date: getDateStr(33), payment_method: 'Bank Transfer', notes: 'Automated monthly debit', is_recurring: true },
        { id: `tx_prv_3_${shortId}`, user_id: validUserId, title: 'Groceries Restock', amount: 8700, type: 'expense', category_id: 'groceries', category_name: 'Groceries & Pantry', icon_key: 'groceries', date: getDateStr(38), payment_method: 'Credit Card', notes: 'Bulk essentials & supplies', is_recurring: false },
        { id: `tx_prv_4_${shortId}`, user_id: validUserId, title: 'Freelance Frontend Audit', amount: 15000, type: 'income', category_id: 'freelance', category_name: 'Client Contracts', icon_key: 'freelance', date: getDateStr(45), payment_method: 'UPI', notes: 'React component performance audit', is_recurring: false },
        { id: `tx_prv_5_${shortId}`, user_id: validUserId, title: 'Team Dinner', amount: 4200, type: 'expense', category_id: 'food', category_name: 'Dining & Provisions', icon_key: 'food', date: getDateStr(50), payment_method: 'UPI', notes: 'Quarterly milestone celebration', is_recurring: false }
      ];

      // 2. Budgets (5 budgets)
      const budgetRows = [
        { id: `b_${shortId}_housing`, user_id: validUserId, category_id: 'housing', monthly_limit: 25000 },
        { id: `b_${shortId}_food`, user_id: validUserId, category_id: 'food', monthly_limit: 6000 },
        { id: `b_${shortId}_groceries`, user_id: validUserId, category_id: 'groceries', monthly_limit: 8000 },
        { id: `b_${shortId}_shopping`, user_id: validUserId, category_id: 'shopping', monthly_limit: 10000 },
        { id: `b_${shortId}_bills`, user_id: validUserId, category_id: 'bills', monthly_limit: 4000 }
      ];

      // 3. Goals (3 goals)
      const goalRows = [
        { id: `g_1_${shortId}`, user_id: validUserId, title: 'MacBook Pro Hardware Upgrade', target_amount: 180000, current_amount: 125000, deadline: '2026-12-31' },
        { id: `g_2_${shortId}`, user_id: validUserId, title: '6-Month Liquid Reserve', target_amount: 200000, current_amount: 160000, deadline: '2027-03-31' },
        { id: `g_3_${shortId}`, user_id: validUserId, title: 'Annual Travel & Tech Conference', target_amount: 120000, current_amount: 52000, deadline: '2026-11-15' }
      ];

      // 4. Goal Deposits (5 deposits)
      const depositRows = [
        { id: `dep_1_${shortId}`, goal_id: `g_1_${shortId}`, user_id: validUserId, amount: 75000, date: getDateStr(60), notes: 'Initial hardware budget allocation' },
        { id: `dep_2_${shortId}`, goal_id: `g_1_${shortId}`, user_id: validUserId, amount: 50000, date: getDateStr(15), notes: 'Q3 consulting milestone proceeds' },
        { id: `dep_3_${shortId}`, goal_id: `g_2_${shortId}`, user_id: validUserId, amount: 100000, date: getDateStr(75), notes: 'Fixed deposit liquidation allocation' },
        { id: `dep_4_${shortId}`, goal_id: `g_2_${shortId}`, user_id: validUserId, amount: 60000, date: getDateStr(20), notes: 'Monthly emergency reserve transfer' },
        { id: `dep_5_${shortId}`, goal_id: `g_3_${shortId}`, user_id: validUserId, amount: 52000, date: getDateStr(30), notes: 'Conference pass & ticket allocation' }
      ];

      // 5. Settings
      const settingsRow = {
        user_id: validUserId,
        theme: 'dark',
        currency: 'INR',
        compact_view: false,
        default_period: 'this_month',
        telemetry_enabled: true
      };

      // 6. Activity Logs
      const logRows = [
        { id: `act_1_${shortId}`, user_id: validUserId, action: 'USER_SIGNIN', entity_type: 'auth', entity_id: 'user_session', details: { source: 'web', method: 'supabase_auth' } },
        { id: `act_2_${shortId}`, user_id: validUserId, action: 'RECORD_TRANSACTION', entity_type: 'transaction', entity_id: `tx_1_${shortId}`, details: { title: 'Monthly Engineering Retainer', amount: 85000 } },
        { id: `act_3_${shortId}`, user_id: validUserId, action: 'SET_BUDGET', entity_type: 'budget', entity_id: `b_${shortId}_housing`, details: { category: 'housing', limit: 25000 } },
        { id: `act_4_${shortId}`, user_id: validUserId, action: 'ALLOCATE_FUNDS', entity_type: 'goal', entity_id: `g_1_${shortId}`, details: { goal: 'MacBook Pro Hardware Upgrade', amount: 50000 } }
      ];

      await Promise.allSettled([
        client.from('transactions').upsert(txRows, { onConflict: 'id' }),
        client.from('budgets').upsert(budgetRows, { onConflict: 'id' }),
        client.from('goals').upsert(goalRows, { onConflict: 'id' }),
        client.from('goal_deposits').upsert(depositRows, { onConflict: 'id' }),
        client.from('user_settings').upsert(settingsRow, { onConflict: 'user_id' }),
        client.from('activity_logs').upsert(logRows, { onConflict: 'id' })
      ]);

      return true;
    } catch (err) {
      console.warn('[Supabase Sync] seedUserStarterData warning:', err);
      return false;
    }
  },

  // ---------------- SYNC ENGINE (LOCAL <-> CLOUD) ----------------
  async pushLocalDataToCloud(userId, localTransactions, localBudgets, localGoals, localDeposits = [], localCategories = [], localSettings = null) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not connected.');

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) throw new Error('Cannot sync: active Supabase authenticated user session required.');

    // 1. Push Transactions (fallback to demo data if local user transactions are empty)
    let txsToPush = localTransactions && localTransactions.length > 0 ? localTransactions : [];
    if (txsToPush.length === 0) {
      const demoTxs = StorageService.getUserTransactions('user_demo_aryan');
      if (demoTxs.length > 0) txsToPush = demoTxs;
    }

    if (txsToPush.length > 0) {
      const rows = txsToPush.map(tx => ({
        id: String(tx.id).includes('_') ? String(tx.id) : `${tx.id}_${validUserId.slice(0, 8)}`,
        user_id: validUserId,
        title: tx.title,
        amount: Number(tx.amount),
        type: tx.type,
        category_id: tx.categoryId,
        category_name: tx.categoryName,
        icon_key: tx.iconKey || 'other',
        date: tx.date,
        payment_method: tx.paymentMethod || 'UPI',
        notes: tx.notes || '',
        is_recurring: Boolean(tx.isRecurring)
      }));

      const { error: txErr } = await client.from('transactions').upsert(rows, { onConflict: 'id' });
      if (txErr) console.warn('[Supabase Sync] Tx warning:', txErr);
    }

    // 2. Push Budgets
    let budgetsToPush = localBudgets && localBudgets.length > 0 ? localBudgets : [];
    if (budgetsToPush.length === 0) {
      const demoBudgets = StorageService.getUserBudgets('user_demo_aryan');
      if (demoBudgets.length > 0) budgetsToPush = demoBudgets;
    }

    if (budgetsToPush.length > 0) {
      const budgetRows = budgetsToPush.map(b => ({
        id: `b_${validUserId.slice(0, 8)}_${b.categoryId}`,
        user_id: validUserId,
        category_id: b.categoryId,
        monthly_limit: Number(b.monthlyLimit),
        updated_at: new Date().toISOString()
      }));

      const { error: bErr } = await client.from('budgets').upsert(budgetRows, { onConflict: 'id' });
      if (bErr) console.warn('[Supabase Sync] Budget warning:', bErr);
    }

    // 3. Push Goals
    let goalsToPush = localGoals && localGoals.length > 0 ? localGoals : [];
    if (goalsToPush.length === 0) {
      const demoGoals = StorageService.getUserGoals('user_demo_aryan');
      if (demoGoals.length > 0) goalsToPush = demoGoals;
    }

    if (goalsToPush.length > 0) {
      const goalRows = goalsToPush.map(g => ({
        id: String(g.id).includes(validUserId.slice(0, 8)) ? String(g.id) : `${g.id}_${validUserId.slice(0, 8)}`,
        user_id: validUserId,
        title: g.title,
        target_amount: Number(g.targetAmount),
        current_amount: Number(g.currentAmount || 0),
        deadline: g.deadline || null,
        updated_at: new Date().toISOString()
      }));

      const { error: gErr } = await client.from('goals').upsert(goalRows, { onConflict: 'id' });
      if (gErr) console.warn('[Supabase Sync] Goal warning:', gErr);
    }

    // 4. Push Goal Deposits
    let depsToPush = localDeposits && localDeposits.length > 0 ? localDeposits : [];
    if (depsToPush.length === 0) {
      const demoDeps = StorageService.getUserGoalDeposits('user_demo_aryan');
      if (demoDeps.length > 0) depsToPush = demoDeps;
    }

    if (depsToPush.length > 0) {
      const depRows = depsToPush.map(d => ({
        id: String(d.id).includes(validUserId.slice(0, 8)) ? String(d.id) : `${d.id}_${validUserId.slice(0, 8)}`,
        goal_id: String(d.goalId).includes(validUserId.slice(0, 8)) ? String(d.goalId) : `${d.goalId}_${validUserId.slice(0, 8)}`,
        user_id: validUserId,
        amount: Number(d.amount),
        date: d.date,
        notes: d.notes || ''
      }));

      const { error: depErr } = await client.from('goal_deposits').upsert(depRows, { onConflict: 'id' });
      if (depErr) console.warn('[Supabase Sync] Goal Deposits warning:', depErr);
    }

    // 5. Push Settings
    if (localSettings) {
      await this.saveSettings(validUserId, localSettings);
    }

    return true;
  },

  async pullCloudDataToLocal(userId) {
    const client = this.getClient();
    if (!client) return false;

    const validUserId = await this.resolveUserId(userId);
    if (!validUserId) return false;

    try {
      let [txs, budgets, goals, deposits, categories, settings, logs] = await Promise.all([
        this.getTransactions(validUserId),
        this.getBudgets(validUserId),
        this.getGoals(validUserId),
        this.getGoalDeposits(validUserId),
        this.getCategories(validUserId),
        this.getSettings(validUserId),
        this.getActivityLogs(validUserId)
      ]);

      // If user has no data in Supabase cloud, automatically seed their starter ledger directly in Supabase!
      if ((!txs || txs.length === 0) && (!budgets || budgets.length === 0) && (!goals || goals.length === 0)) {
        console.info('[Supabase Sync] No cloud records found for user, seeding complete starter ledger in Supabase...');
        await this.seedUserStarterData(validUserId);

        // Re-fetch now that records are created
        [txs, budgets, goals, deposits] = await Promise.all([
          this.getTransactions(validUserId),
          this.getBudgets(validUserId),
          this.getGoals(validUserId),
          this.getGoalDeposits(validUserId)
        ]);
      }

      if (txs && txs.length > 0) {
        StorageService.setUserTransactions(validUserId, txs);
      }
      if (budgets && budgets.length > 0) {
        StorageService.setUserBudgets(validUserId, budgets);
      }
      if (goals && goals.length > 0) {
        StorageService.setUserGoals(validUserId, goals);
      }
      if (deposits && deposits.length > 0) {
        StorageService.setUserGoalDeposits(validUserId, deposits);
      }
      if (categories && categories.length > 0) {
        StorageService.setUserCategories(validUserId, categories);
      }
      if (settings) {
        StorageService.saveUserSettings(validUserId, settings);
      }
      if (logs && logs.length > 0) {
        StorageService.setUserActivityLogs(validUserId, logs);
      }
      return true;
    } catch (err) {
      console.error('[Supabase Sync] Pull error:', err);
      return false;
    }
  }
};
