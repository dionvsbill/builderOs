import { redirect,notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SmtpSettings } from "@/components/smtp-settings";
export const dynamic="force-dynamic";
export default async function ProjectEmailSettings({params}:{params:{projectId:string}}){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name,workspace_id").eq("id",params.projectId).maybeSingle();
 if(!project)notFound();
 const {data:membership}=await supabase.from("workspace_members").select("role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!membership||!["owner","admin"].includes(membership.role))notFound();
 return <main style={{minHeight:"100vh",background:"#0b0e13",color:"#edf1f7",padding:"35px max(18px,calc((100vw - 900px)/2))"}}>
  <Link href={"/site-admin/"+project.id} style={{fontSize:12,color:"#a9bcff",textDecoration:"none"}}>← Site administration</Link>
  <h1 style={{fontSize:28,margin:"17px 0 5px"}}>Email delivery</h1>
  <p style={{fontSize:12,color:"#8f9caf",margin:"0 0 26px"}}>{project.name} · Configure the SMTP account used to deliver this website's form notifications.</p>
  <section style={{background:"#111923",border:"1px solid #2b3747",borderRadius:12,padding:22}}><SmtpSettings projectId={project.id}/></section>
 </main>;
}