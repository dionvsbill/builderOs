import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSmtpPassword } from "@/lib/email/crypto";
export const runtime="nodejs";
export async function POST(_request:Request,{params}:{params:{projectId:string}}){
 const client=await createClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:project}=await client.from("projects").select("workspace_id").eq("id",params.projectId).maybeSingle();
 if(!project)return NextResponse.json({error:"Project not found."},{status:404});
 const {data:member}=await client.from("workspace_members").select("role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!member||!["owner","admin"].includes(member.role))return NextResponse.json({error:"Only workspace owners and administrators can test SMTP."},{status:403});
 const admin=createAdminClient();
 const {data:settings}=await admin.from("project_smtp_settings").select("host,port,secure,username,password_ciphertext,from_email").eq("project_id",params.projectId).maybeSingle();
 if(!settings)return NextResponse.json({error:"Save SMTP settings before testing."},{status:400});
 try{
  const transport=nodemailer.createTransport({host:settings.host,port:settings.port,secure:settings.secure,auth:{user:settings.username,pass:decryptSmtpPassword(settings.password_ciphertext)},connectionTimeout:12000,greetingTimeout:10000,socketTimeout:15000});
  try{await transport.verify();}finally{transport.close();}
  return NextResponse.json({success:true,message:"SMTP server connection and authentication succeeded."});
 }catch(error){
  const message=error instanceof Error?error.message.slice(0,240):"SMTP verification failed.";
  return NextResponse.json({error:"SMTP verification failed: "+message},{status:422});
 }
}