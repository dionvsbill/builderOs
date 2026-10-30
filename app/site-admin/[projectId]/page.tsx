import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Layers3, ArrowLeft, Inbox, FileText, Globe2, Settings2, ExternalLink } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function SiteAdminPage({params}:{params:{projectId:string}}) {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name,project_type").eq("id",params.projectId).maybeSingle();
 if(!project) notFound();
 const [{data:forms},{data:preferences}]=await Promise.all([
  supabase.from("forms").select("id,name,status,created_at").eq("project_id",project.id).order("created_at",{ascending:false}),
  supabase.from("project_admin_preferences").select("enabled_modules").eq("project_id",project.id).maybeSingle()
 ]);
 const ids=(forms??[]).map(f=>f.id);
 const {data:submissions}=ids.length?await supabase.from("form_submissions").select("id,form_id,submitter_email,status,created_at,payload").in("form_id",ids).order("created_at",{ascending:false}).limit(50):{data:[]};
 const enabled=(preferences?.enabled_modules??{}) as Record<string,boolean>;
 const modules=["overview","submissions","forms","pages","team","integrations"];
 return <main className="site-admin-shell">
  <header className="site-admin-top"><Link className="dash-brand" href="/dashboard"><span><Layers3 size={18}/></span>builder<span>OS</span></Link><Link href="/dashboard" className="site-admin-back"><ArrowLeft size={15}/> All projects</Link></header>
  <div className="site-admin-layout">
   <aside className="site-admin-sidebar"><div className="site-admin-label">SITE CONTROL PANEL</div><h1>{project.name}</h1><p>Manage your website, forms and incoming activity.</p><nav><a className="active" href="#overview"><Globe2 size={16}/> Overview</a><a href="#submissions"><Inbox size={16}/> Submissions <b>{submissions?.length??0}</b></a><a href="#forms"><FileText size={16}/> Forms</a><a href="#modules"><Settings2 size={16}/> Admin features</a></nav><Link className="site-admin-editor-link" href={`/editor/${project.id}`}>Open visual editor <ExternalLink size={14}/></Link></aside>
   <section className="site-admin-main">
    <div className="site-admin-heading" id="overview"><div><span className="site-admin-label">PROJECT ADMINISTRATION</span><h2>Website dashboard</h2><p>Private administration for this website.</p></div><span className="site-admin-project-type">{project.project_type}</span></div>
    <div className="site-admin-stats"><article><span>Forms</span><strong>{forms?.length??0}</strong><small>Created in this project</small></article><article><span>Recent submissions</span><strong>{submissions?.length??0}</strong><small>Latest 50 received</small></article><article><span>Published forms</span><strong>{(forms??[]).filter(f=>f.status==="published").length}</strong><small>Accepting responses</small></article></div>
    <section className="site-admin-card" id="submissions"><div className="site-admin-card-head"><div><h3>Recent form submissions</h3><p>Visitor responses received through this website.</p></div><span className="site-admin-count">{submissions?.length??0} shown</span></div>
    {!submissions?.length?<div className="site-admin-empty"><Inbox size={24}/><strong>No submissions yet</strong><p>Responses will appear here when visitors submit your published forms.</p></div>:<div className="site-admin-table-wrap"><table className="site-admin-table"><thead><tr><th>Received</th><th>Form</th><th>Submitter</th><th>Status</th><th>Response</th></tr></thead><tbody>{submissions.map(s=><tr key={s.id}><td>{new Date(s.created_at).toLocaleString()}</td><td>{forms?.find(f=>f.id===s.form_id)?.name??"Form"}</td><td>{s.submitter_email??"Not provided"}</td><td><span className="site-admin-status">{s.status}</span></td><td><details><summary>View data</summary><pre>{JSON.stringify(s.payload,null,2)}</pre></details></td></tr>)}</tbody></table></div>}</section>
    <section className="site-admin-card" id="forms"><div className="site-admin-card-head"><div><h3>Your forms</h3><p>Forms connected to this website.</p></div></div>{!forms?.length?<p className="site-admin-muted">No forms have been created for this project yet.</p>:<div className="site-admin-form-list">{forms.map(f=><div key={f.id}><FileText size={17}/><span><strong>{f.name}</strong><small>Created {new Date(f.created_at).toLocaleDateString()}</small></span><em>{f.status}</em></div>)}</div>}</section>
    <section className="site-admin-card" id="modules"><div className="site-admin-card-head"><div><h3>Admin page features</h3><p>Module availability is shown per website. Modules marked unavailable are not represented as working features.</p></div></div><div className="site-admin-module-grid">{modules.map(m=><div key={m}><span><strong>{m[0].toUpperCase()+m.slice(1)}</strong><small>{m==="submissions"?"Incoming form responses":m==="integrations"?"Email, webhooks and external services":m==="team"?"Site administrators and collaborators":"Website control panel section"}</small></span><em className={enabled[m]===false?"off":""}>{enabled[m]===false?"Hidden":"Enabled"}</em></div>)}</div></section>
   </section>
  </div>
 </main>;
}