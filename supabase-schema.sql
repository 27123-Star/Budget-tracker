-- Create tables for CoinFlow Supabase-backed storage
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  handCash double precision default 0,
  theme text default 'dark',
  categories text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  description text not null,
  category text not null,
  amount double precision not null,
  type text not null,
  created_at timestamptz default now()
);

create table if not exists goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target double precision not null,
  current double precision not null,
  date text not null,
  created_at timestamptz default now()
);

create table if not exists debts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  entityName text not null,
  email text not null,
  amount double precision not null,
  type text not null,
  settled boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table transactions enable row level security;
alter table goals enable row level security;
alter table debts enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own transactions" on transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on transactions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on transactions
  for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions
  for delete using (auth.uid() = user_id);

create policy "Users can view own goals" on goals
  for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on goals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on goals
  for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on goals
  for delete using (auth.uid() = user_id);

create policy "Users can view own debts" on debts
  for select using (auth.uid() = user_id);
create policy "Users can insert own debts" on debts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own debts" on debts
  for update using (auth.uid() = user_id);
create policy "Users can delete own debts" on debts
  for delete using (auth.uid() = user_id);
