"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "my-workspace";
}

export async function createStarterWorkspace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  const rawName = String(formData.get("workspaceName") ?? "").trim();
  const name = rawName.slice(0, 120) || "My workspace";
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: workspace, error: workspaceError } = await supabase.from("workspaces")
    .insert({ name, slug, owner_id: user.id }).select("id").single();
  if (workspaceError || !workspace) throw new Error(workspaceError?.message ?? "Could not create workspace.");

  const { error: memberError } = await supabase.from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });
  if (memberError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    throw new Error(memberError.message);
  }

  const { data: project, error: projectError } = await supabase.from("projects")
    .insert({ workspace_id: workspace.id, name: "My first website", project_type: "website", created_by: user.id })
    .select("id").single();
  if (projectError || !project) throw new Error(projectError?.message ?? "Workspace created, but starter project creation failed.");

  const { error: pageError } = await supabase.from("pages").insert({
    project_id: project.id, name: "Home", path: "/", revision: 1,
    document: { version: 1, children: [
      { id: "hero-title", type: "heading", content: "Make your next big idea real." },
      { id: "hero-copy", type: "text", content: "A beautiful starting point for your business." },
      { id: "hero-button", type: "button", content: "Get started" }
    ] }, updated_by: user.id
  });
  if (pageError) throw new Error(pageError.message);
  redirect("/");
}
