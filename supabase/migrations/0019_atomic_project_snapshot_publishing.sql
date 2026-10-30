create or replace function public.publish_project_snapshot(
  target_project_id uuid,
  target_public_slug text,
  snapshots jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(snapshots) <> 'array' or jsonb_array_length(snapshots) > 100 then
    raise exception 'invalid_snapshot_payload';
  end if;
  insert into public.published_sites(project_id,public_slug,status,published_at,updated_at)
  values(target_project_id,target_public_slug,'published',now(),now())
  on conflict(project_id) do update
    set status='published',published_at=now(),updated_at=now();
  delete from public.published_pages where project_id=target_project_id;
  insert into public.published_pages(project_id,page_id,path,name,document,revision,published_at)
  select target_project_id, x.page_id, x.path, x.name, x.document, x.revision, now()
  from jsonb_to_recordset(snapshots) as x(page_id uuid,path text,name text,document jsonb,revision integer);
end;
$$;
revoke all on function public.publish_project_snapshot(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.publish_project_snapshot(uuid,text,jsonb) to service_role;