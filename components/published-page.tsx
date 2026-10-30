"use client";

import { useState } from "react";

type Block = {
  id?: string; kind?: string; label?: string; content?: string;
  styles?: { align?: string; width?: string; opacity?: number; radius?: number; animation?: string };
};

export function PublishedPage({ name, blocks }: { name: string; blocks: Block[] }) {
  const [sent, setSent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  async function submit(block: Block, form: HTMLFormElement) {
    const content = block.content ?? "";
    const key = content.match(/accessKey=([^&\\s]+)/)?.[1];
    const type = content.match(/workflow=([a-z]+)/)?.[1] ?? "custom";
    const id = block.id ?? "form";
    if (!key) { setSent(old => ({ ...old, [id]: "Configure this form with a published BuilderOS access key." })); return; }
    const data = new FormData(form);
    const values: Record<string, string> = {};
    data.forEach((value, field) => { if (typeof value === "string") values[field] = value; });
    setBusy(old => ({ ...old, [id]: true }));
    try {
      const response = await fetch("/api/workflows/" + type + "/" + encodeURIComponent(key), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, website: values.website ?? "" })
      });
      const result = await response.json() as { error?: string; message?: string };
      setSent(old => ({ ...old, [id]: response.ok ? (result.message ?? "Thank you. Your response has been received.") : (result.error ?? "Submission failed.") }));
      if (response.ok) form.reset();
    } catch {
      setSent(old => ({ ...old, [id]: "Network error. Please try again." }));
    } finally { setBusy(old => ({ ...old, [id]: false })); }
  }
  const motion = (value?: string) => {
    const names: Record<string, string> = { "fade-up": "bos-fade-up", "fade-in": "bos-fade-in", "slide-left": "bos-slide-left", "slide-right": "bos-slide-right", "zoom-in": "bos-zoom-in" };
    return value ? names[value] : undefined;
  };
  return <main className="bos-published">
    <header className="bos-published-header"><strong>{name}</strong><nav><a href="#top">Home</a><a href="#content">Content</a></nav></header>
    <section id="top" className="bos-published-content"><div id="content" className="bos-published-blocks">
      {blocks.map((block, index) => {
        const id = block.id ?? String(index);
        const style = { textAlign: (block.styles?.align ?? "left") as "left" | "center" | "right", width: block.styles?.width ?? "100%", opacity: (block.styles?.opacity ?? 100) / 100, borderRadius: block.styles?.radius ?? 0, margin: "0 auto" };
        if (block.kind === "heading") return <h1 key={id} className={motion(block.styles?.animation)} style={{ ...style, fontSize: "clamp(32px,6vw,62px)", lineHeight: 1.08, letterSpacing: -2.2, fontWeight: 800, maxWidth: 900 }}>{block.content}</h1>;
        if (block.kind === "text") return <p key={id} className={motion(block.styles?.animation)} style={{ ...style, fontSize: 17, lineHeight: 1.8, color: "#586579", maxWidth: 760 }}>{block.content}</p>;
        if (block.kind === "button") return <div key={id} className={motion(block.styles?.animation)} style={style}><a className="bos-published-cta" href="#contact">{block.content}</a></div>;
        if (block.kind === "image") return <img key={id} className={motion(block.styles?.animation)} src={block.content} alt={block.label ?? ""} style={{ display: "block", maxWidth: "100%", height: "auto", margin: "0 auto", borderRadius: block.styles?.radius ?? 10 }} />;
        if (block.kind === "form") return <form key={id} className="bos-form" onSubmit={event => { event.preventDefault(); void submit(block, event.currentTarget); }}>
          <h2>{block.label ?? "Send us a message"}</h2><p>{block.content?.split("|")[0] ?? "Complete the form below."}</p>
          {["name", "email", "phone", "message"].map(field => <label key={field}>{field === "name" ? "Full name" : field[0].toUpperCase() + field.slice(1)}{field === "message" ? <textarea name={field} rows={4} required /> : <input name={field} type={field === "email" ? "email" : "text"} required={field === "email" || field === "name"} />}</label>)}
          <label className="bos-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <button disabled={!!busy[id]}>{busy[id] ? "Sending…" : "Submit"}</button><p aria-live="polite">{sent[id] ?? ""}</p>
        </form>;
        return <section key={id} className={motion(block.styles?.animation) + " bos-published-section"} style={style}><h2>{block.label ?? "Section"}</h2><p>{block.content}</p></section>;
      })}
    </div></section>
    <footer id="contact" className="bos-published-footer">Published with BuilderOS</footer>
  </main>;
}
