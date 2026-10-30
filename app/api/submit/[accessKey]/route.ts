import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
type Field = { id: string; type: string; label: string; required?: boolean; options?: string[] };
export async function GET(_request: Request, { params }: { params: { accessKey: string } }) {
  const admin = createAdminClient();
  const { data: form } = await admin.from("forms").select("name,schema,settings").eq("access_key_hash", digest(params.accessKey)).eq("status", "published").maybeSingle();
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  const settings = form.settings as Record<string, unknown>;
  return NextResponse.json({ name: form.name, schema: form.schema, settings: { submit_label: settings.submit_label ?? "Submit", success_message: settings.success_message ?? "Thank you. Your response has been received." } }, { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
}
export async function POST(request: Request, { params }: { params: { accessKey: string } }) {
  const admin = createAdminClient();
  const { data: form } = await admin.from("forms").select("id,name,schema,settings,submission_limit").eq("access_key_hash", digest(params.accessKey)).eq("status", "published").maybeSingle();
  if (!form) return NextResponse.json({ error: "This form is unavailable." }, { status: 404 });
  const body = await request.json().catch(() => null) as { values?: Record<string, unknown>; website?: string } | null;
  if (!body || !body.values || typeof body.values !== "object" || Array.isArray(body.values)) return NextResponse.json({ error: "Invalid form response." }, { status: 400 });
  if (body.website) return NextResponse.json({ success: true });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = digest((process.env.RATE_LIMIT_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "builderos-rate-limit") + ":" + forwarded);
  const { data: allowed, error: rateError } = await admin.rpc("consume_form_submission_rate_limit", { target_form_id: form.id, target_ip_hash: ipHash, max_submissions: 5, window_seconds: 900 });
  if (rateError || allowed !== true) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  const fields = ((form.schema as { fields?: Field[] }).fields ?? []);
  const clean: Record<string, string | boolean | number> = {};
  for (const field of fields) {
    const raw = body.values[field.id];
    let value: string | boolean | number = typeof raw === "string" ? raw.trim() : typeof raw === "boolean" ? raw : "";
    if (field.required && (value === "" || value === false)) return NextResponse.json({ error: field.label + " is required." }, { status: 400 });
    if (typeof value === "string" && value.length > 5000) return NextResponse.json({ error: field.label + " is too long." }, { status: 400 });
    if (field.type === "email" && value && (typeof value !== "string" || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value))) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (field.type === "number" && value !== "" && (typeof value !== "string" || !Number.isFinite(Number(value)))) return NextResponse.json({ error: field.label + " must be a number." }, { status: 400 });
    if (field.type === "number" && typeof value === "string" && value !== "") value = Number(value);
    if (field.type === "select" && value && (!field.options || !field.options.includes(String(value)))) return NextResponse.json({ error: "Invalid selection for " + field.label + "." }, { status: 400 });
    clean[field.id] = value;
  }
  const emailField = fields.find(field => field.type === "email");
  const submitterEmail = emailField ? String(clean[emailField.id] ?? "") || null : null;
  const { data: submission, error } = await admin.from("form_submissions").insert({ form_id: form.id, payload: clean, submitter_email: submitterEmail, ip_hash: ipHash, user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null }).select("id").single();
  if (error || !submission) return NextResponse.json({ error: "Your response could not be saved. Please try again." }, { status: 500 });
  const settings = form.settings as Record<string, unknown>;
  const recipient = typeof settings.notification_email === "string" ? settings.notification_email.trim() : "";
  if (settings.notification_enabled === true && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient)) {
    const { error: queueError } = await admin.from("email_delivery_jobs").insert({ submission_id: submission.id, recipient, template: { subject: "New form submission: " + form.name, form_name: form.name, payload: clean } });
    if (queueError) console.error("BuilderOS email job enqueue failed", queueError.message);
  }
  return NextResponse.json({ success: true, message: settings.success_message ?? "Thank you. Your response has been received." }, { status: 201 });
}