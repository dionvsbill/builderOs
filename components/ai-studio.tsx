"use client";

import { useState } from "react";

type DraftBlock = {
  kind: "heading" | "text" | "button" | "image" | "section";
  label: string;
  content: string;
  styles: { align: "left" | "center" | "right"; width: string; opacity: number; radius: number };
};
type ChatMessage = { role: "user" | "assistant"; content: string };
type WebLLMEngine = {
  chat: { completions: { create: (args: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    response_format?: { type: "json_object" };
  }) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }> } };
};
type WebLLMModule = { CreateMLCEngine: (model: string, options?: {
  initProgressCallback?: (report: { progress?: number; text?: string }) => void;
}) => Promise<WebLLMEngine> };

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const CDN_URL = "https://esm.run/@mlc-ai/web-llm";

export function AIStudio({ currentBlocks, onApply, onClose }: {
  currentBlocks: DraftBlock[];
  onApply: (blocks: DraftBlock[]) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [engine, setEngine] = useState<WebLLMEngine | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);

  async function loadModel() {
    if (engine || loadingModel) return;
    setError("");
    if (!(navigator as Navigator & { gpu?: unknown }).gpu) {
      setError("This browser does not expose WebGPU. Try a recent desktop Chrome or Edge browser with WebGPU enabled.");
      return;
    }
    setLoadingModel(true);
    setProgress("Loading the browser AI runtime…");
    try {
      const importModule = new Function("url", "return import(url)") as (url: string) => Promise<WebLLMModule>;
      const webllm = await importModule(CDN_URL);
      const instance = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => setProgress(report.text ?? `Downloading model ${Math.round((report.progress ?? 0) * 100)}%`)
      });
      setEngine(instance);
      setProgress("AI model ready on this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the local AI model. Check your connection, browser support and available device memory.");
      setProgress("");
    } finally {
      setLoadingModel(false);
    }
  }

  async function generate() {
    const request = prompt.trim();
    if (!request || loading) return;
    if (!engine) {
      setError("Load the browser AI model before generating a page.");
      return;
    }
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: request }];
    setMessages(nextMessages);
    setPrompt("");
    setLoading(true);
    setError("");
    try {
      const system = `You are BuilderOS AI Studio, a website layout assistant. Return only valid JSON with this exact shape: {"blocks":[{"kind":"heading|text|button|image|section","label":"short label","content":"visible text or image description","styles":{"align":"left|center|right","width":"100%|80%|50%|auto","opacity":100,"radius":0}}]}. Create a coherent, polished single-page website using only these supported block kinds. Include a clear heading, useful copy, calls to action and named sections as appropriate. Use 8 to 18 blocks for a full page, fewer for a simple request. Do not include HTML, CSS, scripts, markdown or extra keys. Keep each content value concise. Current page blocks: ${JSON.stringify(currentBlocks)}`;
      const response = await engine.chat.completions.create({
        messages: [
          { role: "system", content: system },
          ...nextMessages.map((message) => ({ role: message.role, content: message.content }))
        ],
        temperature: 0.35,
        response_format: { type: "json_object" }
      });
      const raw = response.choices[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as { blocks?: unknown };
      if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) throw new Error("The model did not return a valid page layout. Please try a more specific description.");
      const allowed = new Set(["heading", "text", "button", "image", "section"]);
      const blocks = parsed.blocks.slice(0, 40).flatMap((item, index): DraftBlock[] => {
        if (!item || typeof item !== "object") return [];
        const value = item as Record<string, unknown>;
        const styles = value.styles && typeof value.styles === "object" ? value.styles as Record<string, unknown> : {};
        const kind = typeof value.kind === "string" && allowed.has(value.kind) ? value.kind as DraftBlock["kind"] : "text";
        const align = styles.align === "center" || styles.align === "right" ? styles.align : "left";
        return [{
          kind,
          label: (typeof value.label === "string" ? value.label : kind).slice(0, 60),
          content: (typeof value.content === "string" ? value.content : "").slice(0, 2000),
          styles: {
            align,
            width: ["100%", "80%", "50%", "auto"].includes(String(styles.width)) ? String(styles.width) : "100%",
            opacity: typeof styles.opacity === "number" ? Math.min(100, Math.max(10, styles.opacity)) : 100,
            radius: typeof styles.radius === "number" ? Math.min(40, Math.max(0, styles.radius)) : 0
          }
        }];
      });
      if (!blocks.length) throw new Error("The generated layout did not contain supported BuilderOS elements.");
      setMessages([...nextMessages, { role: "assistant", content: `I've prepared a ${blocks.length}-element page. Review it, then apply it to the editor.` }]);
      onApply(blocks);
    } catch (cause) {
      setMessages(nextMessages);
      setError(cause instanceof Error ? cause.message : "Page generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="ai-studio-title" style={{ position: "fixed", inset: 0, zIndex: 100, background: "#05080dcc", display: "grid", placeItems: "center", padding: 14 }}>
    <section style={{ width: "min(100%, 680px)", maxHeight: "min(88vh, 820px)", overflow: "auto", background: "#111923", color: "#edf1f7", border: "1px solid #344257", borderRadius: 16, boxShadow: "0 25px 90px #000b", padding: 22 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><div style={{ color: "#9aafff", fontSize: 10, letterSpacing: 1.6, fontWeight: 800 }}>BROWSER-BASED GENERATIVE DESIGN</div><h2 id="ai-studio-title" style={{ margin: "7px 0 0", fontSize: 21 }}>BuilderOS AI Studio</h2></div>
        <button onClick={onClose} aria-label="Close AI Studio" style={buttonStyle}>Close</button>
      </header>
      <p style={{ color: "#9aa8bb", fontSize: 12, lineHeight: 1.7 }}>Generate a page on this device. The AI model is downloaded into your browser; prompts are processed locally after it loads.</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "17px 0" }}>
        <button onClick={loadModel} disabled={loadingModel || !!engine} style={primaryStyle}>{loadingModel ? "Loading model…" : engine ? "Local model ready" : "Load free browser AI"}</button>
        <span style={{ color: "#93a2b7", fontSize: 11 }}>{progress || "Qwen 2.5 · 1.5B · WebGPU"}</span>
      </div>
      <div aria-live="polite" style={{ display: "grid", gap: 9, maxHeight: 230, overflow: "auto", padding: 12, background: "#0c131d", border: "1px solid #283648", borderRadius: 9 }}>
        {messages.length === 0 ? <p style={{ color: "#8291a6", fontSize: 12, margin: 0 }}>Try: “Create a premium Ghana travel agency homepage with a booking call to action, services, testimonials and contact section.”</p> : messages.map((message, index) => <div key={index} style={{ justifySelf: message.role === "user" ? "end" : "start", maxWidth: "90%", padding: "9px 11px", borderRadius: 8, background: message.role === "user" ? "#253756" : "#192635", color: "#e3eaf5", fontSize: 12, lineHeight: 1.6 }}>{message.content}</div>)}
      </div>
      <label htmlFor="ai-studio-prompt" style={{ display: "block", margin: "15px 0 7px", fontSize: 11, color: "#c4cfdd" }}>Describe the website you want</label>
      <textarea id="ai-studio-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} placeholder="Describe your business, pages, sections, style and what visitors should do…" style={{ width: "100%", resize: "vertical", boxSizing: "border-box", background: "#0c131d", border: "1px solid #344257", borderRadius: 8, padding: 12, color: "#edf1f7", fontSize: 12, outline: "none" }} />
      {error && <p role="alert" style={{ color: "#ffadb4", fontSize: 11, lineHeight: 1.6 }}>{error}</p>}
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 13 }}>
        <span style={{ color: "#8190a5", fontSize: 10 }}>Generation replaces the current page after confirmation.</span>
        <button onClick={generate} disabled={!engine || loading || !prompt.trim()} style={primaryStyle}>{loading ? "Generating…" : "Generate page"}</button>
      </footer>
      <p style={{ color: "#748399", fontSize: 10, lineHeight: 1.6, marginBottom: 0 }}>First model download may be large and requires internet. WebGPU, device memory and browser compatibility vary. This is a local generation feature, not an unlimited cloud AI service.</p>
    </section>
  </div>;
}

const buttonStyle: React.CSSProperties = { background: "#1b283a", border: "1px solid #3a4a61", borderRadius: 7, padding: "8px 12px", color: "#cbd8f0", fontSize: 11 };
const primaryStyle: React.CSSProperties = { background: "#91a8ff", color: "#111827", border: 0, borderRadius: 7, padding: "10px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer" };
