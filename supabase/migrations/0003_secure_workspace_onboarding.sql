-- Tighten first-workspace onboarding and close membership escalation paths.
-- Apply after 0001_initial_workspace_schema.sql and 0002_forms_and_delivery.sql.

drop policy if exists "workspace members can read workspace" on public.workspaces;
create policy "workspace owner or members can read workspace"
on public.workspaces for select to authenticated
using (owner_id = (select auth.uid()) or public.is_workspace_member(id));

drop policy if exists "workspace owners can add members" on public.workspace_members;
create policy "users can create their own initial owner membership"
on public.workspace_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace owners can remove members" on public.workspace_members;
create policy "workspace owners can remove memberships"
on public.workspace_members for delete to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = (select auth.uid())
  )
);

create policy "workspace owners can delete their workspace"
on public.workspaces for delete to authenticated
using (owner_id = (select auth.uid()));

-- A workspace owner can read the workspace row immediately after inserting it,
-- then create exactly their own owner membership. Other member invitations must
-- be performed by a separately authorized server-side team-management flow.
