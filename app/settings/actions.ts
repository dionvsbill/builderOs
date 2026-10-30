"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function currentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await currentUser();
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 100);
  const company = String(formData.get("company") ?? "").trim().slice(0, 120);
  const jobTitle = String(formData.get("jobTitle") ?? "").trim().slice(0, 100);
  const website = String(formData.get("website") ?? "").trim().slice(0, 200);
  const timezone = String(formData.get("timezone") ?? "Africa/Accra").trim().slice(0, 80);
  if (website && !/^https:\/\//i.test(website)) throw new Error("Website must start with https://");
  const { error } = await supabase.from("profiles").upsert({
    id: user.id, full_name: fullName || null, display_name: fullName || null,
    company: company || null, job_title: jobTitle || null, website: website || null, timezone
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=profile");
}

export async function updatePreferences(formData: FormData) {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    product_updates: formData.get("product_updates") === "on",
    security_alerts: formData.get("security_alerts") === "on",
    submission_notifications: formData.get("submission_notifications") === "on",
    weekly_summary: formData.get("weekly_summary") === "on",
    marketing_emails: formData.get("marketing_emails") === "on",
    theme: String(formData.get("theme") ?? "system")
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=preferences");
}

export async function requestDataExport() {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("data_export_requests").insert({ user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?requested=export");
}

export async function requestAccountDeletion(formData: FormData) {
  const { supabase, user } = await currentUser();
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "DELETE MY ACCOUNT") throw new Error("Type DELETE MY ACCOUNT exactly to submit this request.");
  const { data: existing } = await supabase.from("account_deletion_requests").select("id,status").eq("user_id", user.id).maybeSingle();
  if (existing && existing.status !== "cancelled") throw new Error("You already have an open account deletion request.");
  if (existing) {
    const { error } = await supabase.from("account_deletion_requests").update({
      status: "requested", reason: String(formData.get("reason") ?? "").trim().slice(0, 1000), requested_at: new Date().toISOString()
    }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("account_deletion_requests").insert({
      user_id: user.id, reason: String(formData.get("reason") ?? "").trim().slice(0, 1000) || null
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/settings");
  redirect("/settings?requested=deletion");
}

export async function cancelAccountDeletion() {
  const { supabase, user } = await currentUser();
  const { error } = await supabase.from("account_deletion_requests").update({ status: "cancelled" })
    .eq("user_id", user.id).eq("status", "requested");
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?cancelled=deletion");
}
