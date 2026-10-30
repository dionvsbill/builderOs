-- Remove duplicate and missing FK indexes found by the performance advisor.
drop index if exists public.form_submissions_form_created_idx;
create index if not exists project_admin_preferences_updated_by_idx on public.project_admin_preferences(updated_by);
create index if not exists project_smtp_settings_updated_by_idx on public.project_smtp_settings(updated_by);
create index if not exists published_pages_page_id_idx on public.published_pages(page_id);

-- Keep member SELECT policies separate from write policies.
drop policy if exists "workspace editors manage published site settings" on public.published_sites;
create policy "workspace editors insert published site settings" on public.published_sites
for insert to authenticated with check (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));
create policy "workspace editors update published site settings" on public.published_sites
for update to authenticated using (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
)) with check (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));
create policy "workspace editors delete published site settings" on public.published_sites
for delete to authenticated using (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));

drop policy if exists "workspace editors manage published pages" on public.published_pages;
create policy "workspace editors insert published pages" on public.published_pages
for insert to authenticated with check (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));
create policy "workspace editors update published pages" on public.published_pages
for update to authenticated using (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
)) with check (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));
create policy "workspace editors delete published pages" on public.published_pages
for delete to authenticated using (exists(
 select 1 from public.projects p join public.workspace_members wm on wm.workspace_id=p.workspace_id
 where p.id=project_id and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')
));