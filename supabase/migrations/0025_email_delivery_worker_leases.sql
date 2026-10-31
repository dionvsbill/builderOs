alter table public.email_delivery_jobs
  add column if not exists claimed_at timestamptz;

create or replace function public.claim_due_email_delivery_jobs(batch_size integer default 10)
returns setof public.email_delivery_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Recover jobs abandoned by a crashed or timed-out worker.
  update public.email_delivery_jobs
  set status = case when attempts >= 6 then 'failed' else 'retry' end,
      next_attempt_at = case when attempts >= 6 then next_attempt_at else now() end,
      claimed_at = null,
      last_error = coalesce(last_error, 'Delivery worker lease expired.')
  where status = 'sending'
    and claimed_at is not null
    and claimed_at < now() - interval '15 minutes';

  return query
  with due as (
    select id
    from public.email_delivery_jobs
    where status in ('queued', 'retry')
      and next_attempt_at <= now()
      and attempts < 6
    order by next_attempt_at, created_at
    for update skip locked
    limit greatest(least(batch_size, 50), 1)
  )
  update public.email_delivery_jobs j
  set status = 'sending',
      attempts = j.attempts + 1,
      claimed_at = now()
  from due
  where j.id = due.id
  returning j.*;
end;
$$;

revoke all on function public.claim_due_email_delivery_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_email_delivery_jobs(integer) to service_role;