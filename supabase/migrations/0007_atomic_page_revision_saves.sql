-- Atomic, optimistic-concurrency page saves with a durable revision snapshot.
create or replace function public.save_page_revision(
  target_page_id uuid,
  expected_revision integer,
  next_document jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_revision integer;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if jsonb_typeof(next_document) <> 'object' then
    raise exception 'invalid_document' using errcode = '22023';
  end if;

  update public.pages
  set document = next_document,
      revision = revision + 1,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = target_page_id
    and revision = expected_revision
  returning revision into new_revision;

  if new_revision is null then
    raise exception 'revision_conflict' using errcode = '40001';
  end if;

  insert into public.page_revisions(page_id, revision, document, created_by)
  values (target_page_id, new_revision, next_document, (select auth.uid()));

  return new_revision;
end;
$$;

revoke all on function public.save_page_revision(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_page_revision(uuid, integer, jsonb) to authenticated;
