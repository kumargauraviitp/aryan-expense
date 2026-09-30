-- ==============================================================================
-- FinTrack Complete Supabase Setup & Seed Migration (All-In-One Script)
-- Paste this ENTIRE script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- 
-- This script safely:
-- 1. Creates all 8 tables (profiles, categories, transactions, budgets, goals, goal_deposits, user_settings, activity_logs)
-- 2. Sets up Row Level Security (RLS) policies
-- 3. Sets up user creation trigger
-- 4. Creates/confirms developer account (aryan@workspace.dev / password123)
-- 5. Inserts ALL 16 transactions, 5 budgets, 3 goals, 5 deposits, 15 categories, and settings
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- 1. CREATE ALL 8 TABLES
-- ------------------------------------------------------------------------------

-- Table 1: Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  currency text default 'INR',
  theme text default 'dark' check (theme in ('dark', 'light')),
  opening_balance numeric(14, 2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table 2: Categories
create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users on delete cascade, -- NULL = global category
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon_key text default 'other',
  color text default '#6366f1',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_categories_user on public.categories (user_id);
create index if not exists idx_categories_type on public.categories (type);

-- Table 3: Transactions
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category_id text not null,
  category_name text not null,
  icon_key text default 'other',
  date date not null,
  payment_method text default 'UPI',
  notes text default '',
  is_recurring boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_tx_user_date on public.transactions (user_id, date desc);
create index if not exists idx_tx_user_type on public.transactions (user_id, type);

-- Table 4: Budgets
create table if not exists public.budgets (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id text not null,
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_category_budget unique (user_id, category_id)
);

create index if not exists idx_budgets_user on public.budgets (user_id);

-- Table 5: Goals
create table if not exists public.goals (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) default 0.00 check (current_amount >= 0),
  deadline date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_goals_user on public.goals (user_id);

-- Table 6: Goal Deposits
create table if not exists public.goal_deposits (
  id text primary key,
  goal_id text references public.goals on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date default current_date not null,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_goal_deposits_goal on public.goal_deposits (goal_id);
create index if not exists idx_goal_deposits_user on public.goal_deposits (user_id);

-- Table 7: User Settings
create table if not exists public.user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  theme text default 'dark' check (theme in ('dark', 'light')),
  currency text default 'INR',
  compact_view boolean default false,
  default_period text default 'this_month',
  telemetry_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table 8: Activity Logs
create table if not exists public.activity_logs (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_activity_logs_user on public.activity_logs (user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_deposits enable row level security;
alter table public.user_settings enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Categories
drop policy if exists "Users can view system and own categories" on public.categories;
create policy "Users can view system and own categories" on public.categories for select using (user_id is null or auth.uid() = user_id);
drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

-- Transactions
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- Budgets
drop policy if exists "Users can view own budgets" on public.budgets;
create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own budgets" on public.budgets;
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- Goals
drop policy if exists "Users can view own goals" on public.goals;
create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

-- Goal Deposits
drop policy if exists "Users can view own goal deposits" on public.goal_deposits;
create policy "Users can view own goal deposits" on public.goal_deposits for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own goal deposits" on public.goal_deposits;
create policy "Users can insert own goal deposits" on public.goal_deposits for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete own goal deposits" on public.goal_deposits;
create policy "Users can delete own goal deposits" on public.goal_deposits for delete using (auth.uid() = user_id);

-- User Settings
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- Activity Logs
drop policy if exists "Users can view own activity logs" on public.activity_logs;
create policy "Users can view own activity logs" on public.activity_logs for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own activity logs" on public.activity_logs;
create policy "Users can insert own activity logs" on public.activity_logs for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. ENSURE DEVELOPER ACCOUNT (aryan@workspace.dev) EXISTS & IS CONFIRMED
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- If aryan@workspace.dev does not exist, insert it safely with a new UUID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'aryan@workspace.dev' LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'aryan@workspace.dev',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Aryan Sharma","currency":"INR"}'::jsonb,
      now(),
      now()
    );
  ELSE
    -- If user already exists, update password to password123 and confirm email
    UPDATE auth.users
    SET
      encrypted_password = crypt('password123', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Ensure identity mapping exists for email provider
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id::text,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', 'aryan@workspace.dev')::jsonb,
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, id) DO NOTHING;

  -- Auto-confirm any existing user so they can log in immediately
  UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice: auth.users management skipped or handled by dashboard (%): %', SQLSTATE, SQLERRM;
END $$;

-- ------------------------------------------------------------------------------
-- 4. INSERT ALL 15 DEFAULT SYSTEM CATEGORIES
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, user_id, name, type, icon_key, color)
VALUES
  ('food', NULL, 'Dining & Provisions', 'expense', 'food', '#f59e0b'),
  ('groceries', NULL, 'Groceries & Pantry', 'expense', 'groceries', '#10b981'),
  ('housing', NULL, 'Housing & Office', 'expense', 'housing', '#6366f1'),
  ('transport', NULL, 'Transit & Logistics', 'expense', 'transport', '#38bdf8'),
  ('shopping', NULL, 'Hardware & Supplies', 'expense', 'shopping', '#ec4899'),
  ('entertainment', NULL, 'Media & Subscriptions', 'expense', 'entertainment', '#8b5cf6'),
  ('bills', NULL, 'Utilities & Power', 'expense', 'bills', '#eab308'),
  ('health', NULL, 'Health & Wellness', 'expense', 'health', '#14b8a6'),
  ('education', NULL, 'Books & Resources', 'expense', 'education', '#a855f7'),
  ('other', NULL, 'Miscellaneous', 'expense', 'other', '#71717a'),
  ('salary', NULL, 'Payroll & Retainer', 'income', 'salary', '#22c55e'),
  ('freelance', NULL, 'Client Contracts', 'income', 'freelance', '#06b6d4'),
  ('investment', NULL, 'Capital Yield & Divs', 'income', 'investment', '#6366f1'),
  ('bonus', NULL, 'Incentives & Performance', 'income', 'bonus', '#f59e0b'),
  ('other_inflow', NULL, 'Other Inflows', 'income', 'other', '#22c55e')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_key = EXCLUDED.icon_key,
  color = EXCLUDED.color;

-- ------------------------------------------------------------------------------
-- 5. POPULATE PROFILES & SETTINGS FOR EVERY USER IN AUTH.USERS
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, name, email, currency, theme, opening_balance)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.raw_user_meta_data->>'currency', 'INR'),
  'dark',
  85000.00
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency,
  opening_balance = EXCLUDED.opening_balance;

