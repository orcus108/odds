-- ============================================================
-- Market proposals — allow registered users to suggest markets
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Allow 'pending' as a valid market status
alter table public.markets drop constraint markets_status_check;
alter table public.markets add constraint markets_status_check
  check (status in ('open', 'closed', 'resolved', 'pending'));

-- 2. Allow authenticated users to insert their own pending markets
create policy "Users can propose markets" on public.markets
  for insert with check (
    auth.uid() is not null
    and status = 'pending'
    and created_by = auth.uid()
  );

-- 3. Allow users to withdraw (delete) their own pending markets
create policy "Users can delete own pending markets" on public.markets
  for delete using (
    auth.uid() = created_by
    and status = 'pending'
  );

-- 4. Allow admins to delete markets (needed to reject proposals)
create policy "Admins can delete markets" on public.markets
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and is_admin = true)
  );

-- 5. Allow users to insert market_options for their own pending markets
create policy "Users can insert options for own pending markets" on public.market_options
  for insert with check (
    exists (
      select 1 from public.markets
      where id = market_id
        and created_by = auth.uid()
        and status = 'pending'
    )
  );

-- Note: deleting market_options when a market is deleted is handled by
-- ON DELETE CASCADE on market_options.market_id — no extra RLS needed.
