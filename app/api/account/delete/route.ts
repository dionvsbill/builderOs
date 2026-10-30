import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime="nodejs";
export async function POST(request:Request) {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user||!user.email)return NextResponse.json({error:"Authentication required."},{status:401});
 const body=await request.json().catch(()=>null) as {password?:string;confirmation?:string}|null;
 if(!body||body.confirmation!=="DELETE MY ACCOUNT"||!body.password)return NextResponse.json({error:"Enter your password and the exact confirmation phrase."},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publishable||!serviceRole)return NextResponse.json({error:"Account deletion is not enabled yet. Configure SUPABASE_SERVICE_ROLE_KEY as a private server environment variable."},{status:503});
 const verifier=createSupabaseClient(url,publishable,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
 const {error:verifyError}=await verifier.auth.signInWithPassword({email:user.email,password:body.password});
 if(verifyError)return NextResponse.json({error:"The password could not be verified."},{status:403});
 const admin=createSupabaseClient(url,serviceRole,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
 const {data:owned,error:ownedError}=await admin.from("workspaces").select("id,name").eq("owner_id",user.id).limit(1);
 if(ownedError)return NextResponse.json({error:"Could not check workspace ownership. No changes were made."},{status:500});
 if(owned?.length)return NextResponse.json({error:"Transfer ownership or delete your workspace before deleting this account. Your workspace must not be orphaned."},{status:409});
 const {data:avatarFiles,error:avatarListError}=await admin.storage.from("builderos-avatars").list(user.id,{limit:100});
 if(avatarListError)return NextResponse.json({error:"Could not safely prepare account files for deletion. No changes were made."},{status:500});
 if(avatarFiles?.length){const paths=avatarFiles.map(file=>user.id+"/"+file.name);const {error:storageError}=await admin.storage.from("builderos-avatars").remove(paths);if(storageError)return NextResponse.json({error:"Could not remove profile files. No account data was deleted."},{status:500});}
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id,false);
 if(deleteError)return NextResponse.json({error:"Account deletion failed. No success was reported; contact support if this persists."},{status:500});
 await supabase.auth.signOut();
 return NextResponse.json({success:true});
}