import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSmtpPassword } from "@/lib/email/crypto";
export const runtime="nodejs";
async function authorized(projectId:string){
 const client=await createClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return {error:"Authentication required.",status:401 as const};
 const {data:project}=await client.from("projects").select("id,workspace_id").eq("id",projectId).maybeSingle();
 if(!project)return {error:"Project not found.",status:404 as const};
 const {data:membership}=await client.from("workspace_members").select("role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!membership||!["owner","admin"].includes(membership.role))return {error:"Only workspace owners and administrators can configure SMTP.",status:403 as const};
 return {client,user,project};
}
export async function GET(_request:Request,{params}:{params:{projectId:string}}){
 const access=await authorized(params.projectId);if("error" in access)return NextResponse.json({error:access.error},{status:access.status});
 const admin=createAdminClient();const {data}=await admin.from("project_smtp_settings").select("host,port,secure,username,from_email,from_name,enabled,updated_at").eq("project_id",params.projectId).maybeSingle();
 return NextResponse.json({settings:data?{...data,passwordConfigured:true}:null});
}
export async function PUT(request:Request,{params}:{params:{projectId:string}}){
 const access=await authorized(params.projectId);if("error" in access)return NextResponse.json({error:access.error},{status:access.status});
 const body=await request.json().catch(()=>null) as {host?:string;port?:number;secure?:boolean;username?:string;password?:string;fromEmail?:string;fromName?:string;enabled?:boolean}|null;
 if(!body||typeof body.host!=="string"||body.host.trim().length<3||body.host.length>255||!Number.isInteger(body.port)||Number(body.port)<1||Number(body.port)>65535||typeof body.username!=="string"||!body.username.trim()||typeof body.fromEmail!=="string"||!/^\\S+@\\S+\\.\\S+$/.test(body.fromEmail)||typeof body.secure!=="boolean"||typeof body.enabled!=="boolean")
  return NextResponse.json({error:"Complete the SMTP host, port, username, sender email and connection settings."},{status:400});
 const admin=createAdminClient();
 const {data:existing}=await admin.from("project_smtp_settings").select("password_ciphertext").eq("project_id",params.projectId).maybeSingle();
 let passwordCiphertext=existing?.password_ciphertext??"";
 if(body.password){if(body.password.length>500) return NextResponse.json({error:"SMTP password is too long."},{status:400});try{passwordCiphertext=encryptSmtpPassword(body.password);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Encryption is unavailable."},{status:503});}}
 if(!passwordCiphertext)return NextResponse.json({error:"Enter the SMTP password to save the connection."},{status:400});
 const {error}=await admin.from("project_smtp_settings").upsert({
  project_id:params.projectId,host:body.host.trim(),port:Number(body.port),secure:body.secure,username:body.username.trim(),
  password_ciphertext:passwordCiphertext,from_email:body.fromEmail.trim(),from_name:body.fromName?.trim().slice(0,120)||null,
  enabled:body.enabled,updated_by:access.user.id,updated_at:new Date().toISOString()
 },{onConflict:"project_id"});
 if(error){console.error("SMTP settings save failed",error.message);return NextResponse.json({error:"SMTP settings could not be saved."},{status:500});}
 return NextResponse.json({success:true,passwordConfigured:true});
}
export async function DELETE(_request:Request,{params}:{params:{projectId:string}}){
 const access=await authorized(params.projectId);if("error" in access)return NextResponse.json({error:access.error},{status:access.status});
 const admin=createAdminClient();const {error}=await admin.from("project_smtp_settings").delete().eq("project_id",params.projectId);
 if(error)return NextResponse.json({error:"SMTP settings could not be removed."},{status:500});
 return NextResponse.json({success:true});
}