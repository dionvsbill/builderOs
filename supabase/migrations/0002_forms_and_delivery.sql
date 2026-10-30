-- BuilderOS forms, submissions and durable email delivery records.
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  access_key_hash text not null unique,
  schema jsonb not null default '{"version":1,"fields":[]}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  submission_limit integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  payload jsonb not null,
  submitter_email text,
  ip_hash text,
  user_agent text,
  status text not null default 'received' check (status in ('received','processing','completed','rejected','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  storage_bucket text not null default 'submission-files',
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create table if not exists public.email_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  recipient text not null,
  template jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sending','sent','retry','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists forms_project_idx on public.forms(project_id);
create index if not exists submissions_form_created_idx on public.form_submissions(form_id, created_at desc);
create index if not exists email_jobs_due_idx on public.email_delivery_jobs(status, next_attempt_at);

alter table public.forms enable row level security;
alter table public.form_submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.email_delivery_jobs enable row level security;

create policy "workspace members read forms" on public.forms for select using (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
);
create policy "workspace members manage forms" on public.forms for all using (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
) with check (
  exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id))
);

create policy "workspace members read submissions" on public.form_submissions for select using (
  exists(select 1 from public.forms f join public.projects p on p.id = f.project_id where f.id = form_id and public.is_workspace_member(p.workspace_id))
);
create policy "workspace members read submission files" on public.submission_files for select using (
  exists(select 1 from public.form_submissions s join public.forms f on f.id = s.form_id join public.projects p on p.id = f.project_id where s.id = submission_id and public.is_workspace_member(p.workspace_id))
);
create policy "workspace members read delivery jobs" on public.email_delivery_jobs for select using (
  exists(select 1 from public.form_submissions s join public.forms f on f.id = s.form_id join public.projects p on p.id = f.project_id where s.id = submission_id and public.is_workspace_member(p.workspace_id))
);

-- Public form submissions and email worker writes must use server-side service-role
-- operations after validating the hashed access key, form status, rate limits,
-- field schema, upload metadata and tenant usage limits. No anonymous table
-- insert policy is intentionally provided.
