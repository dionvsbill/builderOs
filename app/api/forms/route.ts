import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
const hashKey = (value: string) => createHash("sha256").update(value).digest("hex");
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { projectId?: string; name?: string } | null;
  if (!body?.projectId || typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 120)
    return NextResponse.json({ error: "A project and a valid form name are required." }, { status: 400 });
  const accessKey = randomBytes(32).toString("base64url");
  const { data, error } = await supabase.from("forms").insert({
    project_id: body.projectId, name: body.name.trim(), access_key_hash: hashKey(accessKey),
    schema: { version: 1, fields: [] },
    settings: { submit_label: "Submit", success_message: "Thank you. Your response has been received.", notification_enabled: false },
    status: "draft"
  }).select("id,name,status,created_at,schema,settings").single();
  if (error) return NextResponse.json({ error: "Unable to create form. Confirm that you have editor access to this project." }, { status: 403 });
  return NextResponse.json({ form: data, accessKey }, { status: 201 });
}