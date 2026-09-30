-- ==============================================================================
-- FinTrack Supabase Comprehensive Database Schema & Row-Level Security (RLS)
-- Includes ALL 8 Tables used by the application:
-- 1. profiles        - User accounts & profile information
-- 2. categories      - Expense & Income categories (Global + Custom)
-- 3. transactions    - Income & expense ledger entries
-- 4. budgets         - Monthly spending limits per category
-- 5. goals           - Capital reserve & savings targets
-- 6. goal_deposits   - Audit record of capital allocations into goals
-- 7. user_settings   - User preferences (Theme, Currency, Telemetry)
-- 8. activity_logs   - Telemetry audit trail of user actions
-- ==============================================================================

-- 1. PROFILES TABLE (Linked with Supabase Auth users)
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

-- 2. CATEGORIES TABLE (System default categories + user custom categories)
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

-- 3. TRANSACTIONS TABLE
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

-- 4. BUDGETS TABLE (Category monthly spending caps)
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

-- 5. GOALS TABLE (Capital savings targets)
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

-- 6. GOAL DEPOSITS TABLE (Track each capital allocation into a goal)
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

-- 7. USER SETTINGS TABLE (Preferences: Theme, Currency, Telemetry)
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

-- 8. ACTIVITY LOGS TABLE (Comprehensive telemetry audit trail)
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can ONLY access and modify their OWN private data
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_deposits enable row level security;
alter table public.user_settings enable row level security;
alter table public.activity_logs enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- CATEGORIES POLICIES (Users can view global categories OR their own custom categories)
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

-- TRANSACTIONS POLICIES
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

-- BUDGETS POLICIES
drop policy if exists "Users can view own budgets" on public.budgets;
create policy "Users can view own budgets" on public.budgets for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own budgets" on public.budgets;
create policy "Users can insert own budgets" on public.budgets for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets" on public.budgets for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets" on public.budgets for delete using (auth.uid() = user_id);

-- GOALS POLICIES
drop policy if exists "Users can view own goals" on public.goals;
create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

-- GOAL DEPOSITS POLICIES
drop policy if exists "Users can view own goal deposits" on public.goal_deposits;
create policy "Users can view own goal deposits" on public.goal_deposits for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own goal deposits" on public.goal_deposits;
create policy "Users can insert own goal deposits" on public.goal_deposits for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own goal deposits" on public.goal_deposits;
create policy "Users can delete own goal deposits" on public.goal_deposits for delete using (auth.uid() = user_id);

-- USER SETTINGS POLICIES
drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- ACTIVITY LOGS POLICIES
drop policy if exists "Users can view own activity logs" on public.activity_logs;
create policy "Users can view own activity logs" on public.activity_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own activity logs" on public.activity_logs;
create policy "Users can insert own activity logs" on public.activity_logs for insert with check (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC TRIGGER: Create Profile, Settings & Log on User Sign Up via Supabase Auth
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Create Profile
  insert into public.profiles (id, name, email, currency, opening_balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'currency', 'INR'),
    coalesce((new.raw_user_meta_data->>'opening_balance')::numeric, 0.00)
  )
  on conflict (id) do nothing;

  -- 2. Create User Settings
  insert into public.user_settings (user_id, theme, currency)
  values (
    new.id,
    'dark',
    coalesce(new.raw_user_meta_data->>'currency', 'INR')
  )
  on conflict (user_id) do nothing;

  -- 3. Record Initial Activity Log
  insert into public.activity_logs (id, user_id, action, entity_type, entity_id, details)
  values (
    'act_' || replace(gen_random_uuid()::text, '-', ''),
    new.id,
    'USER_REGISTERED',
    'auth',
    new.id::text,
    jsonb_build_object('email', new.email)
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
