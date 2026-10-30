import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
export async function PATCH(request:Request,{params}:{params:{projectId:string;pageId:string}}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const body=await request.json().catch(()=>null) as {name?:string;path?:string}|null;
 if(!body||typeof body.name!=="string"||!body.name.trim()||body.name.length>80||typeof body.path!=="string")return NextResponse.json({error:"Invalid page details."},{status:400});
 const path=body.path==="/"?"/":"/"+body.path.trim().replace(/^\/+|\/+$/g,"").toLowerCase().replace(/[^a-z0-9/-]+/g,"-").replace(/-+/g,"-");
 if(path.length>120||path.includes("//")||path.split("/").some(part=>part===".."||part==="."))return NextResponse.json({error:"Invalid page path."},{status:400});
 const {data,error}=await supabase.from("pages").update({name:body.name.trim(),path,updated_by:user.id,updated_at:new Date().toISOString()}).eq("id",params.pageId).eq("project_id",params.projectId).select("id,name,path").maybeSingle();
 if(error||!data)return NextResponse.json({error:error?.code==="23505"?"That page path is already in use.":"Page could not be updated."},{status:400});
 return NextResponse.json({page:data});
}