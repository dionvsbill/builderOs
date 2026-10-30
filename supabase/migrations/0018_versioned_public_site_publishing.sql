create table if not exists public.published_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  public_slug text not null unique,
  custom_domain text unique,
  domain_verification_token text not null default encode(gen_random_bytes(24),'hex'),
  domain_verified_at timestamptz,
  ssl_status text not null default 'not_configured' check (ssl_status in ('not_configured','pending','active','failed')),
  status text not null default 'unpublished' check (status in ('published','unpublished')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.published_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  path text not null,
  name text not null,
  document jsonb not null,
  revision integer not null,
  published_at timestamptz not null default now(),
  unique(project_id,path)
);
create index if not exists published_pages_project_path_idx on public.published_pages(project_id,path);
alter table public.published_sites enable row level security;
alter table public.published_pages enable row level security;
create policy "workspace members read published site settings" on public.published_sites
for select to authenticated using (
 exists(select 1 from public.projects p where p.id=project_id and private.is_workspace_member(p.workspace_id))
);
create policy "workspace editors manage published site settings" on public.published_sites
for all to authenticated using (
 exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor'))
) with check (
 exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor'))
);
create policy "workspace members read published pages" on public.published_pages
for select to authenticated using (
 exists(select 1 from public.projects p where p.id=project_id and private.is_workspace_member(p.workspace_id))
);
create policy "workspace editors manage published pages" on public.published_pages
for all to authenticated using (
 exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor'))
) with check (
 exists(select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor'))
);