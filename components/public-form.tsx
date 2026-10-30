"use client";
import { FormEvent, useEffect, useState } from "react";
type Field = { id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string };
type PublicConfig = { name: string; schema: { fields: Field[] }; settings: { submit_label?: string; success_message?: string } };
export function PublicForm({ accessKey }: { accessKey: string }) {
  const [config,setConfig]=useState<PublicConfig|null>(null);const [values,setValues]=useState<Record<string,string|boolean>>({});
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch("/api/submit/"+encodeURIComponent(accessKey)).then(r=>r.ok?r.json():Promise.reject()).then(setConfig).catch(()=>setMessage("This form is currently unavailable."));},[accessKey]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    const data=new FormData(event.currentTarget);
    try{const response=await fetch("/api/submit/"+encodeURIComponent(accessKey),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({values,website:String(data.get("website")??"")})});
      const result=await response.json();if(!response.ok)throw new Error(result.error??"Submission failed.");
      setMessage(result.message??config?.settings.success_message??"Response received.");setValues({});
    }catch(error){setMessage(error instanceof Error?error.message:"Submission failed.");}finally{setBusy(false);}
  }
  if(!config)return <p style={{color:"#69758a"}}>{message||"Loading form…"}</p>;
  const inputStyle={width:"100%",padding:"13px 14px",border:"1px solid #d8deea",borderRadius:9,background:"#fff",color:"#172033",fontSize:15,boxSizing:"border-box" as const};
  return <form onSubmit={submit} style={{background:"#fff",border:"1px solid #e0e5ed",borderRadius:16,padding:24,boxShadow:"0 12px 40px #1720330c"}}>
    {config.schema.fields.map(field=><label key={field.id} style={{display:"grid",gap:8,marginBottom:19,fontSize:14,fontWeight:650}}>
      {field.label}{field.required?" *":""}
      {field.type==="textarea"?<textarea required={field.required} placeholder={field.placeholder} value={String(values[field.id]??"")} onChange={e=>setValues(v=>({...v,[field.id]:e.target.value}))} style={{...inputStyle,minHeight:110,resize:"vertical"}}/>:
       field.type==="select"?<select required={field.required} value={String(values[field.id]??"")} onChange={e=>setValues(v=>({...v,[field.id]:e.target.value}))} style={inputStyle}><option value="">Choose an option</option>{(field.options??[]).map(option=><option key={option}>{option}</option>)}</select>:
       field.type==="checkbox"?<input type="checkbox" checked={Boolean(values[field.id])} onChange={e=>setValues(v=>({...v,[field.id]:e.target.checked}))}/>:
       <input type={field.type==="phone"?"tel":field.type} required={field.required} placeholder={field.placeholder} value={String(values[field.id]??"")} onChange={e=>setValues(v=>({...v,[field.id]:e.target.value}))} style={inputStyle}/>}
    </label>)}
    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:"absolute",left:"-10000px",width:1,height:1}}/>
    {message&&<p role="status" style={{fontSize:13,color:"#355f4e",lineHeight:1.6}}>{message}</p>}
    <button disabled={busy} style={{border:0,borderRadius:9,background:"#243b70",color:"#fff",padding:"13px 20px",fontWeight:750,cursor:busy?"wait":"pointer"}}>{busy?"Submitting…":config.settings.submit_label??"Submit"}</button>
  </form>;
}