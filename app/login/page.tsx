"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Layers3, LoaderCircle, ArrowRight } from "lucide-react";

function LoginForm() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      window.location.assign(search.get("next")?.startsWith("/") && !search.get("next")?.startsWith("//") ? search.get("next")! : "/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span><Layers3 size={21}/></span><strong>builder<span>OS</span></strong></div>
    <div className="auth-eyebrow">YOUR CREATIVE WORKSPACE</div><h1>Welcome back.</h1>
    <p className="auth-intro">Sign in to continue building your websites, forms and stores.</p>
    {search.get("error") === "auth_callback" && <div className="auth-error">Your sign-in link could not be verified. Please try again.</div>}
    {error && <div className="auth-error">{error}</div>}{notice && <div className="auth-notice">{notice}</div>}
    <form onSubmit={submit} className="auth-form">
      <label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/>
      <label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/>
      <div className="auth-recovery"><Link href="/reset-password">Forgot password?</Link></div><button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <>Sign in <ArrowRight size={16}/></>}</button>
    </form>
    <p className="auth-switch">New to BuilderOS? <Link href="/signup">Create an account</Link></p>
    <div className="auth-foot">Secure workspace access · Your projects stay private</div>
  </section></main>;
}
export default function LoginPage() { return <Suspense fallback={<main className="auth-shell"><div className="auth-card">Loading sign in…</div></main>}><LoginForm/></Suspense>; }
