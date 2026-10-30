import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublishedPage } from "@/components/published-page";
export const dynamic="force-dynamic";
export default async function PublicSitePage({params}:{params:{slug:string;path?:string[]}}){
 const admin=createAdminClient();
 const {data:site}=await admin.from("published_sites").select("id,project_id,status").eq("public_slug",params.slug).eq("status","published").maybeSingle();
 if(!site)notFound();
 const path="/"+(params.path??[]).join("/");
 const {data:page}=await admin.from("published_pages").select("name,document").eq("project_id",site.project_id).eq("path",path).maybeSingle();
 if(!page)notFound();
 const document=page.document as {children?:Array<{id?:string;kind?:string;label?:string;content?:string;styles?:{align?:string;width?:string;opacity?:number;radius?:number}}>};
 return <PublishedPage name={page.name} blocks={document.children??[]}/>;
}