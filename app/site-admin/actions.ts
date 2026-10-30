"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const allowed=["overview","submissions","forms","pages","team","integrations"] as const;
export async function saveProjectAdminFeatures(formData:FormData){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) redirect("/login");
 const projectId=String(formData.get("projectId")??"");
 if(!projectId) throw new Error("Missing project.");
 const enabled=Object.fromEntries(allowed.map(key=>[key,formData.get(key)==="on"]));
 const notificationEmail=String(formData.get("notificationEmail")??"").trim().slice(0,254);
 if(notificationEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) throw new Error("Enter a valid notification email.");
 const {error:saveError}=await supabase.from("project_admin_preferences").upsert({project_id:projectId,enabled_modules:enabled,notification_email:notificationEmail||null,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"project_id"});
 if(saveError) throw new Error("Could not save site admin settings: "+saveError.message);
 redirect("/site-admin/"+projectId+"?saved=1");
}