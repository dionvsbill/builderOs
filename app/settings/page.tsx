import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, updatePreferences } from "./actions";
import ProfileMedia from "./profile-media";
import SecurityControls from "./security-controls";
import { Layers3, UserRound, ShieldCheck, Bell, LockKeyhole, FileDown, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string; requested?: string; cancelled?: string } }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const [{ data: profile }, { data: preferences }, { data: deletion }, { data: exports }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("account_deletion_requests").select("status,requested_at").eq("user_id", user.id).maybeSingle(),
    supabase.from("data_export_requests").select("id,status,requested_at").eq("user_id", user.id).order("requested_at",{ascending:false}).limit(5)
  ]);
  const { data: avatarData } = profile?.avatar_url ? await supabase.storage.from("builderos-avatars").createSignedUrl(profile.avatar_url, 3600) : { data: null };
  const saved = searchParams.saved ? "Your settings have been saved." : searchParams.requested === "export" ? "Your data export request has been received." : searchParams.requested === "deletion" ? "Your account deletion request has been received. Your account has not been deleted." : searchParams.cancelled ? "Your deletion request was cancelled." : "";
  const prefs = preferences ?? { product_updates:true, security_alerts:true, submission_notifications:true, weekly_summary:false, marketing_emails:false, theme:"system" };
  return <main className="settings-shell">
    <header className="settings-top"><Link className="dash-brand" href="/dashboard"><span><Layers3 size={18}/></span>builder<span>OS</span></Link><Link href="/dashboard" className="settings-back"><ArrowLeft size={15}/> Dashboard</Link></header>
    <div className="settings-layout">
      <aside className="settings-sidebar"><div className="settings-overline">WORKSPACE ACCOUNT</div><h1>Settings</h1><p>Manage your identity, preferences and data.</p><nav>
        <a className="active" href="#profile"><UserRound size={16}/> Profile</a><a href="#preferences"><Bell size={16}/> Notifications</a><a href="#security"><ShieldCheck size={16}/> Security</a><a href="#privacy"><LockKeyhole size={16}/> Privacy & data</a><a href="#danger"><Trash2 size={16}/> Delete account</a>
      </nav><div className="settings-sidebar-foot">Signed in as<br/><strong>{user.email}</strong></div></aside>
      <section className="settings-main">
        <div className="settings-heading"><div><span className="settings-overline">PERSONAL ACCOUNT</span><h2>Account settings</h2><p>Keep your BuilderOS account accurate and secure.</p></div></div>
        {saved && <div className="settings-success"><CheckCircle2 size={16}/>{saved}</div>}
        <section className="settings-card" id="profile"><div className="settings-card-title"><UserRound size={18}/><div><h3>Public profile</h3><p>Information used to identify you in your workspace.</p></div></div>
          <div className="settings-form"><ProfileMedia userId={user.id} initialUrl={avatarData?.signedUrl ?? null}/><form action={updateProfile} className="settings-form"><div className="settings-fields">
            <label>Full name<input name="fullName" defaultValue={profile?.full_name ?? profile?.display_name ?? user.user_metadata?.display_name ?? ""} maxLength={100} placeholder="Your full name"/></label>
            <label>Email address<input value={user.email ?? ""} readOnly disabled/><small>Email changes are handled through a verified authentication flow.</small></label>
            <label>Company<input name="company" defaultValue={profile?.company ?? ""} maxLength={120} placeholder="Company or organisation"/></label>
            <label>Job title<input name="jobTitle" defaultValue={profile?.job_title ?? ""} maxLength={100} placeholder="Your role"/></label>
            <label>Website<input name="website" type="url" defaultValue={profile?.website ?? ""} maxLength={200} placeholder="https://example.com"/></label>
            <label>Timezone<select name="timezone" defaultValue={profile?.timezone ?? "Africa/Accra"}><option value="Africa/Accra">Africa/Accra (GMT)</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>
          </div><button className="settings-primary">Save profile</button></form></div>
        </section>
        <section className="settings-card" id="preferences"><div className="settings-card-title"><Bell size={18}/><div><h3>Notifications & preferences</h3><p>Choose the product updates and account notifications you receive.</p></div></div>
          <form action={updatePreferences} className="settings-form"><div className="settings-toggle-list">
            {([["security_alerts","Security alerts","Important sign-in and account security notices"],["submission_notifications","Form submission notifications","Updates when forms receive submissions"],["product_updates","Product updates","New features, improvements and release notes"],["weekly_summary","Weekly activity summary","A weekly overview of workspace activity"],["marketing_emails","Occasional offers","Optional promotional messages"]] as const).map(([name,label,description])=><label className="settings-toggle" key={name}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" name={name} defaultChecked={Boolean(prefs[name])}/></label>)}
          </div><label className="settings-select-label">Appearance<select name="theme" defaultValue={prefs.theme}><option value="system">Use device setting</option><option value="dark">Dark</option><option value="light">Light</option></select></label><button className="settings-primary">Save preferences</button></form>
        </section>
        <section className="settings-card" id="security"><div className="settings-card-title"><ShieldCheck size={18}/><div><h3>Security</h3><p>Protect access to your account and projects.</p></div></div><div className="settings-info-row"><span><strong>Verified account email</strong><small>{user.email}</small></span><span className="settings-badge">Authentication managed by Supabase</span></div><SecurityControls email={user.email ?? ""}/><div className="settings-info-row"><span><strong>Session management</strong><small>Sign out of this device from the dashboard. Use Supabase account security controls to revoke other sessions.</small></span><span className="settings-muted">Current session</span></div></section>
        <section className="settings-card" id="privacy"><div className="settings-card-title"><LockKeyhole size={18}/><div><h3>Privacy & your data</h3><p>Request a copy of your personal BuilderOS account data.</p></div></div><div className="settings-info-row"><span><strong>Export your data</strong><small>Request an export of your profile, workspace and account records.</small></span><a className="settings-secondary" href="/api/account/export" download><FileDown size={15}/> Download my data</a></div>
          {exports?.length ? <div className="settings-history"><strong>Export requests</strong>{exports.map(item=><p key={item.id}>{new Date(item.requested_at).toLocaleString()} <span>{item.status}</span></p>)}</div>:null}
          <div className="settings-legal-links"><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of service</Link><Link href="/cookies">Cookie notice</Link><Link href="/acceptable-use">Acceptable use</Link></div>
        </section>
        <section className="settings-card settings-danger" id="danger"><div className="settings-card-title"><Trash2 size={18}/><div><h3>Delete account</h3><p>Permanent deletion is available after workspace ownership is transferred.</p></div></div><SecurityControls email={user.email ?? ""}/></section>
        <footer className="settings-footer">BuilderOS account controls · Privacy requests are recorded securely.</footer>
      </section>
    </div>
  </main>;
}
