import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime="nodejs";
const makeSlug=(name:string)=>name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,36)||"site";
export async function POST(_request:Request,{params}:{params:{projectId:string}}){
 const userClient=await createClient();const {data:{user}}=await userClient.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:project}=await userClient.from("projects").select("id,name").eq("id",params.projectId).maybeSingle();
 if(!project)return NextResponse.json({error:"Project not found or access denied."},{status:404});
 const {data:pages,error:pagesError}=await userClient.from("pages").select("id,name,path,document,revision").eq("project_id",project.id).order("path");
 if(pagesError||!pages?.length)return NextResponse.json({error:"Add at least one page before publishing."},{status:400});
 if(pages.length>100)return NextResponse.json({error:"A site can currently publish up to 100 pages."},{status:413});
 const admin=createAdminClient();
 const {data:existing}=await admin.from("published_sites").select("public_slug").eq("project_id",project.id).maybeSingle();
 const slug=existing?.public_slug??(makeSlug(project.name)+"-"+randomBytes(3).toString("hex"));
 const snapshots=pages.map(page=>({page_id:page.id,path:page.path,name:page.name,document:page.document,revision:page.revision}));
 const {error}=await admin.rpc("publish_project_snapshot",{target_project_id:project.id,target_public_slug:slug,snapshots});
 if(error){console.error("BuilderOS publish failed",error.message);return NextResponse.json({error:"Publishing failed. Check the project pages and try again."},{status:500});}
 const origin=process.env.NEXT_PUBLIC_SITE_URL??new URL(_request.url).origin;
 return NextResponse.json({success:true,url:origin+"/s/"+slug,slug,pages:pages.length,publishedAt:new Date().toISOString()});
}
export async function DELETE(_request:Request,{params}:{params:{projectId:string}}){
 const userClient=await createClient();const {data:{user}}=await userClient.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:project}=await userClient.from("projects").select("id").eq("id",params.projectId).maybeSingle();
 if(!project)return NextResponse.json({error:"Project not found or access denied."},{status:404});
 const admin=createAdminClient();
 const {error}=await admin.from("published_sites").update({status:"unpublished",updated_at:new Date().toISOString()}).eq("project_id",project.id);
 if(error)return NextResponse.json({error:"Unable to unpublish this site."},{status:500});
 return NextResponse.json({success:true});
}