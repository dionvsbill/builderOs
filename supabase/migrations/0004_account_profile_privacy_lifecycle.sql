-- BuilderOS account, profile, privacy and lifecycle settings.
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists full_name text,
  add column if not exists website text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists timezone text not null default 'Africa/Accra',
  add column if not exists locale text not null default 'en',
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  product_updates boolean not null default true,
  security_alerts boolean not null default true,
  submission_notifications boolean not null default true,
  weekly_summary boolean not null default false,
  marketing_emails boolean not null default false,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'requested' check (status in ('requested','reviewing','scheduled','completed','cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id)
);

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','processing','ready','expired','failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  download_expires_at timestamptz,
  download_path text
);

create table if not exists public.account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_activity_user_created_idx on public.account_activity(user_id, created_at desc);
create index if not exists export_requests_user_created_idx on public.data_export_requests(user_id, requested_at desc);

alter table public.user_preferences enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.account_activity enable row level security;

create policy "user reads own preferences" on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "user inserts own preferences" on public.user_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user updates own preferences" on public.user_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "user reads own deletion request" on public.account_deletion_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "user creates own deletion request" on public.account_deletion_requests for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user cancels own deletion request" on public.account_deletion_requests for update to authenticated using (user_id = (select auth.uid()) and status = 'requested') with check (user_id = (select auth.uid()) and status = 'cancelled');

create policy "user reads own export requests" on public.data_export_requests for select to authenticated using (user_id = (select auth.uid()));
create policy "user creates own export requests" on public.data_export_requests for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user reads own activity" on public.account_activity for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.handle_new_builderos_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name',''), nullif(new.raw_user_meta_data ->> 'display_name',''))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_builderos on auth.users;
create trigger on_auth_user_created_builderos after insert on auth.users
for each row execute function public.handle_new_builderos_user();
revoke execute on function public.handle_new_builderos_user() from public, anon, authenticated;

insert into public.profiles (id, display_name, full_name)
select id, nullif(raw_user_meta_data ->> 'display_name',''), nullif(raw_user_meta_data ->> 'display_name','')
from auth.users on conflict (id) do nothing;
insert into public.user_preferences (user_id)
select id from auth.users on conflict (user_id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('builderos-avatars','builderos-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "users read own BuilderOS avatars" on storage.objects for select to authenticated
using (bucket_id = 'builderos-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users upload own BuilderOS avatars" on storage.objects for insert to authenticated
with check (bucket_id = 'builderos-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own BuilderOS avatars" on storage.objects for update to authenticated
using (bucket_id = 'builderos-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'builderos-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own BuilderOS avatars" on storage.objects for delete to authenticated
using (bucket_id = 'builderos-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
