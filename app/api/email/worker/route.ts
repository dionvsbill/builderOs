import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
export const runtime = "nodejs";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const host = process.env.SMTP_HOST, from = process.env.SMTP_FROM;
  if (!host || !from || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return NextResponse.json({ error: "SMTP is not configured." }, { status: 503 });
  const admin = createAdminClient();
  const { data: jobs, error } = await admin.rpc("claim_due_email_delivery_jobs", { batch_size: 10 });
  if (error) return NextResponse.json({ error: "Unable to claim email jobs." }, { status: 500 });
  const transport = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000 });
  let sent = 0, retried = 0, failed = 0;
  for (const job of jobs ?? []) {
    const template = job.template as { subject?: string; form_name?: string; payload?: Record<string, unknown> };
    const entries = Object.entries(template.payload ?? {});
    const rows = entries.map(([key,value]) => "<tr><th style=\"text-align:left;padding:8px;border-bottom:1px solid #ddd\">" + escapeHtml(key) + "</th><td style=\"padding:8px;border-bottom:1px solid #ddd\">" + escapeHtml(String(value)) + "</td></tr>").join("");
    try {
      const info = await transport.sendMail({ from, to: job.recipient, subject: template.subject ?? "New form submission", text: entries.map(([key,value]) => key + ": " + String(value)).join("\\n"), html: "<div style=\"font-family:Arial,sans-serif;max-width:680px;margin:auto\"><h2>New form submission</h2><p>" + escapeHtml(template.form_name ?? "Your form") + "</p><table style=\"width:100%;border-collapse:collapse\">" + rows + "</table><p style=\"color:#777;font-size:12px\">Sent by BuilderOS</p></div>" });
      await admin.from("email_delivery_jobs").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: info.messageId, last_error: null }).eq("id", job.id);
      sent++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.slice(0,1000) : "SMTP delivery failed";
      const terminal = job.attempts >= 6;
      await admin.from("email_delivery_jobs").update({ status: terminal ? "failed" : "retry", next_attempt_at: new Date(Date.now() + Math.min(3600,30 * (2 ** Math.max(0,job.attempts - 1))) * 1000).toISOString(), last_error: message }).eq("id",job.id);
      if (terminal) failed++; else retried++;
    }
  }
  await transport.close();
  return NextResponse.json({ processed: (jobs ?? []).length, sent, retried, failed });
}