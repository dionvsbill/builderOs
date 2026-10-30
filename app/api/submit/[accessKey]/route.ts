import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });

type Field = { id: string; type: string; label: string; required?: boolean; options?: string[] };
type SubmissionBody = { values?: Record<string, unknown>; website?: string };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET(_request: Request, { params }: { params: { accessKey: string } }) {
  const admin = createAdminClient();
  const { data: form } = await admin.from("forms")
    .select("name,schema,settings")
    .eq("access_key_hash", digest(params.accessKey))
    .eq("status", "published")
    .maybeSingle();
  if (!form) return json({ error: "Form not found." }, 404);
  const settings = form.settings as Record<string, unknown>;
  return json({
    name: form.name,
    schema: form.schema,
    settings: {
      submit_label: settings.submit_label ?? "Submit",
      success_message: settings.success_message ?? "Thank you. Your response has been received.",
    },
  });
}

export async function POST(request: Request, { params }: { params: { accessKey: string } }) {
  const admin = createAdminClient();
  const { data: form } = await admin.from("forms")
    .select("id,name,schema,settings,submission_limit")
    .eq("access_key_hash", digest(params.accessKey))
    .eq("status", "published")
    .maybeSingle();
  if (!form) return json({ error: "This form is unavailable." }, 404);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 65536) return json({ error: "Submission is too large." }, 413);
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!["application/json", "application/x-www-form-urlencoded"].includes(contentType)) {
    return json({ error: "Use application/json or application/x-www-form-urlencoded. File uploads are not enabled on this endpoint." }, 415);
  }

  const rawBody = await request.text();
  if (rawBody.length > 65536) return json({ error: "Submission is too large." }, 413);
  let body: SubmissionBody | null = null;
  try {
    if (contentType === "application/json") {
      body = JSON.parse(rawBody) as SubmissionBody;
    } else {
      const formParams = new URLSearchParams(rawBody);
      const values: Record<string, unknown> = {};
      formParams.forEach((value, key) => {
        if (key !== "website" && key !== "access_key" && key !== "subject") values[key] = value;
      });
      body = { values, website: formParams.get("website") ?? undefined };
    }
  } catch {
    return json({ error: "Invalid submission body." }, 400);
  }
  if (!body || !body.values || typeof body.values !== "object" || Array.isArray(body.values)) {
    return json({ error: "Invalid form response. Provide a values object." }, 400);
  }
  if (body.website) return json({ success: true, message: "Submission accepted." });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = digest((process.env.RATE_LIMIT_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "builderos-rate-limit") + ":" + forwarded);
  const { data: allowed, error: rateError } = await admin.rpc("consume_form_submission_rate_limit", {
    target_form_id: form.id,
    target_ip_hash: ipHash,
    max_submissions: 5,
    window_seconds: 900,
  });
  if (rateError || allowed !== true) return json({ error: "Too many submissions or this form has reached its response limit. Please try again later." }, 429);

  const fields = ((form.schema as { fields?: Field[] }).fields ?? []);
  const clean: Record<string, string | boolean | number> = {};
  for (const field of fields) {
    const raw = body.values[field.id] ?? body.values[field.label];
    let value: string | boolean | number = typeof raw === "string" ? raw.trim() : typeof raw === "boolean" ? raw : "";
    if (field.required && (value === "" || value === false)) return json({ error: field.label + " is required." }, 400);
    if (typeof value === "string" && value.length > 5000) return json({ error: field.label + " is too long." }, 400);
    if (field.type === "email" && value && (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (field.type === "number" && value !== "" && (typeof value !== "string" || !Number.isFinite(Number(value)))) {
      return json({ error: field.label + " must be a number." }, 400);
    }
    if (field.type === "number" && typeof value === "string" && value !== "") value = Number(value);
    if (field.type === "select" && value && (!field.options || !field.options.includes(String(value)))) {
      return json({ error: "Invalid selection for " + field.label + "." }, 400);
    }
    clean[field.id] = value;
  }

  const emailField = fields.find(field => field.type === "email");
  const submitterEmail = emailField ? String(clean[emailField.id] ?? "") || null : null;
  const { data: submission, error } = await admin.from("form_submissions").insert({
    form_id: form.id,
    payload: clean,
    submitter_email: submitterEmail,
    ip_hash: ipHash,
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  }).select("id").single();
  if (error || !submission) return json({ error: "Your response could not be saved. Please try again." }, 500);

  const settings = form.settings as Record<string, unknown>;
  const recipient = typeof settings.notification_email === "string" ? settings.notification_email.trim() : "";
  if (settings.notification_enabled === true && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    const { error: queueError } = await admin.from("email_delivery_jobs").insert({
      submission_id: submission.id,
      recipient,
      template: { subject: "New form submission: " + form.name, form_name: form.name, payload: clean },
    });
    if (queueError) console.error("BuilderOS email job enqueue failed", queueError.message);
  }

  return json({
    success: true,
    submission_id: submission.id,
    message: settings.success_message ?? "Thank you. Your response has been received.",
  }, 201);
}
