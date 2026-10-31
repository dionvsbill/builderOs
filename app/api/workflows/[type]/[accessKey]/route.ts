import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const supported = new Set(["contact", "booking", "registration", "newsletter", "application", "custom"]);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key", "Access-Control-Max-Age": "86400", Vary: "Origin" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });
type Field = { id: string; type: string; label: string; required?: boolean; options?: string[] };

export async function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

export async function POST(request: Request, { params }: { params: { type: string; accessKey: string } }) {
  const type = params.type.toLowerCase();
  if (!supported.has(type)) return json({ error: "Unsupported workflow type." }, 404);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 65536) return json({ error: "Submission is too large." }, 413);
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "Send a JSON request body." }, 415);
  const raw = await request.text();
  if (raw.length > 65536) return json({ error: "Submission is too large." }, 413);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return json({ error: "Provide a values object." }, 400);
  const body = parsed as { values?: Record<string, unknown>; website?: string };
  if (!body.values || typeof body.values !== "object" || Array.isArray(body.values)) return json({ error: "Provide a values object." }, 400);
  if (body.website) return json({ success: true, message: "Request accepted." });

  const admin = createAdminClient();
  const { data: form } = await admin.from("forms").select("id,name,schema,settings").eq("access_key_hash", digest(params.accessKey)).eq("status", "published").maybeSingle();
  if (!form) return json({ error: "This workflow is unavailable." }, 404);
  const settings = (form.settings ?? {}) as Record<string, unknown>;
  const configuredType = typeof settings.workflow_type === "string" ? settings.workflow_type : "custom";
  if (configuredType !== type && configuredType !== "custom") return json({ error: "This endpoint does not match the configured workflow." }, 404);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = digest((process.env.RATE_LIMIT_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "builderos-rate-limit") + ":" + forwarded);
  const { data: allowed, error: rateError } = await admin.rpc("consume_form_submission_rate_limit", { target_form_id: form.id, target_ip_hash: ipHash, max_submissions: 5, window_seconds: 900 });
  if (rateError || allowed !== true) return json({ error: "Too many requests. Please try again later." }, 429);

  const fields = ((form.schema as { fields?: Field[] }).fields ?? []);
  const clean: Record<string, string | boolean | number> = {};
  for (const field of fields) {
    const normalizedLabel = field.label.toLowerCase().replace(/[^a-z]/g, "");
    const aliases = normalizedLabel.includes("name") ? ["name", "full_name", "fullName"]
      : normalizedLabel.includes("email") ? ["email"]
      : normalizedLabel.includes("phone") || normalizedLabel.includes("mobile") ? ["phone", "mobile"]
      : normalizedLabel.includes("message") || normalizedLabel.includes("enquiry") || normalizedLabel.includes("inquiry") ? ["message", "enquiry", "inquiry"] : [];
    const rawValue = body.values[field.id] ?? body.values[field.label] ?? aliases.map(alias => body.values?.[alias]).find(value => value !== undefined);
    let value: string | boolean | number = typeof rawValue === "string" ? rawValue.trim() : typeof rawValue === "boolean" ? rawValue : "";
    if (field.required && (value === "" || value === false)) return json({ error: field.label + " is required." }, 400);
    if (typeof value === "string" && value.length > 5000) return json({ error: field.label + " is too long." }, 400);
    if (field.type === "email" && value && (typeof value !== "string" || !emailPattern.test(value))) return json({ error: "Enter a valid email address." }, 400);
    if (field.type === "number" && value !== "" && (typeof value !== "string" || !Number.isFinite(Number(value)))) return json({ error: field.label + " must be a number." }, 400);
    if (field.type === "number" && typeof value === "string" && value !== "") value = Number(value);
    if ((field.type === "select" || field.type === "dropdown") && value && (!field.options || !field.options.includes(String(value)))) return json({ error: "Invalid selection for " + field.label + "." }, 400);
    clean[field.id] = value;
  }
  const emailField = fields.find(field => field.type === "email");
  const submitterEmail = emailField ? String(clean[emailField.id] ?? "") || null : null;
  const { data: submission, error } = await admin.from("form_submissions").insert({ form_id: form.id, payload: clean, submitter_email: submitterEmail, ip_hash: ipHash, user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null }).select("id").single();
  if (error || !submission) return json({ error: "Your request could not be saved. Please try again." }, 500);

  const recipient = typeof settings.notification_email === "string" ? settings.notification_email.trim() : "";
  if (settings.notification_enabled === true && emailPattern.test(recipient)) {
    const { error: queueError } = await admin.from("email_delivery_jobs").insert({ submission_id: submission.id, recipient, template: { subject: "New " + type + " submission: " + form.name, form_name: form.name, workflow_type: type, payload: clean } });
    if (queueError) console.error("BuilderOS workflow email enqueue failed", queueError.message);
  }
  return json({ success: true, submission_id: submission.id, message: typeof settings.success_message === "string" ? settings.success_message : "Thank you. Your request has been received." }, 201);
}