INSERT INTO public.user_settings (user_id, theme, currency, compact_view, default_period, telemetry_enabled)
SELECT
  u.id,
  'dark',
  COALESCE(u.raw_user_meta_data->>'currency', 'INR'),
  false,
  'this_month',
  true
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE SET
  theme = EXCLUDED.theme,
  currency = EXCLUDED.currency;

-- ------------------------------------------------------------------------------
-- 6. INSERT ALL 16 TRANSACTIONS (FOR EVERY AUTH USER)
-- ------------------------------------------------------------------------------
INSERT INTO public.transactions (id, user_id, title, amount, type, category_id, category_name, icon_key, date, payment_method, notes, is_recurring)
SELECT
  t.id || '_' || substr(u.id::text, 1, 8),
  u.id,
  t.title,
  t.amount,
  t.type,
  t.category_id,
  t.category_name,
  t.icon_key,
  t.date,
  t.payment_method,
  t.notes,
  t.is_recurring
FROM auth.users u
CROSS JOIN (
  VALUES
    ('tx_1', 'Monthly Engineering Retainer', 85000.00, 'income', 'salary', 'Payroll & Retainer', 'salary', CURRENT_DATE - INTERVAL '1 day', 'Bank Transfer', 'Direct ACH Wire transfer', true),
    ('tx_2', 'Client Architecture Milestone', 28000.00, 'income', 'freelance', 'Client Contracts', 'freelance', CURRENT_DATE - INTERVAL '4 days', 'UPI', 'Design tokens & dashboard delivery', false),
    ('tx_3', 'Apartment Lease & Operations', 22000.00, 'expense', 'housing', 'Housing & Office', 'housing', CURRENT_DATE - INTERVAL '2 days', 'Bank Transfer', 'Monthly fixed lease commitment', true),
    ('tx_4', 'Supermarket Provisions', 6450.00, 'expense', 'groceries', 'Groceries & Pantry', 'groceries', CURRENT_DATE - INTERVAL '3 days', 'Credit Card', 'Fresh produce & pantry restock', false),
    ('tx_5', 'Bistro Lunch & Coffee', 2150.00, 'expense', 'food', 'Dining & Provisions', 'food', CURRENT_DATE - INTERVAL '5 days', 'UPI', 'Team working lunch', false),
    ('tx_6', 'Fiber Internet & Power Grid', 2850.00, 'expense', 'bills', 'Utilities & Power', 'bills', CURRENT_DATE - INTERVAL '7 days', 'UPI', 'Gigabit fiber connection + electricity', true),
    ('tx_7', 'Transit & Fuel Recharge', 2400.00, 'expense', 'transport', 'Transit & Logistics', 'transport', CURRENT_DATE - INTERVAL '9 days', 'Debit Card', 'Airport cab + fuel', false),
    ('tx_8', 'Mechanical Keychron Keyboard', 7999.00, 'expense', 'shopping', 'Hardware & Supplies', 'shopping', CURRENT_DATE - INTERVAL '11 days', 'Credit Card', 'Tactile hot-swappable switches', false),
    ('tx_9', 'GitHub Enterprise & Cloud Tier', 1499.00, 'expense', 'entertainment', 'Media & Subscriptions', 'entertainment', CURRENT_DATE - INTERVAL '14 days', 'Credit Card', 'Developer subscriptions bundle', true),
    ('tx_10', 'Index Fund Dividend Yield', 4500.00, 'income', 'investment', 'Capital Yield & Divs', 'investment', CURRENT_DATE - INTERVAL '18 days', 'Bank Transfer', 'Quarterly payout', false),
    ('tx_11', 'Health Assessment & Vitamins', 1800.00, 'expense', 'health', 'Health & Wellness', 'health', CURRENT_DATE - INTERVAL '22 days', 'UPI', 'Annual routine panel', false),
    ('tx_prv_1', 'Previous Month Payroll', 85000.00, 'income', 'salary', 'Payroll & Retainer', 'salary', CURRENT_DATE - INTERVAL '32 days', 'Bank Transfer', 'Recurring direct deposit', true),
    ('tx_prv_2', 'Apartment Lease', 22000.00, 'expense', 'housing', 'Housing & Office', 'housing', CURRENT_DATE - INTERVAL '33 days', 'Bank Transfer', 'Automated monthly debit', true),
    ('tx_prv_3', 'Groceries Restock', 8700.00, 'expense', 'groceries', 'Groceries & Pantry', 'groceries', CURRENT_DATE - INTERVAL '38 days', 'Credit Card', 'Bulk essentials & supplies', false),
    ('tx_prv_4', 'Freelance Frontend Audit', 15000.00, 'income', 'freelance', 'Client Contracts', 'freelance', CURRENT_DATE - INTERVAL '45 days', 'UPI', 'React component performance audit', false),
    ('tx_prv_5', 'Team Dinner', 4200.00, 'expense', 'food', 'Dining & Provisions', 'food', CURRENT_DATE - INTERVAL '50 days', 'UPI', 'Quarterly milestone celebration', false)
) AS t(id, title, amount, type, category_id, category_name, icon_key, date, payment_method, notes, is_recurring)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  amount = EXCLUDED.amount,
  date = EXCLUDED.date;

