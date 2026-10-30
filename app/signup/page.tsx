"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Layers3, LoaderCircle, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    try {
      const supabase=createClient();
      const {data,error:authError}=await supabase.auth.signUp({
        email:email.trim(),password,
        options:{data:{display_name:name.trim()},emailRedirectTo:`${window.location.origin}/auth/callback?next=/dashboard`}
      });
      if(authError)throw authError;
      if(data.session) window.location.assign("/dashboard");
      else setSuccess(true);
    } catch(err){setError(err instanceof Error?err.message:"Unable to create your account.");}
    finally{setBusy(false);}
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span><Layers3 size={21}/></span><strong>builder<span>OS</span></strong></div>
    <div className="auth-eyebrow">START BUILDING</div><h1>Create your workspace.</h1>
    <p className="auth-intro">One account for every website, form and store you create.</p>
    {error&&<div className="auth-error">{error}</div>}
    {success?<div className="auth-notice">Account created. Check your inbox to confirm your email, then sign in to continue.</div>:<form onSubmit={submit} className="auth-form">
      <label htmlFor="name">Your name</label><input id="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/>
      <label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
      <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/>
      <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<>Create account <ArrowRight size={16}/></>}</button>
    </form>}
    <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
    <div className="auth-foot">By continuing, you agree to use BuilderOS responsibly.</div>
  </section></main>;
}
