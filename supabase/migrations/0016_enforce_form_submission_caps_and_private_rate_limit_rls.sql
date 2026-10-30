alter table private.form_submission_rate_limits enable row level security;

create or replace function public.consume_form_submission_rate_limit(
  target_form_id uuid,
  target_ip_hash text,
  max_submissions integer default 5,
  window_seconds integer default 900
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean := false;
  cap integer;
  existing_count bigint;
begin
  select f.submission_limit into cap
  from public.forms f
  where f.id = target_form_id and f.status = 'published'
  for update;
  if not found then return false; end if;

  if cap is not null then
    select count(*) into existing_count
    from public.form_submissions s where s.form_id = target_form_id;
    if existing_count >= cap then return false; end if;
  end if;

  insert into private.form_submission_rate_limits(form_id, ip_hash, window_started_at, submission_count, updated_at)
  values (target_form_id, target_ip_hash, now(), 1, now())
  on conflict (form_id, ip_hash) do update
    set window_started_at = case
          when private.form_submission_rate_limits.window_started_at < now() - make_interval(secs => greatest(window_seconds, 60))
          then now() else private.form_submission_rate_limits.window_started_at end,
        submission_count = case
          when private.form_submission_rate_limits.window_started_at < now() - make_interval(secs => greatest(window_seconds, 60))
          then 1 else private.form_submission_rate_limits.submission_count + 1 end,
        updated_at = now()
  returning submission_count <= greatest(max_submissions, 1) into allowed;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.consume_form_submission_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_form_submission_rate_limit(uuid, text, integer, integer) to service_role;