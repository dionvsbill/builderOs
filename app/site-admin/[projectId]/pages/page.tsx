import { redirect,notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PagesManager } from "@/components/pages-manager";
export const dynamic="force-dynamic";
export default async function ProjectPagesPage({params}:{params:{projectId:string}}){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name").eq("id",params.projectId).maybeSingle();
 if(!project)notFound();
 const {data:pages}=await supabase.from("pages").select("id,name,path,revision").eq("project_id",project.id).order("path");
 return <main style={{minHeight:"100vh",background:"#0b0e13",color:"#edf1f7",padding:"30px max(18px,calc((100vw - 1100px)/2))"}}>
  <Link href={"/site-admin/"+project.id} style={{fontSize:12,color:"#a9bcff",textDecoration:"none"}}>← Site administration</Link>
  <h1 style={{fontSize:28,margin:"15px 0 4px"}}>Page manager</h1><p style={{fontSize:12,color:"#8f9caf",margin:0}}>{project.name} · Create and organize the pages of your website.</p>
  <PagesManager projectId={project.id} initialPages={pages??[]}/>
 </main>;
}