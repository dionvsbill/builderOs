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
  const { data: projectId, error } = await supabase.rpc("create_starter_workspace", {
    workspace_name: name,
    workspace_slug: slug
  });
  if (error || !projectId) throw new Error(error?.message ?? "Could not create your workspace.");
  redirect(`/editor/${projectId}`);
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("projectName") ?? "").trim().slice(0, 120);
  const type = String(formData.get("projectType") ?? "website");
  if (!workspaceId || !name || !["website", "form", "store"].includes(type)) {
    throw new Error("Choose a workspace, project name and valid project type.");
  }
  const { data: projectId, error } = await supabase.rpc("create_workspace_project", {
    target_workspace_id: workspaceId,
    project_name: name,
    target_project_type: type
  });
  if (error || !projectId) throw new Error(error?.message ?? "Could not create project.");
  redirect(`/editor/${projectId}`);
}
