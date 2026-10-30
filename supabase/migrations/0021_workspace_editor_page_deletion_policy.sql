create policy "workspace editors can delete pages"
on public.pages for delete to authenticated
using (exists(
 select 1 from public.projects p
 join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));