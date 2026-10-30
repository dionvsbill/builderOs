import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStarterWorkspace, createProject } from "./actions";
import { Layers3, Globe2, FileText, ShoppingBag, ArrowUpRight, Plus, LogOut, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members")
    .select("workspace_id, role, workspaces(id,name,slug,created_at)")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  const workspaceRows = (memberships ?? []).flatMap((item) => {
    const workspace = item.workspaces;
    return workspace && !Array.isArray(workspace) ? [{ ...workspace, role: item.role }] : [];
  });
  const workspaceIds = workspaceRows.map((workspace) => workspace.id);
  const { data: projects } = workspaceIds.length
    ? await supabase.from("projects").select("id,name,project_type,updated_at,workspace_id").in("workspace_id",workspaceIds).order("updated_at",{ascending:false})
    : { data: [] };
  const creatableWorkspaces = workspaceRows.filter((workspace) => ["owner", "admin", "editor"].includes(workspace.role));
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Builder";
  return <main className="dash-shell">
    <header className="dash-top"><Link className="dash-brand" href="/dashboard"><span><Layers3 size={19}/></span>builder<span>OS</span></Link><div className="dash-user"><span>{user.email}</span><Link href="/settings" aria-label="Account settings" className="dash-settings-link"><Settings size={16}/></Link><form action={async()=>{"use server";const client=await createClient();await client.auth.signOut();redirect("/login");}}><button aria-label="Sign out"><LogOut size={16}/></button></form></div></header>
    <section className="dash-content">
      <div className="dash-welcome"><div><div className="auth-eyebrow">YOUR WORKSPACE</div><h1>Good to see you, {displayName}.</h1><p>Your next idea starts here. Create a project or jump back into your work.</p></div></div>
      <div className="dash-section-title"><div><h2>Your projects</h2><p>Websites, forms and stores in one place.</p></div><span>{projects?.length ?? 0} projects</span></div>
      {workspaceRows.length===0?<div className="dash-empty"><div className="dash-empty-icon"><Layers3 size={25}/></div><h3>Create your first workspace</h3><p>Your workspace keeps your projects, team and settings together.</p><form action={createStarterWorkspace}><input name="workspaceName" aria-label="Workspace name" placeholder="Workspace name" defaultValue="My workspace" maxLength={120}/><button><Plus size={16}/> Create workspace</button></form></div>:<div className="dash-grid">
        {(projects??[]).map(project=><article className="project-card" key={project.id}><div className="project-card-icon">{project.project_type==="website"?<Globe2 size={20}/>:project.project_type==="form"?<FileText size={20}/>:<ShoppingBag size={20}/>}</div><div className="project-card-type">{project.project_type}</div><h3>{project.name}</h3><p>Updated {new Date(project.updated_at).toLocaleDateString()}</p><Link href={`/editor/${project.id}`} aria-label={`Open ${project.name}`}>Open editor <ArrowUpRight size={15}/></Link></article>)}
        {creatableWorkspaces.length>0?<form className="dash-new-project dash-new-project-form" action={createProject}><strong>New project</strong><select name="workspaceId" aria-label="Workspace" required>{creatableWorkspaces.map(workspace=><option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><input name="projectName" aria-label="Project name" placeholder="Project name" defaultValue="My new website" maxLength={120} required/><select name="projectType" aria-label="Project type"><option value="website">Website</option><option value="form">Form project</option><option value="store">Online store</option></select><button type="submit"><Plus size={14}/> Create project</button></form>:<div className="dash-new-project"><strong>Project creation unavailable</strong><span>You need editor or admin access in a workspace.</span></div>}
      </div>}
      <div className="dash-workspace-list"><h2>Workspaces</h2>{workspaceRows.map(workspace=><div key={workspace.id}><span>{workspace.name}</span><small>{workspace.role}</small></div>)}</div>
    </section>
  </main>;
}
