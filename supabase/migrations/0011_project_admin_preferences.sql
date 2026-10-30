-- Per-project control-panel preferences. These are always scoped through workspace membership.
create table if not exists public.project_admin_preferences (
  project_id uuid primary key references public.projects(id) on delete cascade,
  enabled_modules jsonb not null default '{"overview":true,"submissions":true,"forms":true,"pages":true,"team":false,"integrations":false}'::jsonb,
  notification_email text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint project_admin_modules_object check (jsonb_typeof(enabled_modules) = 'object')
);
alter table public.project_admin_preferences enable row level security;
create policy "workspace members read project admin preferences"
on public.project_admin_preferences for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and private.is_workspace_member(p.workspace_id)
));
create policy "workspace editors manage project admin preferences"
on public.project_admin_preferences for insert to authenticated
with check (exists (
  select 1 from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id
  where p.id = project_id and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin','editor')
) and updated_by = (select auth.uid()));
create policy "workspace editors update project admin preferences"
on public.project_admin_preferences for update to authenticated
using (exists (
  select 1 from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id
  where p.id = project_id and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin','editor')
))
with check (exists (
  select 1 from public.projects p
  join public.workspace_members wm on wm.workspace_id = p.workspace_id
  where p.id = project_id and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin','editor')
) and updated_by = (select auth.uid()));
create index if not exists form_submissions_form_created_idx
on public.form_submissions(form_id, created_at desc);
