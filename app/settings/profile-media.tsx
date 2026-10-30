"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, LoaderCircle } from "lucide-react";

export default function ProfileMedia({ userId, initialUrl }: { userId:string; initialUrl:string|null }) {
 const input=useRef<HTMLInputElement>(null); const [url,setUrl]=useState(initialUrl??""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 async function upload(file?:File) {
  if(!file)return; setMessage("");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Choose a JPG, PNG or WebP image.");return;}
  if(file.size>5*1024*1024){setMessage("Image must be 5 MB or smaller.");return;}
  setBusy(true);
  try {
   const supabase=createClient(); const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=userId+"/avatar-"+Date.now()+"."+ext;
   const {error:uploadError}=await supabase.storage.from("builderos-avatars").upload(path,file,{contentType:file.type,upsert:true});
   if(uploadError)throw uploadError;
   const {data}=await supabase.storage.from("builderos-avatars").createSignedUrl(path,60*60*24*365);
   if(!data?.signedUrl)throw new Error("Could not create avatar preview.");
   const {error:profileError}=await supabase.from("profiles").update({avatar_url:path}).eq("id",userId);
   if(profileError)throw profileError;
   setUrl(data.signedUrl);setMessage("Profile photo updated.");
  } catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}
  finally{setBusy(false);}
 }
 return <div className="profile-media"><div className="profile-avatar">{url?<img src={url} alt="Profile avatar"/>:<span>{userId.slice(0,2).toUpperCase()}</span>}</div><div><button type="button" className="settings-secondary" onClick={()=>input.current?.click()} disabled={busy}>{busy?<LoaderCircle size={14} className="spin"/>:<Camera size={14}/>} Upload photo</button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>upload(e.target.files?.[0])}/><small>JPG, PNG or WebP · Maximum 5 MB</small>{message&&<small role="status">{message}</small>}</div></div>;
}