drop policy if exists "user cancels own deletion request" on public.account_deletion_requests;
create policy "user manages own deletion request status"
on public.account_deletion_requests for update to authenticated
using (user_id = (select auth.uid()) and status in ('requested','cancelled'))
with check (user_id = (select auth.uid()) and status in ('requested','cancelled'));