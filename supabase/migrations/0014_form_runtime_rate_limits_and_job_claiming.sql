-- Form runtime: bounded public submissions and safely claimed email jobs.
create table if not exists private.form_submission_rate_limits (
  form_id uuid not null references public.forms(id) on delete cascade,
  ip_hash text not null,
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0 check (submission_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (form_id, ip_hash)
);
revoke all on private.form_submission_rate_limits from public, anon, authenticated;
grant all on private.form_submission_rate_limits to service_role;
create or replace function private.consume_form_submission_rate_limit(target_form_id uuid, target_ip_hash text, max_submissions integer default 5, window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean := false;
begin
  insert into private.form_submission_rate_limits(form_id, ip_hash, window_started_at, submission_count, updated_at)
  values (target_form_id, target_ip_hash, now(), 1, now())
  on conflict (form_id, ip_hash) do update
    set window_started_at = case when private.form_submission_rate_limits.window_started_at < now() - make_interval(secs => greatest(window_seconds, 60)) then now() else private.form_submission_rate_limits.window_started_at end,
        submission_count = case when private.form_submission_rate_limits.window_started_at < now() - make_interval(secs => greatest(window_seconds, 60)) then 1 else private.form_submission_rate_limits.submission_count + 1 end,
        updated_at = now()
  returning submission_count <= greatest(max_submissions, 1) into allowed;
  return coalesce(allowed, false);
end; $$;
revoke all on function private.consume_form_submission_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function private.consume_form_submission_rate_limit(uuid, text, integer, integer) to service_role;
create or replace function private.claim_due_email_delivery_jobs(batch_size integer default 10)
returns setof public.email_delivery_jobs language sql security definer set search_path = '' as $$
  with due as (
    select id from public.email_delivery_jobs where status in ('queued','retry') and next_attempt_at <= now() and attempts < 6
    order by next_attempt_at, created_at for update skip locked limit greatest(least(batch_size,50),1)
  )
  update public.email_delivery_jobs j set status='sending', attempts=j.attempts+1 from due where j.id=due.id returning j.*;
$$;
revoke all on function private.claim_due_email_delivery_jobs(integer) from public, anon, authenticated;
grant execute on function private.claim_due_email_delivery_jobs(integer) to service_role;
create index if not exists email_jobs_claim_idx on public.email_delivery_jobs(status,next_attempt_at,created_at) where status in ('queued','retry');