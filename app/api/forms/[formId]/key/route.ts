import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(_request: Request,{params}:{params:{formId:string}}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const accessKey=randomBytes(32).toString("base64url");
 const hash=createHash("sha256").update(accessKey).digest("hex");
 const {data,error}=await supabase.from("forms").update({access_key_hash:hash,updated_at:new Date().toISOString()}).eq("id",params.formId).select("id").maybeSingle();
 if(error||!data)return NextResponse.json({error:"Unable to rotate this form key."},{status:404});
 return NextResponse.json({accessKey});
}