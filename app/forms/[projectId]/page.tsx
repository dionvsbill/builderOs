import { redirect,notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormBuilder } from "@/components/form-builder";
export const dynamic="force-dynamic";
export default async function FormsPage({params}:{params:{projectId:string}}){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name").eq("id",params.projectId).maybeSingle();
 if(!project)notFound();
 const {data:forms}=await supabase.from("forms").select("id,name,status,schema,settings,created_at").eq("project_id",project.id).order("created_at",{ascending:false});
 return <main style={{minHeight:"100vh",background:"#0b0e13",color:"#edf1f7",padding:"28px max(18px,calc((100vw - 1120px)/2)) 70px"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,borderBottom:"1px solid #293342",paddingBottom:18}}>
   <div><Link href={"/site-admin/"+project.id} style={{color:"#a9bcff",fontSize:12,textDecoration:"none"}}>← Site administration</Link><h1 style={{fontSize:27,margin:"13px 0 4px"}}>Form builder</h1><p style={{color:"#8f9caf",fontSize:12,margin:0}}>{project.name} · Build forms, publish them and manage responses.</p></div>
   <Link href={"/editor/"+project.id} style={{color:"#b9caff",fontSize:12}}>Open website editor</Link>
  </header>
  <FormBuilder projectId={project.id} initialForms={(forms??[]).map(form=>({id:form.id,name:form.name,status:form.status,schema:form.schema as {version:number;fields:Array<{id:string;type:string;label:string;required?:boolean;options?:string[]}>},settings:form.settings as Record<string,unknown>}))}/>
 </main>;
}