-- ------------------------------------------------------------------------------
-- 7. INSERT 5 CATEGORY BUDGETS (FOR EVERY AUTH USER)
-- ------------------------------------------------------------------------------
INSERT INTO public.budgets (id, user_id, category_id, monthly_limit)
SELECT
  'b_' || substr(u.id::text, 1, 8) || '_' || b.category_id,
  u.id,
  b.category_id,
  b.monthly_limit
FROM auth.users u
CROSS JOIN (
  VALUES
    ('housing', 25000.00),
    ('food', 6000.00),
    ('groceries', 8000.00),
    ('shopping', 10000.00),
    ('bills', 4000.00)
) AS b(category_id, monthly_limit)
ON CONFLICT (user_id, category_id) DO UPDATE SET
  monthly_limit = EXCLUDED.monthly_limit;

-- ------------------------------------------------------------------------------
-- 8. INSERT 3 CAPITAL RESERVE GOALS (FOR EVERY AUTH USER)
-- ------------------------------------------------------------------------------
INSERT INTO public.goals (id, user_id, title, target_amount, current_amount, deadline)
SELECT
  g.id || '_' || substr(u.id::text, 1, 8),
  u.id,
  g.title,
  g.target_amount,
  g.current_amount,
  g.deadline
FROM auth.users u
CROSS JOIN (
  VALUES
    ('g_1', 'MacBook Pro Hardware Upgrade', 180000.00, 125000.00, '2026-12-31'::date),
    ('g_2', '6-Month Liquid Reserve', 200000.00, 160000.00, '2027-03-31'::date),
    ('g_3', 'Annual Travel & Tech Conference', 120000.00, 52000.00, '2026-11-15'::date)
) AS g(id, title, target_amount, current_amount, deadline)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  target_amount = EXCLUDED.target_amount,
  current_amount = EXCLUDED.current_amount;

