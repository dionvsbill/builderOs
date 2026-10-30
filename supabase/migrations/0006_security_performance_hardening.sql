-- BuilderOS security and query-performance hardening.
-- Move the SECURITY DEFINER membership helper out of the exposed public schema.
create schema if not exists private;
alter function public.is_workspace_member(uuid) set schema private;
alter function private.is_workspace_member(uuid) set search_path = public;
revoke execute on function private.is_workspace_member(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;

-- Make profile and workspace ownership checks use initplan-friendly auth.uid().
drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles for select to authenticated
using (id = (select auth.uid()));
drop policy if exists "profile self insert" on public.profiles;
create policy "profile self insert" on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
drop policy if exists "profile self update" on public.profiles;
create policy "profile self update" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "authenticated users can create workspace" on public.workspaces;
create policy "authenticated users can create workspace" on public.workspaces for insert to authenticated
with check (owner_id = (select auth.uid()));
drop policy if exists "workspace admins can update" on public.workspaces;
create policy "workspace admins can update" on public.workspaces for update to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')))
with check (exists(select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
drop policy if exists "workspace owner or members can read workspace" on public.workspaces;
create policy "workspace owner or members can read workspace" on public.workspaces for select to authenticated
using (owner_id = (select auth.uid()) or private.is_workspace_member(id));

drop policy if exists "workspace admins can delete projects" on public.projects;
create policy "workspace admins can delete projects" on public.projects for delete to authenticated
using (exists(select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));

-- Forms: members can view, editors can create/update, admins can delete.
drop policy if exists "workspace members read forms" on public.forms;
drop policy if exists "workspace members manage forms" on public.forms;
create policy "workspace members read forms" on public.forms for select to authenticated
using (exists(select 1 from public.projects p where p.id = project_id and private.is_workspace_member(p.workspace_id)));
create policy "workspace editors create forms" on public.forms for insert to authenticated
with check (exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')));
create policy "workspace editors update forms" on public.forms for update to authenticated
using (exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')))
with check (exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')));
create policy "workspace admins delete forms" on public.forms for delete to authenticated
using (exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')));

-- Index foreign-key columns used for joins and cascading deletes.
create index if not exists email_delivery_jobs_submission_id_idx on public.email_delivery_jobs(submission_id);
create index if not exists page_revisions_created_by_idx on public.page_revisions(created_by);
create index if not exists pages_updated_by_idx on public.pages(updated_by);
create index if not exists projects_created_by_idx on public.projects(created_by);
create index if not exists submission_files_submission_id_idx on public.submission_files(submission_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);
