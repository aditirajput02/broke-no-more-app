-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  monthly_income numeric not null default 0,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  category text not null,
  note text not null default '',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create index expenses_user_date_idx on public.expenses(user_id, date desc);
create policy "own expenses select" on public.expenses for select using (auth.uid() = user_id);
create policy "own expenses insert" on public.expenses for insert with check (auth.uid() = user_id);
create policy "own expenses update" on public.expenses for update using (auth.uid() = user_id);
create policy "own expenses delete" on public.expenses for delete using (auth.uid() = user_id);

-- budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category)
);
alter table public.budgets enable row level security;
create policy "own budgets select" on public.budgets for select using (auth.uid() = user_id);
create policy "own budgets insert" on public.budgets for insert with check (auth.uid() = user_id);
create policy "own budgets update" on public.budgets for update using (auth.uid() = user_id);
create policy "own budgets delete" on public.budgets for delete using (auth.uid() = user_id);

-- user_stats
create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  last_log_date date,
  updated_at timestamptz not null default now()
);
alter table public.user_stats enable row level security;
create policy "own stats select" on public.user_stats for select using (auth.uid() = user_id);
create policy "own stats insert" on public.user_stats for insert with check (auth.uid() = user_id);
create policy "own stats update" on public.user_stats for update using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger user_stats_updated before update on public.user_stats for each row execute function public.set_updated_at();

-- handle_new_user trigger: creates profile + stats on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();