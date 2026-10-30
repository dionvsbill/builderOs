create table if not exists public.project_smtp_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  host text not null check (char_length(host) between 1 and 255),
  port integer not null default 587 check (port between 1 and 65535),
  secure boolean not null default false,
  username text not null check (char_length(username) between 1 and 255),
  password_ciphertext text not null,
  from_email text not null check (char_length(from_email) between 3 and 320),
  from_name text,
  enabled boolean not null default true,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.project_smtp_settings enable row level security;
create policy "workspace owners and admins read project SMTP settings"
on public.project_smtp_settings for select to authenticated
using (exists (
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')
));
create policy "workspace owners and admins insert project SMTP settings"
on public.project_smtp_settings for insert to authenticated
with check (exists (
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')
) and updated_by=(select auth.uid()));
create policy "workspace owners and admins update project SMTP settings"
on public.project_smtp_settings for update to authenticated
using (exists (
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')
))
with check (exists (
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')
) and updated_by=(select auth.uid()));