import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
type Context={params:{projectId:string;pageId:string}};
async function authorizedPage(projectId:string,pageId:string){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return {response:NextResponse.json({error:"Authentication required."},{status:401})};
 const {data:page,error:pageError}=await supabase.from("pages").select("id").eq("id",pageId).eq("project_id",projectId).maybeSingle();
 if(pageError||!page)return {response:NextResponse.json({error:"Page not found or access denied."},{status:404})};
 return {supabase};
}
export async function GET(_request:Request,{params}:Context){
 const access=await authorizedPage(params.projectId,params.pageId);
 if("response" in access)return access.response;
 const {data,error}=await access.supabase.from("page_revisions").select("id,revision,created_at,created_by").eq("page_id",params.pageId).order("revision",{ascending:false}).limit(50);
 if(error)return NextResponse.json({error:"Could not load revision history."},{status:500});
 return NextResponse.json({revisions:data??[]});
}
export async function POST(request:Request,{params}:Context){
 const access=await authorizedPage(params.projectId,params.pageId);
 if("response" in access)return access.response;
 const body=await request.json().catch(()=>null) as {revisionId?:string;expectedRevision?:number}|null;
 if(!body||typeof body.revisionId!=="string"||typeof body.expectedRevision!=="number"||!Number.isInteger(body.expectedRevision))return NextResponse.json({error:"Invalid restore request."},{status:400});
 const {data:snapshot,error:snapshotError}=await access.supabase.from("page_revisions").select("document").eq("id",body.revisionId).eq("page_id",params.pageId).maybeSingle();
 if(snapshotError||!snapshot)return NextResponse.json({error:"The selected revision could not be found."},{status:404});
 const {data:newRevision,error:saveError}=await access.supabase.rpc("save_page_revision",{target_page_id:params.pageId,expected_revision:body.expectedRevision,next_document:snapshot.document});
 if(saveError)return NextResponse.json({error:saveError.message.includes("revision_conflict")?"The page changed in another session. Reload before restoring.":"You do not have permission to restore this revision."},{status:saveError.code==="40001"?409:403});
 return NextResponse.json({success:true,revision:newRevision});
}