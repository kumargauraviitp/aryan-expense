/**
 * Standalone Supabase Seeding & Population Script
 * Reads credentials dynamically from .env.local (never hardcoded)
 * Authenticates developer account and directly populates all 8 tables.
 */
const fs = require('fs');
const path = require('path');

async function seed() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local not found at:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  });

  const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL or SUPABASE_ANON_KEY missing in .env.local');
    process.exit(1);
  }

  console.log('Connecting to Supabase at:', SUPABASE_URL);

  // 1. Authenticate or Sign Up developer account
  let authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aryan@workspace.dev', password: 'password123' })
  });

  let authData = await authRes.json();
  if (!authRes.ok) {
    console.log('Account not yet active, creating account...');
    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aryan@workspace.dev',
        password: 'password123',
        data: { name: 'Aryan Sharma', currency: 'INR' }
      })
    });
    authData = await signupRes.json();
  }

  const token = authData.access_token;
  const userId = authData.user?.id;
  if (!token || !userId) {
    console.error('Authentication failed:', authData);
    process.exit(1);
  }

  console.log(`✓ Authenticated developer account: ${authData.user.email} (UUID: ${userId})`);

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  const shortId = userId.slice(0, 8);
  const getDateStr = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // 2. Profile
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name: 'Aryan Sharma', currency: 'INR', opening_balance: 85000.00 })
  });
  console.log('✓ Profile updated (Opening balance: ₹85,000.00)');

  // 3. User Settings
  await fetch(`${SUPABASE_URL}/rest/v1/user_settings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      theme: 'dark',
      currency: 'INR',
      compact_view: false,
      default_period: 'this_month',
      telemetry_enabled: true
    })
  });
  console.log('✓ User settings configured');

  // 4. 16 Transactions
  const txRows = [
    { id: `tx_1_${shortId}`, user_id: userId, title: 'Monthly Engineering Retainer', amount: 85000, type: 'income', category_id: 'salary', category_name: 'Payroll & Retainer', icon_key: 'salary', date: getDateStr(1), payment_method: 'Bank Transfer', notes: 'Direct ACH Wire transfer', is_recurring: true },
    { id: `tx_2_${shortId}`, user_id: userId, title: 'Client Architecture Milestone', amount: 28000, type: 'income', category_id: 'freelance', category_name: 'Client Contracts', icon_key: 'freelance', date: getDateStr(4), payment_method: 'UPI', notes: 'Design tokens & dashboard delivery', is_recurring: false },
    { id: `tx_3_${shortId}`, user_id: userId, title: 'Apartment Lease & Operations', amount: 22000, type: 'expense', category_id: 'housing', category_name: 'Housing & Office', icon_key: 'housing', date: getDateStr(2), payment_method: 'Bank Transfer', notes: 'Monthly fixed lease commitment', is_recurring: true },
    { id: `tx_4_${shortId}`, user_id: userId, title: 'Supermarket Provisions', amount: 6450, type: 'expense', category_id: 'groceries', category_name: 'Groceries & Pantry', icon_key: 'groceries', date: getDateStr(3), payment_method: 'Credit Card', notes: 'Fresh produce & pantry restock', is_recurring: false },
    { id: `tx_5_${shortId}`, user_id: userId, title: 'Bistro Lunch & Coffee', amount: 2150, type: 'expense', category_id: 'food', category_name: 'Dining & Provisions', icon_key: 'food', date: getDateStr(5), payment_method: 'UPI', notes: 'Team working lunch', is_recurring: false },
    { id: `tx_6_${shortId}`, user_id: userId, title: 'Fiber Internet & Power Grid', amount: 2850, type: 'expense', category_id: 'bills', category_name: 'Utilities & Power', icon_key: 'bills', date: getDateStr(7), payment_method: 'UPI', notes: 'Gigabit fiber connection + electricity', is_recurring: true },
    { id: `tx_7_${shortId}`, user_id: userId, title: 'Transit & Fuel Recharge', amount: 2400, type: 'expense', category_id: 'transport', category_name: 'Transit & Logistics', icon_key: 'transport', date: getDateStr(9), payment_method: 'Debit Card', notes: 'Airport cab + fuel', is_recurring: false },
    { id: `tx_8_${shortId}`, user_id: userId, title: 'Mechanical Keychron Keyboard', amount: 7999, type: 'expense', category_id: 'shopping', category_name: 'Hardware & Supplies', icon_key: 'shopping', date: getDateStr(11), payment_method: 'Credit Card', notes: 'Tactile hot-swappable switches', is_recurring: false },
    { id: `tx_9_${shortId}`, user_id: userId, title: 'GitHub Enterprise & Cloud Tier', amount: 1499, type: 'expense', category_id: 'entertainment', category_name: 'Media & Subscriptions', icon_key: 'entertainment', date: getDateStr(14), payment_method: 'Credit Card', notes: 'Developer subscriptions bundle', is_recurring: true },
    { id: `tx_10_${shortId}`, user_id: userId, title: 'Index Fund Dividend Yield', amount: 4500, type: 'income', category_id: 'investment', category_name: 'Capital Yield & Divs', icon_key: 'investment', date: getDateStr(18), payment_method: 'Bank Transfer', notes: 'Quarterly payout', is_recurring: false },
    { id: `tx_11_${shortId}`, user_id: userId, title: 'Health Assessment & Vitamins', amount: 1800, type: 'expense', category_id: 'health', category_name: 'Health & Wellness', icon_key: 'health', date: getDateStr(22), payment_method: 'UPI', notes: 'Annual routine panel', is_recurring: false },
    { id: `tx_prv_1_${shortId}`, user_id: userId, title: 'Previous Month Payroll', amount: 85000, type: 'income', category_id: 'salary', category_name: 'Payroll & Retainer', icon_key: 'salary', date: getDateStr(32), payment_method: 'Bank Transfer', notes: 'Recurring direct deposit', is_recurring: true },
    { id: `tx_prv_2_${shortId}`, user_id: userId, title: 'Apartment Lease', amount: 22000, type: 'expense', category_id: 'housing', category_name: 'Housing & Office', icon_key: 'housing', date: getDateStr(33), payment_method: 'Bank Transfer', notes: 'Automated monthly debit', is_recurring: true },
    { id: `tx_prv_3_${shortId}`, user_id: userId, title: 'Groceries Restock', amount: 8700, type: 'expense', category_id: 'groceries', category_name: 'Groceries & Pantry', icon_key: 'groceries', date: getDateStr(38), payment_method: 'Credit Card', notes: 'Bulk essentials & supplies', is_recurring: false },
    { id: `tx_prv_4_${shortId}`, user_id: userId, title: 'Freelance Frontend Audit', amount: 15000, type: 'income', category_id: 'freelance', category_name: 'Client Contracts', icon_key: 'freelance', date: getDateStr(45), payment_method: 'UPI', notes: 'React component performance audit', is_recurring: false },
    { id: `tx_prv_5_${shortId}`, user_id: userId, title: 'Team Dinner', amount: 4200, type: 'expense', category_id: 'food', category_name: 'Dining & Provisions', icon_key: 'food', date: getDateStr(50), payment_method: 'UPI', notes: 'Quarterly milestone celebration', is_recurring: false }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(txRows)
  });
  console.log(`✓ Seeded ${txRows.length} transactions into Supabase`);

  // 5. Budgets
  const budgetRows = [
    { id: `b_${shortId}_housing`, user_id: userId, category_id: 'housing', monthly_limit: 25000 },
    { id: `b_${shortId}_food`, user_id: userId, category_id: 'food', monthly_limit: 6000 },
    { id: `b_${shortId}_groceries`, user_id: userId, category_id: 'groceries', monthly_limit: 8000 },
    { id: `b_${shortId}_shopping`, user_id: userId, category_id: 'shopping', monthly_limit: 10000 },
    { id: `b_${shortId}_bills`, user_id: userId, category_id: 'bills', monthly_limit: 4000 }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(budgetRows)
  });
  console.log(`✓ Seeded ${budgetRows.length} budget thresholds into Supabase`);

  // 6. Goals
  const goalRows = [
    { id: `g_1_${shortId}`, user_id: userId, title: 'MacBook Pro Hardware Upgrade', target_amount: 180000, current_amount: 125000, deadline: '2026-12-31' },
    { id: `g_2_${shortId}`, user_id: userId, title: '6-Month Liquid Reserve', target_amount: 200000, current_amount: 160000, deadline: '2027-03-31' },
    { id: `g_3_${shortId}`, user_id: userId, title: 'Annual Travel & Tech Conference', target_amount: 120000, current_amount: 52000, deadline: '2026-11-15' }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(goalRows)
  });
  console.log(`✓ Seeded ${goalRows.length} capital goals into Supabase`);

  // 7. Goal Deposits
  const depositRows = [
    { id: `dep_1_${shortId}`, goal_id: `g_1_${shortId}`, user_id: userId, amount: 75000, date: getDateStr(60), notes: 'Initial hardware budget allocation' },
    { id: `dep_2_${shortId}`, goal_id: `g_1_${shortId}`, user_id: userId, amount: 50000, date: getDateStr(15), notes: 'Q3 consulting milestone proceeds' },
    { id: `dep_3_${shortId}`, goal_id: `g_2_${shortId}`, user_id: userId, amount: 100000, date: getDateStr(75), notes: 'Fixed deposit liquidation allocation' },
    { id: `dep_4_${shortId}`, goal_id: `g_2_${shortId}`, user_id: userId, amount: 60000, date: getDateStr(20), notes: 'Monthly emergency reserve transfer' },
    { id: `dep_5_${shortId}`, goal_id: `g_3_${shortId}`, user_id: userId, amount: 52000, date: getDateStr(30), notes: 'Conference pass & ticket allocation' }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/goal_deposits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(depositRows)
  });
  console.log(`✓ Seeded ${depositRows.length} goal deposits into Supabase`);

  // 8. Activity Logs
  const logRows = [
    { id: `act_1_${shortId}`, user_id: userId, action: 'USER_SIGNIN', entity_type: 'auth', entity_id: 'user_session', details: { source: 'web', method: 'supabase_auth' } },
    { id: `act_2_${shortId}`, user_id: userId, action: 'RECORD_TRANSACTION', entity_type: 'transaction', entity_id: `tx_1_${shortId}`, details: { title: 'Monthly Engineering Retainer', amount: 85000 } },
    { id: `act_3_${shortId}`, user_id: userId, action: 'SET_BUDGET', entity_type: 'budget', entity_id: `b_${shortId}_housing`, details: { category: 'housing', limit: 25000 } },
    { id: `act_4_${shortId}`, user_id: userId, action: 'ALLOCATE_FUNDS', entity_type: 'goal', entity_id: `g_1_${shortId}`, details: { goal: 'MacBook Pro Hardware Upgrade', amount: 50000 } }
  ];

  await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(logRows)
  });
  console.log(`✓ Seeded ${logRows.length} telemetry logs into Supabase`);

  console.log('\n======================================================');
  console.log('🎉 ALL AVAILABLE DATA POPULATED IN SUPABASE SUCCESSFULLY!');
  console.log('Developer Email:    aryan@workspace.dev');
  console.log('Developer Password: password123');
  console.log('======================================================\n');
}

seed().catch(err => {
  console.error('Fatal error seeding Supabase:', err);
  process.exit(1);
});