-- ------------------------------------------------------------------------------
-- 9. INSERT GOAL CAPITAL DEPOSIT AUDIT LOGS
-- ------------------------------------------------------------------------------
INSERT INTO public.goal_deposits (id, goal_id, user_id, amount, date, notes)
SELECT
  d.id || '_' || substr(u.id::text, 1, 8),
  d.goal_id || '_' || substr(u.id::text, 1, 8),
  u.id,
  d.amount,
  d.date,
  d.notes
FROM auth.users u
CROSS JOIN (
  VALUES
    ('dep_1', 'g_1', 75000.00, CURRENT_DATE - INTERVAL '60 days', 'Initial hardware budget allocation'),
    ('dep_2', 'g_1', 50000.00, CURRENT_DATE - INTERVAL '15 days', 'Q3 consulting milestone proceeds'),
    ('dep_3', 'g_2', 100000.00, CURRENT_DATE - INTERVAL '75 days', 'Fixed deposit liquidation allocation'),
    ('dep_4', 'g_2', 60000.00, CURRENT_DATE - INTERVAL '20 days', 'Monthly emergency reserve transfer'),
    ('dep_5', 'g_3', 52000.00, CURRENT_DATE - INTERVAL '30 days', 'Conference pass & ticket allocation')
) AS d(id, goal_id, amount, date, notes)
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  notes = EXCLUDED.notes;

-- ------------------------------------------------------------------------------
-- 10. INSERT INITIAL ACTIVITY TELEMETRY AUDIT TRAIL
-- ------------------------------------------------------------------------------
INSERT INTO public.activity_logs (id, user_id, action, entity_type, entity_id, details)
SELECT
  a.id || '_' || substr(u.id::text, 1, 8),
  u.id,
  a.action,
  a.entity_type,
  a.entity_id,
  a.details::jsonb
FROM auth.users u
CROSS JOIN (
  VALUES
    ('act_1', 'USER_SIGNIN', 'auth', 'user_session', '{"source": "web", "method": "supabase_auth"}'),
    ('act_2', 'RECORD_TRANSACTION', 'transaction', 'tx_1', '{"title": "Monthly Engineering Retainer", "amount": 85000}'),
    ('act_3', 'SET_BUDGET', 'budget', 'b_housing', '{"category": "housing", "limit": 25000}'),
    ('act_4', 'ALLOCATE_FUNDS', 'goal', 'g_1', '{"goal": "MacBook Pro Hardware Upgrade", "amount": 50000}')
) AS a(id, action, entity_type, entity_id, details)
ON CONFLICT (id) DO UPDATE SET
  action = EXCLUDED.action;
