-- ============================================================
-- Multi-choice markets migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add market_type column to markets (defaults to 'binary' for existing rows)
alter table public.markets
  add column market_type text not null default 'binary'
  check (market_type in ('binary', 'multi'));

-- 2. Relax the trades.position constraint (must allow option UUIDs for multi markets)
alter table public.trades drop constraint trades_position_check;
alter table public.trades add constraint trades_position_check
  check (length(position) > 0);

-- 3. Relax the markets.outcome constraint (must allow option UUIDs for multi markets)
alter table public.markets drop constraint markets_outcome_check;
alter table public.markets add constraint markets_outcome_check
  check (outcome is null or length(outcome) > 0);

-- 4. Create market_options table
create table public.market_options (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references public.markets(id) on delete cascade not null,
  label text not null,
  pool integer not null default 0,
  ord integer not null default 0,
  created_at timestamptz not null default now()
);

create index market_options_market_id_idx on public.market_options(market_id);

-- 5. RLS for market_options
alter table public.market_options enable row level security;

create policy "Market options viewable by everyone" on public.market_options
  for select using (true);

create policy "Admins can insert market options" on public.market_options
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update market options" on public.market_options
  for update using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 6. Add binary-only guard to existing execute_trade RPC
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
  v_market_type text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_position not in ('yes', 'no') then
    raise exception 'Invalid position for binary market';
  end if;

  if p_amount_oc < 1 then
    raise exception 'Minimum trade is 1 OC';
  end if;

  select balance_oc into v_balance from public.users where id = v_user_id;
  if v_balance < p_amount_oc then
    raise exception 'Insufficient balance';
  end if;

  select status, closes_at, market_type into v_status, v_closes_at, v_market_type
  from public.markets where id = p_market_id;

  if v_status != 'open' then
    raise exception 'Market is not open';
  end if;

  if v_closes_at < now() then
    raise exception 'Market has closed';
  end if;

  if v_market_type != 'binary' then
    raise exception 'Use execute_multi_trade for multi-choice markets';
  end if;

  insert into public.trades (user_id, market_id, position, amount_oc, shares)
  values (v_user_id, p_market_id, p_position, p_amount_oc, p_amount_oc);

  if p_position = 'yes' then
    update public.markets set yes_pool = yes_pool + p_amount_oc where id = p_market_id;
  else
    update public.markets set no_pool = no_pool + p_amount_oc where id = p_market_id;
  end if;

  update public.users set balance_oc = balance_oc - p_amount_oc where id = v_user_id;

  return json_build_object('success', true, 'shares', p_amount_oc);
end;
$$ language plpgsql security definer;

-- 7. New RPC: execute_multi_trade
create or replace function public.execute_multi_trade(
  p_market_id uuid,
  p_option_id uuid,
  p_amount_oc integer
) returns json as $$
declare
  v_user_id uuid;
  v_balance integer;
  v_status text;
  v_closes_at timestamptz;
  v_market_type text;
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

  select status, closes_at, market_type into v_status, v_closes_at, v_market_type
  from public.markets where id = p_market_id;

  if v_status != 'open' then
    raise exception 'Market is not open';
  end if;

  if v_closes_at < now() then
    raise exception 'Market has closed';
  end if;

  if v_market_type != 'multi' then
    raise exception 'Use execute_trade for binary markets';
  end if;

  if not exists (
    select 1 from public.market_options
    where id = p_option_id and market_id = p_market_id
  ) then
    raise exception 'Invalid option';
  end if;

  insert into public.trades (user_id, market_id, position, amount_oc, shares)
  values (v_user_id, p_market_id, p_option_id::text, p_amount_oc, p_amount_oc);

  update public.market_options
  set pool = pool + p_amount_oc
  where id = p_option_id;

  update public.users set balance_oc = balance_oc - p_amount_oc where id = v_user_id;

  return json_build_object('success', true, 'shares', p_amount_oc);
end;
$$ language plpgsql security definer;

-- 8. New RPC: resolve_multi_market
create or replace function public.resolve_multi_market(
  p_market_id uuid,
  p_winning_option_id uuid
) returns json as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_total_pool integer;
  v_winning_pool integer;
  v_winning_label text;
  v_trade record;
  v_payout integer;
begin
  v_user_id := auth.uid();
  select is_admin into v_is_admin from public.users where id = v_user_id;
  if not coalesce(v_is_admin, false) then
    raise exception 'Not authorized';
  end if;

  -- Verify option belongs to this market
  select pool, label into v_winning_pool, v_winning_label
  from public.market_options
  where id = p_winning_option_id and market_id = p_market_id;

  if v_winning_pool is null then
    raise exception 'Invalid winning option';
  end if;

  -- Total pool = sum of all option pools
  select coalesce(sum(pool), 0) into v_total_pool
  from public.market_options
  where market_id = p_market_id;

  update public.markets
  set status = 'resolved', outcome = p_winning_option_id::text
  where id = p_market_id;

  if v_winning_pool = 0 then
    return json_build_object('success', true, 'payouts', 0);
  end if;

  for v_trade in
    select user_id, sum(amount_oc) as total_amount
    from public.trades
    where market_id = p_market_id and position = p_winning_option_id::text
    group by user_id
  loop
    v_payout := floor(
      v_trade.total_amount::float / v_winning_pool::float * v_total_pool
    )::integer;

    update public.users
    set balance_oc = balance_oc + v_payout
    where id = v_trade.user_id;

    insert into public.payouts (user_id, market_id, amount_oc)
    values (v_trade.user_id, p_market_id, v_payout);
  end loop;

  return json_build_object(
    'success', true,
    'total_pool', v_total_pool,
    'winning_pool', v_winning_pool,
    'winning_label', v_winning_label
  );
end;
$$ language plpgsql security definer;
