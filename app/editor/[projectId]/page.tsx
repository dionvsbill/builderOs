import { notFound, redirect } from "next/navigation";
import Home from "@/app/page";
import { createClient } from "@/lib/supabase/server";

type RawBlock={id?:string;kind?:string;type?:string;label?:string;content?:string;styles?:Record<string,unknown>};
const kinds=["heading","text","button","image","section"] as const;
export default async function ProjectEditorPage({params}:{params:{projectId:string}}){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:project}=await supabase.from("projects").select("id,name,project_type").eq("id",params.projectId).maybeSingle();
 if(!project)notFound();
 const {data:page}=await supabase.from("pages").select("id,name,path,document,revision").eq("project_id",project.id).eq("path","/").maybeSingle();
 if(!page)notFound();
 const raw=(page.document as {children?:RawBlock[]}|null)?.children??[];
 const initialBlocks=raw.map((block,index)=>{
  const kind=(kinds as readonly string[]).includes(block.kind??block.type??"")?(block.kind??block.type) as typeof kinds[number]:"section";
  const align=block.styles?.align;
  return {
   id:typeof block.id==="string"?block.id:`saved-block-${index}`,
   kind,
   label:typeof block.label==="string"?block.label:kind==="heading"?"Heading":kind==="text"?"Paragraph":kind==="button"?"Button":kind==="image"?"Image":"Section",
   content:typeof block.content==="string"?block.content:"",
   styles:{
    align:align==="center"||align==="right"?align:"left",
    width:typeof block.styles?.width==="string"?block.styles.width:"100%",
    opacity:typeof block.styles?.opacity==="number"?block.styles.opacity:100,
    radius:typeof block.styles?.radius==="number"?block.styles.radius:kind==="button"?4:0
   }
  };
 });
 return <Home projectId={project.id} pageId={page.id} initialRevision={page.revision} initialBlocks={initialBlocks} initialSiteName={project.name}/>;
}