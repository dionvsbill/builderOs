import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
const normalizePath=(value:string)=>"/"+value.trim().replace(/^\/+|\/+$/g,"").toLowerCase().replace(/[^a-z0-9/-]+/g,"-").replace(/-+/g,"-");
export async function POST(request:Request,{params}:{params:{projectId:string}}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const body=await request.json().catch(()=>null) as {name?:string;path?:string}|null;
 if(!body||typeof body.name!=="string"||!body.name.trim()||body.name.length>80||typeof body.path!=="string"||!body.path.trim())
  return NextResponse.json({error:"Enter a page name and URL path."},{status:400});
 const {data:project}=await supabase.from("projects").select("id,workspace_id").eq("id",params.projectId).maybeSingle();
 if(!project)return NextResponse.json({error:"Project not found or access denied."},{status:404});
 const {data:member}=await supabase.from("workspace_members").select("role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!member||!["owner","admin","editor"].includes(member.role))return NextResponse.json({error:"You do not have permission to create pages."},{status:403});
 const path=normalizePath(body.path);
 if(path==="/"||path.length>120||path.includes("//")||path.split("/").some(part=>part===".."||part==="."))return NextResponse.json({error:"Choose a valid unique page path such as /about."},{status:400});
 const {data,error}=await supabase.from("pages").insert({project_id:project.id,name:body.name.trim(),path,document:{version:1,children:[]},revision:1,updated_by:user.id}).select("id,name,path,revision").single();
 if(error)return NextResponse.json({error:error.code==="23505"?"That page path is already in use.":"Page could not be created."},{status:400});
 return NextResponse.json({page:data},{status:201});
}