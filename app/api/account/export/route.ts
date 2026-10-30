import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
export async function GET() {
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const [profile,prefs,memberships,projects,forms,activity,preferences,deletion,exportRequests]=await Promise.all([
  supabase.from("profiles").select("*").eq("id",user.id).maybeSingle(),
  supabase.from("user_preferences").select("*").eq("user_id",user.id).maybeSingle(),
  supabase.from("workspace_members").select("workspace_id,role,created_at,workspaces(id,name,slug,created_at)").eq("user_id",user.id),
  supabase.from("projects").select("id,workspace_id,name,project_type,created_at,updated_at").order("created_at",{ascending:true}),
  supabase.from("forms").select("id,project_id,name,schema,settings,status,created_at,updated_at"),
  supabase.from("account_activity").select("event_type,description,metadata,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(5000),
  supabase.from("user_preferences").select("*").eq("user_id",user.id).maybeSingle(),
  supabase.from("account_deletion_requests").select("status,requested_at,completed_at").eq("user_id",user.id).maybeSingle(),
  supabase.from("data_export_requests").select("status,requested_at,completed_at").eq("user_id",user.id)
 ]);
 const errors=[profile.error,prefs.error,memberships.error,projects.error,forms.error,activity.error,preferences.error,deletion.error,exportRequests.error].filter(Boolean);
 if(errors.length)return NextResponse.json({error:"Could not prepare the complete export. Please retry."},{status:500});
 const workspaceIds=(memberships.data??[]).map(m=>m.workspace_id);
 const ownProjects=(projects.data??[]).filter(p=>workspaceIds.includes(p.workspace_id));
 const projectIds=ownProjects.map(p=>p.id);
 const pageResult=projectIds.length?await supabase.from("pages").select("id,project_id,name,path,document,revision,updated_at").in("project_id",projectIds):{data:[],error:null};
 const formIds=(forms.data??[]).filter(f=>projectIds.includes(f.project_id)).map(f=>f.id);
 const submissionResult=formIds.length?await supabase.from("form_submissions").select("id,form_id,payload,submitter_email,status,created_at").in("form_id",formIds).order("created_at",{ascending:false}).limit(10000):{data:[],error:null};
 if(pageResult.error||submissionResult.error)return NextResponse.json({error:"Could not export project content."},{status:500});
 const payload={exported_at:new Date().toISOString(),account:{id:user.id,email:user.email,created_at:user.created_at,last_sign_in_at:user.last_sign_in_at},profile:profile.data,preferences:preferences.data,workspaces:memberships.data,projects:ownProjects,pages:pageResult.data,forms:(forms.data??[]).filter(f=>projectIds.includes(f.project_id)),form_submissions:submissionResult.data,account_activity:activity.data,deletion_requests:deletion.data,export_requests:exportRequests.data,notes:["This export includes records accessible to your account at export time.","Uploaded binary files and external payment-provider records are not embedded in this JSON file."]};
 return new NextResponse(JSON.stringify(payload,null,2),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="builderos-data-export-${new Date().toISOString().slice(0,10)}.json"`,"Cache-Control":"private, no-store"}});
}