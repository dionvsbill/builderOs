-- Atomic project creation for an existing workspace.
create or replace function public.create_workspace_project(
  target_workspace_id uuid,
  project_name text,
  target_project_type text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := (select auth.uid());
  new_project_id uuid;
  new_page_id uuid;
  starter_document jsonb := jsonb_build_object('version',1,'children',jsonb_build_array(
    jsonb_build_object('id','hero-title','type','heading','content','Make your next big idea real.'),
    jsonb_build_object('id','hero-copy','type','text','content','A beautiful starting point for your business.'),
    jsonb_build_object('id','hero-button','type','button','content','Get started')
  ));
begin
  if actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if project_name is null or char_length(trim(project_name))<1 or char_length(project_name)>120 then raise exception 'invalid_project_name' using errcode='22023'; end if;
  if target_project_type not in ('website','form','store') then raise exception 'invalid_project_type' using errcode='22023'; end if;
  if not exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace_id and wm.user_id=actor_id and wm.role in ('owner','admin','editor')) then
    raise exception 'workspace_permission_denied' using errcode='42501';
  end if;

  insert into public.projects(workspace_id,name,project_type,created_by)
  values(target_workspace_id,trim(project_name),target_project_type,actor_id)
  returning id into new_project_id;
  insert into public.pages(project_id,name,path,revision,document,updated_by)
  values(new_project_id,'Home','/',1,starter_document,actor_id)
  returning id into new_page_id;
  insert into public.page_revisions(page_id,revision,document,created_by)
  values(new_page_id,1,starter_document,actor_id);
  return new_project_id;
end;
$$;

revoke all on function public.create_workspace_project(uuid,text,text) from public, anon;
grant execute on function public.create_workspace_project(uuid,text,text) to authenticated;
