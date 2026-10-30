import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Layers3, ShieldCheck } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function PlatformAdminPage(){
 const auth=await createClient();
 const {data:{user},error}=await auth.auth.getUser();
 if(error||!user) redirect("/login");
 const {data:isPlatformAdmin,error:roleError}=await auth.rpc("is_current_user_platform_admin");
 if(roleError||!isPlatformAdmin||!user.email_confirmed_at) redirect("/dashboard");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret) return <main className="platform-admin-shell"><header><Link href="/dashboard"><Layers3/> BuilderOS</Link></header><section><ShieldCheck/><h1>Super administrator</h1><p>Set the private SUPABASE_SERVICE_ROLE_KEY in your hosting environment to enable platform metrics.</p></section></main>;
 const db=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
 const names=["profiles","workspaces","projects","forms","form_submissions"] as const;
 const counts=await Promise.all(names.map(async name=>{const {count,error}=await db.from(name).select("*",{count:"exact",head:true});return {name,count:error?null:count};}));
 return <main className="platform-admin-shell"><header><Link href="/dashboard"><Layers3/> BuilderOS</Link><span><ShieldCheck/> Super admin</span></header><section><h1>Platform administration</h1><p>Verified administrator: {user.email}</p><div className="platform-admin-grid">{counts.map(item=><article key={item.name}><span>{item.name.replace("_"," ")}</span><strong>{item.count??"Unavailable"}</strong></article>)}</div><Link href="/dashboard">Return to dashboard</Link></section></main>;
}