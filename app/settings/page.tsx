import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, updatePreferences, requestDataExport, requestAccountDeletion, cancelAccountDeletion } from "./actions";
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
          <form action={updateProfile} className="settings-form"><div className="settings-fields">
            <label>Full name<input name="fullName" defaultValue={profile?.full_name ?? profile?.display_name ?? user.user_metadata?.display_name ?? ""} maxLength={100} placeholder="Your full name"/></label>
            <label>Email address<input value={user.email ?? ""} readOnly disabled/><small>Email changes are handled through a verified authentication flow.</small></label>
            <label>Company<input name="company" defaultValue={profile?.company ?? ""} maxLength={120} placeholder="Company or organisation"/></label>
            <label>Job title<input name="jobTitle" defaultValue={profile?.job_title ?? ""} maxLength={100} placeholder="Your role"/></label>
            <label>Website<input name="website" type="url" defaultValue={profile?.website ?? ""} maxLength={200} placeholder="https://example.com"/></label>
            <label>Timezone<select name="timezone" defaultValue={profile?.timezone ?? "Africa/Accra"}><option value="Africa/Accra">Africa/Accra (GMT)</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>
          </div><button className="settings-primary">Save profile</button></form>
        </section>
        <section className="settings-card" id="preferences"><div className="settings-card-title"><Bell size={18}/><div><h3>Notifications & preferences</h3><p>Choose the product updates and account notifications you receive.</p></div></div>
          <form action={updatePreferences} className="settings-form"><div className="settings-toggle-list">
            {([["security_alerts","Security alerts","Important sign-in and account security notices"],["submission_notifications","Form submission notifications","Updates when forms receive submissions"],["product_updates","Product updates","New features, improvements and release notes"],["weekly_summary","Weekly activity summary","A weekly overview of workspace activity"],["marketing_emails","Occasional offers","Optional promotional messages"]] as const).map(([name,label,description])=><label className="settings-toggle" key={name}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" name={name} defaultChecked={Boolean(prefs[name])}/></label>)}
          </div><label className="settings-select-label">Appearance<select name="theme" defaultValue={prefs.theme}><option value="system">Use device setting</option><option value="dark">Dark</option><option value="light">Light</option></select></label><button className="settings-primary">Save preferences</button></form>
        </section>
        <section className="settings-card" id="security"><div className="settings-card-title"><ShieldCheck size={18}/><div><h3>Security</h3><p>Protect access to your account and projects.</p></div></div><div className="settings-info-row"><span><strong>Verified account email</strong><small>{user.email}</small></span><span className="settings-badge">Authentication managed by Supabase</span></div><div className="settings-info-row"><span><strong>Password & sign-in</strong><small>Use the password reset flow if you need to change a forgotten password.</small></span><Link href="/login?reset=1">Sign-in page</Link></div><div className="settings-info-row"><span><strong>Active sessions</strong><small>Sign out from this device using the dashboard sign-out control.</small></span><span className="settings-muted">Session controls</span></div></section>
        <section className="settings-card" id="privacy"><div className="settings-card-title"><LockKeyhole size={18}/><div><h3>Privacy & your data</h3><p>Request a copy of your personal BuilderOS account data.</p></div></div><div className="settings-info-row"><span><strong>Export your data</strong><small>Request an export of your profile, workspace and account records.</small></span><form action={requestDataExport}><button className="settings-secondary"><FileDown size={15}/> Request export</button></form></div>
          {exports?.length ? <div className="settings-history"><strong>Export requests</strong>{exports.map(item=><p key={item.id}>{new Date(item.requested_at).toLocaleString()} <span>{item.status}</span></p>)}</div>:null}
          <div className="settings-legal-links"><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of service</Link><Link href="/cookies">Cookie notice</Link><Link href="/acceptable-use">Acceptable use</Link></div>
        </section>
        <section className="settings-card settings-danger" id="danger"><div className="settings-card-title"><Trash2 size={18}/><div><h3>Delete account</h3><p>Request permanent removal of your BuilderOS account and associated data.</p></div></div>
          {deletion && deletion.status !== "cancelled" ? <div className="settings-warning"><strong>Deletion request: {deletion.status}</strong><p>We have received your request. Your account is not deleted yet. A verified deletion process must review workspace ownership, billing obligations, backups and legal retention requirements.</p><form action={cancelAccountDeletion}><button className="settings-secondary">Cancel request</button></form></div> :
          <form action={requestAccountDeletion} className="settings-form"><p className="settings-danger-copy">This starts a deletion request; it does not instantly erase your account. You may need to transfer workspace ownership or resolve active subscriptions first.</p><label>Reason (optional)<textarea name="reason" rows={3} maxLength={1000} placeholder="Tell us why you are leaving (optional)"/></label><label>Type DELETE MY ACCOUNT to confirm<input name="confirmation" required placeholder="DELETE MY ACCOUNT" autoComplete="off"/></label><button className="settings-danger-button">Submit deletion request</button></form>}
        </section>
        <footer className="settings-footer">BuilderOS account controls · Privacy requests are recorded securely.</footer>
      </section>
    </div>
  </main>;
}
