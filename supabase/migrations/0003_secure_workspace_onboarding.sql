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

-- The membership helper is intentionally narrow: it can only answer whether
-- the caller is a member of a supplied workspace. Keep execution away from anon.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- Viewers may read content but must not mutate projects or page documents.
drop policy if exists "workspace editors can create projects" on public.projects;
create policy "workspace editors can create projects"
on public.projects for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
);

drop policy if exists "workspace editors can update projects" on public.projects;
create policy "workspace editors can update projects"
on public.projects for update to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
);

drop policy if exists "members can create pages" on public.pages;
create policy "workspace editors can create pages"
on public.pages for insert to authenticated
with check (
  exists (
    select 1 from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = pages.project_id and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
);

drop policy if exists "members can update pages" on public.pages;
create policy "workspace editors can update pages"
on public.pages for update to authenticated
using (
  exists (
    select 1 from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_id and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
)
with check (
  exists (
    select 1 from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = project_id and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin','editor')
  )
);
