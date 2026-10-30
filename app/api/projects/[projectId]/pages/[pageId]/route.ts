import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
type BlockKind="heading"|"text"|"button"|"image"|"section";
type SavedBlock={id:string;kind:BlockKind;label:string;content:string;styles?:{align?:"left"|"center"|"right";width?:string;opacity?:number;radius?:number}};
export async function PATCH(request:Request,{params}:{params:{projectId:string;pageId:string}}){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const body=await request.json().catch(()=>null) as {expectedRevision?:number;document?:{version?:number;children?:SavedBlock[]}}|null;
 if(!body||typeof body.expectedRevision!=="number"||!Number.isInteger(body.expectedRevision)||!body.document||body.document.version!==1||!Array.isArray(body.document.children))return NextResponse.json({error:"Invalid document payload."},{status:400});
 const document=body.document;
 const children=document.children as SavedBlock[];
 if(children.length>200)return NextResponse.json({error:"A page can contain at most 200 blocks."},{status:413});
 let size=0;
 for(const block of children){
  if(!block||typeof block.id!=="string"||block.id.length>80||typeof block.kind!=="string"||!["heading","text","button","image","section"].includes(block.kind)||typeof block.content!=="string"||block.content.length>10000||typeof block.label!=="string"||block.label.length>100)return NextResponse.json({error:"One or more page blocks are invalid."},{status:400});
  size+=block.content.length;
  if(block.styles&&((block.styles.align&&!["left","center","right"].includes(block.styles.align))||(block.styles.opacity!==undefined&&(!Number.isFinite(block.styles.opacity)||block.styles.opacity<0||block.styles.opacity>100))||(block.styles.radius!==undefined&&(!Number.isFinite(block.styles.radius)||block.styles.radius<0||block.styles.radius>100))))return NextResponse.json({error:"A block contains invalid style values."},{status:400});
 }
 if(size>500000)return NextResponse.json({error:"Page content is too large to save."},{status:413});
 const {data:page,error:pageError}=await supabase.from("pages").select("id,project_id").eq("id",params.pageId).eq("project_id",params.projectId).maybeSingle();
 if(pageError||!page)return NextResponse.json({error:"Page not found or you do not have permission to edit it."},{status:404});
 const {data:newRevision,error:saveError}=await supabase.rpc("save_page_revision",{
  target_page_id:params.pageId,
  expected_revision:body.expectedRevision,
  next_document:document
 });
 if(saveError){
  if(saveError.code==="40001"||saveError.message.includes("revision_conflict"))return NextResponse.json({error:"This page was changed in another session. Reload the latest version before saving again.",conflict:true},{status:409});
  return NextResponse.json({error:"The page could not be saved. Check your permissions and try again."},{status:500});
 }
 return NextResponse.json({success:true,revision:newRevision});
}
export async function DELETE(_request:Request,{params}:{params:{projectId:string;pageId:string}}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:page}=await supabase.from("pages").select("id,path").eq("id",params.pageId).eq("project_id",params.projectId).maybeSingle();
 if(!page)return NextResponse.json({error:"Page not found or access denied."},{status:404});
 if(page.path==="/")return NextResponse.json({error:"The home page cannot be deleted."},{status:400});
 const {error}=await supabase.from("pages").delete().eq("id",page.id).eq("project_id",params.projectId);
 if(error)return NextResponse.json({error:"Page could not be deleted."},{status:400});
 return NextResponse.json({success:true});
}
