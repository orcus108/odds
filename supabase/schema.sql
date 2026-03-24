-- ============================================================
-- Odds — IITM Prediction Market
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- TABLES

create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  username text unique,
  avatar_url text,
  balance_oc integer not null default 10000,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resolution_criteria text,
  category text not null default 'Other',
  yes_pool integer not null default 0,
  no_pool integer not null default 0,
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  outcome text check (outcome in ('yes', 'no')),
  created_by uuid references public.users(id),
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  market_id uuid references public.markets(id) on delete cascade not null,
  position text not null check (position in ('yes', 'no')),
  amount_oc integer not null,
  shares integer not null,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  market_id uuid references public.markets(id) on delete cascade not null,
  amount_oc integer not null,
  created_at timestamptz not null default now()
);

-- INDEXES

create index trades_market_id_idx on public.trades(market_id);
create index trades_user_id_idx on public.trades(user_id);
create index markets_status_idx on public.markets(status);

-- ROW LEVEL SECURITY

alter table public.users enable row level security;
alter table public.markets enable row level security;
alter table public.trades enable row level security;
alter table public.payouts enable row level security;

-- users policies
create policy "Users viewable by everyone" on public.users
  for select using (true);
create policy "Users can update own row" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- markets policies
create policy "Markets viewable by everyone" on public.markets
  for select using (true);
create policy "Admins can insert markets" on public.markets
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );
create policy "Admins can update markets" on public.markets
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- trades policies
create policy "Trades viewable by everyone" on public.trades
  for select using (true);

-- payouts policies
create policy "Users can view own payouts" on public.payouts
  for select using (auth.uid() = user_id);

-- TRIGGER: create user row on first sign-in

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FUNCTION: execute_trade (atomic: deduct balance, update pool, insert trade)

create or replace function public.execute_trade(
  p_market_id uuid,
  p_position text,
  p_amount_oc integer
) returns json as $$
declare
  v_user_id uuid;
  v_balance integer;
  v_status text;
  v_closes_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount_oc < 1 then
    raise exception 'Minimum trade is 1 OC';
  end if;

  select balance_oc into v_balance from public.users where id = v_user_id;
  if v_balance < p_amount_oc then
    raise exception 'Insufficient balance';
  end if;

  select status, closes_at into v_status, v_closes_at
  from public.markets where id = p_market_id;

  if v_status != 'open' then
    raise exception 'Market is not open';
  end if;

  if v_closes_at < now() then
    raise exception 'Market has closed';
  end if;

  -- Insert trade (shares = amount, 1:1)
  insert into public.trades (user_id, market_id, position, amount_oc, shares)
  values (v_user_id, p_market_id, p_position, p_amount_oc, p_amount_oc);

  -- Update the correct pool
  if p_position = 'yes' then
    update public.markets set yes_pool = yes_pool + p_amount_oc where id = p_market_id;
  else
    update public.markets set no_pool = no_pool + p_amount_oc where id = p_market_id;
  end if;

  -- Deduct from user balance
  update public.users set balance_oc = balance_oc - p_amount_oc where id = v_user_id;

  return json_build_object('success', true, 'shares', p_amount_oc);
end;
$$ language plpgsql security definer;

-- FUNCTION: resolve_market (atomic: mark resolved + distribute payouts)

create or replace function public.resolve_market(
  p_market_id uuid,
  p_outcome text
) returns json as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_total_pool integer;
  v_winning_pool integer;
  v_trade record;
  v_payout integer;
begin
  v_user_id := auth.uid();
  select is_admin into v_is_admin from public.users where id = v_user_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'Not authorized';
  end if;

  select (yes_pool + no_pool),
    case when p_outcome = 'yes' then yes_pool else no_pool end
  into v_total_pool, v_winning_pool
  from public.markets where id = p_market_id;

  update public.markets
  set status = 'resolved', outcome = p_outcome
  where id = p_market_id;

  if v_winning_pool = 0 then
    return json_build_object('success', true, 'payouts', 0);
  end if;

  for v_trade in
    select user_id, sum(amount_oc) as total_amount
    from public.trades
    where market_id = p_market_id and position = p_outcome
    group by user_id
  loop
    v_payout := floor(v_trade.total_amount::float / v_winning_pool::float * v_total_pool)::integer;

    update public.users
    set balance_oc = balance_oc + v_payout
    where id = v_trade.user_id;

    insert into public.payouts (user_id, market_id, amount_oc)
    values (v_trade.user_id, p_market_id, v_payout);
  end loop;

  return json_build_object('success', true, 'total_pool', v_total_pool, 'winning_pool', v_winning_pool);
end;
$$ language plpgsql security definer;
