import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const csvCell = (value: unknown) => {
  let text = typeof value === "string" ? value : value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+@\\-\\t\\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

export async function GET(_request: Request, { params }: { params: { projectId: string } }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: project } = await supabase.from("projects")
    .select("id,workspace_id,name")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: membership } = await supabase.from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and administrators can export submissions." }, { status: 403 });
  }

  const { data: forms, error: formsError } = await supabase.from("forms")
    .select("id,name")
    .eq("project_id", project.id);
  if (formsError) return NextResponse.json({ error: "Unable to load project forms." }, { status: 500 });
  const formIds = (forms ?? []).map(form => form.id);
  if (!formIds.length) {
    return new Response("Received at,Form,Submitter email,Status,Response data\r\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="builderos-submissions.csv"', "Cache-Control": "no-store" },
    });
  }

  const { data: submissions, error } = await supabase.from("form_submissions")
    .select("id,form_id,submitter_email,status,created_at,payload")
    .in("form_id", formIds)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) return NextResponse.json({ error: "Unable to export submissions." }, { status: 500 });

  const names = new Map((forms ?? []).map(form => [form.id, form.name]));
  const rows = [
    ["Received at", "Form", "Submitter email", "Status", "Response data"],
    ...(submissions ?? []).map(item => [
      item.created_at,
      names.get(item.form_id) ?? "Form",
      item.submitter_email ?? "",
      item.status,
      JSON.stringify(item.payload ?? {}),
    ]),
  ];
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const filename = (project.name || "builderos").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-submissions.csv";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "no-store",
    },
  });
}
