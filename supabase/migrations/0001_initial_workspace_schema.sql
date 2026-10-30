-- BuilderOS initial multi-tenant schema foundation
-- Apply through Supabase SQL editor after creating a project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  project_type text not null default 'website' check (project_type in ('website','form','store')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  path text not null default '/',
  document jsonb not null default '{"version":1,"children":[]}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(project_id, path)
);

create table if not exists public.page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  revision integer not null,
  document jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(page_id, revision)
);

create index if not exists projects_workspace_idx on public.projects(workspace_id);
create index if not exists pages_project_idx on public.pages(project_id);
create index if not exists page_revisions_page_idx on public.page_revisions(page_id, revision desc);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.pages enable row level security;
alter table public.page_revisions enable row level security;

create policy "profile self read" on public.profiles for select using (id = auth.uid());
create policy "profile self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profile self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "workspace members can read workspace" on public.workspaces for select using (public.is_workspace_member(id));
create policy "authenticated users can create workspace" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "workspace admins can update" on public.workspaces for update using (
  exists(select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid() and wm.role in ('owner','admin'))
);

create policy "members can read membership list" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "workspace owners can add members" on public.workspace_members for insert with check (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);
create policy "workspace owners can remove members" on public.workspace_members for delete using (
  exists(select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

create policy "workspace members can read projects" on public.projects for select using (public.is_workspace_member(workspace_id));
create policy "workspace editors can create projects" on public.projects for insert with check (
  public.is_workspace_member(workspace_id) and created_by = auth.uid()
);
create policy "workspace editors can update projects" on public.projects for update using (public.is_workspace_member(workspace_id));
create policy "workspace admins can delete projects" on public.projects for delete using (
  exists(select 1 from public.workspace_members wm where wm.workspace_id = workspace_id and wm.user_id = auth.uid() and wm.role in ('owner','admin'))
);

create policy "members can read pages" on public.pages for select using (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
);
create policy "members can create pages" on public.pages for insert with check (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
);
create policy "members can update pages" on public.pages for update using (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
);
create policy "members can read page revisions" on public.page_revisions for select using (
  exists(select 1 from public.pages pg join public.projects p on p.id = pg.project_id where pg.id = page_id and public.is_workspace_member(p.workspace_id))
);
create policy "members can create page revisions" on public.page_revisions for insert with check (
  exists(select 1 from public.pages pg join public.projects p on p.id = pg.project_id where pg.id = page_id and public.is_workspace_member(p.workspace_id))
);

-- Membership creation is intentionally a server-side onboarding transaction:
-- create workspace, insert owner membership, then create the starter project/page.
-- Do not grant clients direct access to service-role credentials.
