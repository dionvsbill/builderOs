-- Atomic first-workspace creation. SECURITY INVOKER keeps all table RLS policies active.
create or replace function public.create_starter_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := (select auth.uid());
  new_workspace_id uuid;
  new_project_id uuid;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if workspace_name is null or char_length(trim(workspace_name)) < 1 or char_length(workspace_name) > 120 then
    raise exception 'invalid_workspace_name' using errcode = '22023';
  end if;
  if workspace_slug is null or char_length(workspace_slug) < 1 or char_length(workspace_slug) > 60 then
    raise exception 'invalid_workspace_slug' using errcode = '22023';
  end if;

  insert into public.workspaces(name,slug,owner_id)
  values(trim(workspace_name),workspace_slug,actor_id)
  returning id into new_workspace_id;

  insert into public.workspace_members(workspace_id,user_id,role)
  values(new_workspace_id,actor_id,'owner');

  insert into public.projects(workspace_id,name,project_type,created_by)
  values(new_workspace_id,'My first website','website',actor_id)
  returning id into new_project_id;

  insert into public.pages(project_id,name,path,revision,document,updated_by)
  values(new_project_id,'Home','/',1,
    jsonb_build_object('version',1,'children',jsonb_build_array(
      jsonb_build_object('id','hero-title','type','heading','content','Make your next big idea real.'),
      jsonb_build_object('id','hero-copy','type','text','content','A beautiful starting point for your business.'),
      jsonb_build_object('id','hero-button','type','button','content','Get started')
    )),actor_id);

  return new_project_id;
end;
$$;

revoke all on function public.create_starter_workspace(text,text) from public, anon;
grant execute on function public.create_starter_workspace(text,text) to authenticated;
