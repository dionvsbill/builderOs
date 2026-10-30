import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicForm } from "@/components/public-form";
export const dynamic = "force-dynamic";
export default async function PublicFormPage({ params }: { params: { accessKey: string } }) {
  const hash = createHash("sha256").update(params.accessKey).digest("hex");
  const admin = createAdminClient();
  const { data: form } = await admin.from("forms").select("name").eq("access_key_hash", hash).eq("status", "published").maybeSingle();
  if (!form) notFound();
  return <main style={{ minHeight: "100vh", background: "#f4f6fa", color: "#172033", padding: "48px 16px", fontFamily: "Inter,Arial,sans-serif" }}>
    <div style={{ maxWidth: 680, margin: "0 auto" }}><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#6177a8", marginBottom: 12 }}>POWERED BY BUILDEROS</div><h1 style={{ fontSize: 32, margin: "0 0 24px" }}>{form.name}</h1><PublicForm accessKey={params.accessKey} /></div>
  </main>;
}