-- ==============================================================================
-- Migration: Create 4 Missing Tables in Supabase
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- This safely creates:
-- 1. categories      (Expense & Income categories)
-- 2. goal_deposits   (Audit log of money allocated to goals)
-- 3. user_settings   (User theme, currency, preferences)
-- 4. activity_logs   (Action telemetry audit trail)
-- ==============================================================================

-- 1. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  user_id uuid references auth.users on delete cascade, -- NULL = system global category
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon_key text default 'other',
  color text default '#6366f1',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_categories_user on public.categories (user_id);
create index if not exists idx_categories_type on public.categories (type);

-- 2. GOAL DEPOSITS TABLE
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

-- 3. USER SETTINGS TABLE
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

-- 4. ACTIVITY LOGS TABLE
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ==============================================================================

alter table public.categories enable row level security;
alter table public.goal_deposits enable row level security;
alter table public.user_settings enable row level security;
alter table public.activity_logs enable row level security;

-- CATEGORIES POLICIES
drop policy if exists "Users can view system and own categories" on public.categories;
create policy "Users can view system and own categories" on public.categories
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories" on public.categories
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories" on public.categories
  for delete using (auth.uid() = user_id);

-- GOAL DEPOSITS POLICIES
drop policy if exists "Users can view own goal deposits" on public.goal_deposits;
create policy "Users can view own goal deposits" on public.goal_deposits
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own goal deposits" on public.goal_deposits;
create policy "Users can insert own goal deposits" on public.goal_deposits
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goal deposits" on public.goal_deposits;
create policy "Users can delete own goal deposits" on public.goal_deposits
  for delete using (auth.uid() = user_id);

-- USER SETTINGS POLICIES
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- ACTIVITY LOGS POLICIES
drop policy if exists "Users can view own activity logs" on public.activity_logs;
create policy "Users can view own activity logs" on public.activity_logs
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity logs" on public.activity_logs;
create policy "Users can insert own activity logs" on public.activity_logs
  for insert with check (auth.uid() = user_id);

-- ==============================================================================
-- POPULATE DEFAULT SYSTEM CATEGORIES
-- ==============================================================================
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
