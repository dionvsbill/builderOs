import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request:Request,{params}:{params:{projectId:string}}){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const body=await request.json().catch(()=>null) as {name?:string}|null;
 const name=typeof body?.name==="string"?body.name.trim().slice(0,120):"";
 if(!name)return NextResponse.json({error:"Project name is required."},{status:400});
 const {data,error:updateError}=await supabase.from("projects").update({name,updated_at:new Date().toISOString()}).eq("id",params.projectId).select("id,name").maybeSingle();
 if(updateError||!data)return NextResponse.json({error:"Project name could not be saved. Check your workspace permissions."},{status:403});
 return NextResponse.json({success:true,name:data.name});
}