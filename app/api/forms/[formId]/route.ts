import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
type Field = { id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string };
const allowedTypes = new Set(["text","email","textarea","number","phone","select","checkbox","date"]);
export async function PATCH(request: Request, { params }: { params: { formId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { name?: string; status?: string; schema?: { version?: number; fields?: Field[] }; settings?: Record<string, unknown> } | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    if (!body.name.trim() || body.name.length > 120) return NextResponse.json({ error: "Form name must be between 1 and 120 characters." }, { status: 400 });
    update.name = body.name.trim();
  }
  if (body.status !== undefined) {
    if (!["draft","published","paused"].includes(body.status)) return NextResponse.json({ error: "Invalid form status." }, { status: 400 });
    update.status = body.status;
  }
  if (body.schema !== undefined) {
    const fields = body.schema.fields;
    if (body.schema.version !== 1 || !Array.isArray(fields) || fields.length > 60) return NextResponse.json({ error: "Invalid form schema." }, { status: 400 });
    const ids = new Set<string>();
    for (const field of fields) {
      if (!field || typeof field.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(field.id) || ids.has(field.id) ||
          !allowedTypes.has(field.type) || typeof field.label !== "string" || !field.label.trim() || field.label.length > 120 ||
          (field.options !== undefined && (!Array.isArray(field.options) || field.options.length > 30 || field.options.some(o => typeof o !== "string" || o.length > 100))))
        return NextResponse.json({ error: "One or more fields are invalid." }, { status: 400 });
      ids.add(field.id);
    }
    update.schema = { version: 1, fields };
  }
  if (body.settings !== undefined) {
    if (!body.settings || typeof body.settings !== "object" || JSON.stringify(body.settings).length > 8000)
      return NextResponse.json({ error: "Invalid form settings." }, { status: 400 });
    update.settings = body.settings;
  }
  update.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from("forms").update(update).eq("id", params.formId).select("id,name,status,schema,settings,updated_at").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Form not found or you do not have permission to edit it." }, { status: 404 });
  return NextResponse.json({ form: data });
}