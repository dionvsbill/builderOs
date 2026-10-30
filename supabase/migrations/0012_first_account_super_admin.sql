-- Claim the one-time BuilderOS platform administrator slot for the designated first account.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.platform_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  claimed_at timestamptz not null default now()
);
revoke all on private.platform_admin from public, anon, authenticated;

create or replace function private.claim_initial_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'billphamous@gmail.com' then
    insert into private.platform_admin(singleton, user_id)
    values (true, new.id)
    on conflict (singleton) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.claim_initial_platform_admin() from public, anon, authenticated;
drop trigger if exists claim_initial_builderos_platform_admin on auth.users;
create trigger claim_initial_builderos_platform_admin
after insert on auth.users
for each row execute function private.claim_initial_platform_admin();
