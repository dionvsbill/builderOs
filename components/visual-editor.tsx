"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AIStudio } from "@/components/ai-studio";
import {
  DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown, ArrowRight, ArrowUp, Bell, ChevronDown, ChevronRight, CircleHelp,
  Code2, Eye, FileText, Globe2, Grid2X2, Image as ImageIcon, Layers3, Monitor,
  MousePointer2, Plus, Redo2, Search, Settings2, Smartphone, Sparkles, Tablet,
  Type, Undo2, WandSparkles, X, GripVertical, Trash2, History, Menu, SlidersHorizontal
} from "lucide-react";

type BlockKind = "heading" | "text" | "button" | "image" | "section";
type Block = {
  id: string; kind: BlockKind; label: string; content: string;
  styles: { align?: "left" | "center" | "right"; width?: string; opacity?: number; radius?: number; animation?: "none" | "fade-up" | "fade-in" | "slide-left" | "slide-right" | "zoom-in" | "float" | "reveal" };
};

const STORAGE_KEY = "builderos:starter-document:v1";
const starterBlocks: Block[] = [
  { id: "hero-title", kind: "heading", label: "Main heading", content: "Make your next big idea real.", styles: { align: "left", width: "100%", opacity: 100, radius: 0 } },
  { id: "hero-copy", kind: "text", label: "Supporting text", content: "A beautiful starting point for your business. Tell visitors what makes you different.", styles: { align: "left", width: "100%", opacity: 100, radius: 0 } },
  { id: "hero-button", kind: "button", label: "Primary button", content: "Get started", styles: { align: "left", width: "auto", opacity: 100, radius: 4 } }
];
const library: { kind: BlockKind; label: string; icon: typeof Type }[] = [
  { kind: "section", label: "Section", icon: Layers3 }, { kind: "heading", label: "Heading", icon: Type },
  { kind: "text", label: "Paragraph", icon: FileText }, { kind: "button", label: "Button", icon: MousePointer2 },
  { kind: "image", label: "Image", icon: ImageIcon }
];
const sectionNames = ["Header", "Hero", "Features", "About", "Services", "Testimonials", "FAQ", "Contact", "Footer"];
const pageTemplates: { name: string; description: string; blocks: Omit<Block, "id">[] }[] = [
  { name: "Business landing", description: "Hero, services, proof and contact", blocks: [
    { kind: "heading", label: "Hero heading", content: "Build a business that moves people.", styles: { align: "center", width: "100%" } },
    { kind: "text", label: "Hero introduction", content: "A clear promise, a confident story and a better experience for every customer.", styles: { align: "center", width: "80%" } },
    { kind: "button", label: "Primary call to action", content: "Get started", styles: { align: "center", width: "auto", radius: 10 } },
    { kind: "section", label: "Our services", content: "OUR SERVICES · Show visitors what you do and how you help.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Why choose us", content: "WHY CHOOSE US · Share your strongest differentiators and proof.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Testimonials", content: "CUSTOMER STORIES · Add authentic reviews and customer outcomes.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Contact", content: "LET'S TALK · Add your contact details and a clear next step.", styles: { align: "left", width: "100%" } }
  ] },
  { name: "Portfolio", description: "Personal introduction and work showcase", blocks: [
    { kind: "heading", label: "Portfolio introduction", content: "Selected work. Thoughtful ideas. Real impact.", styles: { align: "left", width: "100%" } },
    { kind: "text", label: "About me", content: "I'm a creative professional helping ambitious ideas become meaningful digital experiences.", styles: { align: "left", width: "80%" } },
    { kind: "section", label: "Featured projects", content: "FEATURED WORK · Present your best projects with imagery and outcomes.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Services", content: "WHAT I DO · Describe your skills, services and process.", styles: { align: "left", width: "100%" } },
    { kind: "button", label: "Contact button", content: "Work with me", styles: { align: "left", width: "auto", radius: 8 } }
  ] },
  { name: "Product launch", description: "Product story and conversion sections", blocks: [
    { kind: "heading", label: "Product headline", content: "Meet the product made for your next big move.", styles: { align: "center", width: "100%" } },
    { kind: "text", label: "Product promise", content: "A concise explanation of the product's most valuable outcome.", styles: { align: "center", width: "80%" } },
    { kind: "button", label: "Launch call to action", content: "Explore the product", styles: { align: "center", width: "auto", radius: 12 } },
    { kind: "section", label: "Key benefits", content: "KEY BENEFITS · Explain the outcomes customers can expect.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "How it works", content: "HOW IT WORKS · Explain the experience in simple steps.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Plans and pricing", content: "PLANS · Present transparent options and what is included.", styles: { align: "left", width: "100%" } },
    { kind: "section", label: "Frequently asked questions", content: "FAQ · Answer the questions that help customers decide.", styles: { align: "left", width: "100%" } }
  ] }
];
function makeId() { return `block-${Math.random().toString(36).slice(2, 10)}`; }

function SortableBlock({ block, selected, preview, onSelect, onContent }: {
  block: Block; selected: boolean; preview: boolean; onSelect: () => void; onContent: (value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled: preview });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 };
  const editable = block.kind === "heading" || block.kind === "text";
  return <div ref={setNodeRef} style={style} className={`canvas-block ${selected && !preview ? "selected-block" : ""} ${preview ? `motion-${block.styles.animation ?? "none"}` : ""}`} onClick={onSelect}>
    {!preview && <button className="drag-handle" aria-label={`Drag ${block.label}`} {...attributes} {...listeners}><GripVertical size={14} /></button>}
    {block.kind === "heading" ? <h1 contentEditable={!preview} suppressContentEditableWarning onBlur={(e) => onContent(e.currentTarget.textContent ?? "")} style={{ textAlign: block.styles.align, opacity: (block.styles.opacity ?? 100) / 100 }}>{block.content}</h1>
      : block.kind === "text" ? <p contentEditable={!preview} suppressContentEditableWarning onBlur={(e) => onContent(e.currentTarget.textContent ?? "")} style={{ textAlign: block.styles.align, opacity: (block.styles.opacity ?? 100) / 100 }}>{block.content}</p>
      : block.kind === "button" ? <div style={{ textAlign: block.styles.align }}><button className="hero-cta" style={{ borderRadius: block.styles.radius }}>{block.content}<ArrowRight size={16} /></button></div>
      : block.kind === "image" ? <div className="image-placeholder"><ImageIcon size={22} />{block.content}<span>Image upload is added in the media library phase</span></div>
      : <div className="section-placeholder">{block.content}</div>}
    {selected && !preview && <span className="selection-tag">{block.label}</span>}
  </div>;
}

type EditorProps = { projectId?: string; pageId?: string; initialRevision?: number; initialBlocks?: Block[]; initialSiteName?: string };

export default function Home({ projectId, pageId, initialRevision = 1, initialBlocks, initialSiteName }: EditorProps = {}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks?.length ? initialBlocks : starterBlocks);
  const [selected, setSelected] = useState("hero-title");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"add" | "layers">("add");
  const [mobilePanel, setMobilePanel] = useState<"elements" | "properties" | null>(null);
  const [siteName, setSiteName] = useState(initialSiteName ?? "Untitled website");
  const [revision, setRevision] = useState(initialRevision);
  const [saveError, setSaveError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<{id:string;revision:number;created_at:string;created_by:string|null}[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishUrl, setPublishUrl] = useState("");
  const [publishError, setPublishError] = useState("");
  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const [hydrated, setHydrated] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const current = useMemo(() => blocks.find((b) => b.id === selected) ?? null, [blocks, selected]);
  const latestSnapshotRef = useRef("");
  latestSnapshotRef.current = JSON.stringify({ blocks, siteName });

  useEffect(() => {
    if (!projectId) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { blocks?: Block[]; siteName?: string };
          if (Array.isArray(parsed.blocks) && parsed.blocks.length) setBlocks(parsed.blocks);
          if (typeof parsed.siteName === "string") setSiteName(parsed.siteName);
        }
      } catch { /* Invalid local recovery data is ignored. */ }
    } else {
      setBlocks(initialBlocks?.length ? initialBlocks : starterBlocks);
      setSiteName(initialSiteName ?? "Untitled website");
      setRevision(initialRevision);
    }
    setHydrated(true);
  }, [projectId, pageId, initialRevision, initialBlocks, initialSiteName]);

  useEffect(() => {
    if (!hydrated || saved) return;
    const snapshot = JSON.stringify({ blocks, siteName });
    const timer = window.setTimeout(async () => {
      const document = { version: 1, children: blocks };
      try {
        const recoveryKey = projectId ? `${STORAGE_KEY}:${projectId}` : STORAGE_KEY;
        window.localStorage.setItem(recoveryKey, JSON.stringify({ blocks, siteName, updatedAt: new Date().toISOString() }));
      } catch { /* Cloud save remains authoritative when local storage is unavailable. */ }
      if (projectId && pageId) {
        try {
          const projectResponse = await fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: siteName }) });
          if (!projectResponse.ok) { const projectResult = await projectResponse.json() as { error?: string }; throw new Error(projectResult.error ?? "Could not save project name."); }
          const response = await fetch(`/api/projects/${projectId}/pages/${pageId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expectedRevision: revision, document })
          });
          const result = await response.json() as { revision?: number; error?: string };
          if (!response.ok) {
            setSaveError(result.error ?? "Could not save this page.");
            setSaved(false);
            return;
          }
          if (typeof result.revision === "number") setRevision(result.revision);
          if (latestSnapshotRef.current !== snapshot) return;
          setSaveError("");
          setSaved(true);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : "Connection interrupted. Your latest changes are saved in this browser.");
          setSaved(false);
        }
      } else {
        setSaved(true);
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [blocks, siteName, saved, hydrated, projectId, pageId, revision]);

  async function toggleHistory() {
    if (!projectId || !pageId) { setRestoreError("Version history is available after you create a cloud project."); setHistoryOpen(true); return; }
    const nextOpen = !historyOpen;
    setHistoryOpen(nextOpen);
    if (!nextOpen) return;
    setHistoryLoading(true); setRestoreError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/pages/${pageId}/revisions`, { cache: "no-store" });
      const result = await response.json() as { revisions?: typeof revisions; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load revision history.");
      setRevisions(result.revisions ?? []);
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Could not load revision history.");
    } finally { setHistoryLoading(false); }
  }

  async function restoreRevision(revisionId: string) {
    if (!projectId || !pageId || !window.confirm("Restore this revision? Your current version will be preserved as a new revision.")) return;
    setHistoryLoading(true); setRestoreError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/pages/${pageId}/revisions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, expectedRevision: revision })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not restore revision.");
      window.location.reload();
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Could not restore revision.");
    } finally { setHistoryLoading(false); }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function commit(next: Block[]) {
    setHistory((items) => [...items.slice(-49), blocks]);
    setFuture([]);
    setBlocks(next);
    setSaved(false);
  }
  function applyTemplate(template: typeof pageTemplates[number]) {
    if (!window.confirm(`Load the "${template.name}" template? This replaces the current page content. You can use Undo to reverse it.`)) return;
    const next = template.blocks.map((block) => ({ ...block, id: makeId(), styles: { ...block.styles, animation: "fade-up" as const } }));
    commit(next);
    setSelected(next[0]?.id ?? "");
    setPreview(false);
  }

  function addBlock(kind: BlockKind, namedSection?: string) {
    const label = namedSection ?? library.find((item) => item.kind === kind)?.label ?? "Element";
    const content = kind === "heading" ? "Your new heading" : kind === "text" ? "Write something meaningful for your visitors." : kind === "button" ? "Learn more" : kind === "image" ? "Add your image" : `${label} section`;
    const block: Block = { id: makeId(), kind, label, content, styles: { align: "left", width: "100%", opacity: 100, radius: 8 } };
    commit([...blocks, block]); setSelected(block.id);
  }
  function updateBlock(id: string, patch: Partial<Block> | { styles: Partial<Block["styles"]> }) {
    commit(blocks.map((block) => block.id === id
      ? { ...block, ...patch, styles: { ...block.styles, ...( "styles" in patch ? patch.styles : {}) } }
      : block));
  }
  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    commit(arrayMove(blocks, index, nextIndex));
  }
  function undo() {
    if (!history.length) return;
    setFuture((items) => [blocks, ...items]); setBlocks(history[history.length - 1]);
    setHistory((items) => items.slice(0, -1)); setSaved(false);
  }
  function redo() {
    if (!future.length) return;
    setHistory((items) => [...items, blocks]); setBlocks(future[0]);
    setFuture((items) => items.slice(1)); setSaved(false);
  }
  async function publishSite() {
    if (!projectId || publishBusy) return;
    setPublishBusy(true); setPublishError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Publishing failed.");
      setPublishUrl(result.url);
    } catch (error) { setPublishError(error instanceof Error ? error.message : "Publishing failed."); }
    finally { setPublishBusy(false); }
  }
  function applyAIGeneratedBlocks(generated: Array<{ kind: BlockKind; label: string; content: string; styles: Block["styles"] }>) {
    if (!window.confirm(`Replace the current page with ${generated.length} AI-generated elements? Your previous version remains available through Undo and cloud revision history.`)) return;
    const next = generated.map((block) => ({ ...block, id: makeId() }));
    commit(next);
    setSelected(next[0]?.id ?? "");
    setDevice("desktop");
    setPreview(false);
    setAiOpen(false);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    if (from >= 0 && to >= 0) commit(arrayMove(blocks, from, to));
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-area">
        <div className="brand-mark"><Layers3 size={19} strokeWidth={2.4} /></div>
        <span className="brand-name">builder<span>OS</span></span><span className="top-divider" />
        {editingName ? <input className="site-name-input" value={siteName} autoFocus onChange={(e) => { setSiteName(e.target.value); setSaved(false); }} onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} /> : <button className="site-name" onClick={() => setEditingName(true)}>{siteName}<ChevronDown size={14} /></button>}
        <span className="save-indicator"><span className={saved ? "save-dot" : "save-dot pending"} />{saved ? (projectId ? "Saved to cloud" : "Saved locally") : saveError ? "Save issue" : "Saving…"}</span>
      </div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Undo" onClick={undo} disabled={!history.length}><Undo2 size={17} /></button>
        <button className="icon-button" aria-label="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17} /></button><span className="top-divider" />
        <button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button><button className="icon-button" aria-label="Notifications"><Bell size={17} /></button>
        <button className="avatar">B</button>{projectId && <button className="icon-button" aria-label="Version history" onClick={toggleHistory}><History size={17}/></button>}<button className="preview-button" onClick={() => setAiOpen(true)}><Sparkles size={15} />AI Studio</button><button className="preview-button" onClick={() => setPreview(!preview)}><Eye size={15} />{preview ? "Edit" : "Preview"}</button>
        <button className="publish-button" onClick={publishSite} disabled={!projectId || publishBusy}><Globe2 size={15} />{publishBusy ? "Publishing…" : "Publish"}</button>{publishUrl && <a href={publishUrl} target="_blank" rel="noreferrer" style={{fontSize:10,color:"#9edfc7",whiteSpace:"nowrap"}}>Live site ↗</a>}{publishError && <span role="alert" style={{fontSize:10,color:"#ffadb4"}}>{publishError}</span>}
      </div>
    </header>
    {aiOpen && <AIStudio currentBlocks={blocks} onApply={applyAIGeneratedBlocks} onClose={() => setAiOpen(false)} />}
    {historyOpen && <div className="revision-popover"><div className="revision-popover-head"><strong>Version history</strong><button type="button" onClick={()=>setHistoryOpen(false)} aria-label="Close history"><X size={15}/></button></div>{historyLoading?<p>Loading revisions…</p>:revisions.length===0?<p>No saved revisions yet. Make a change to create the first version.</p>:<div className="revision-list">{revisions.map(item=><div className="revision-item" key={item.id}><span><strong>Version {item.revision}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span><button type="button" onClick={()=>restoreRevision(item.id)} disabled={historyLoading||item.revision===revision}>Restore</button></div>)}</div>}{restoreError&&<p className="revision-error">{restoreError}</p>}</div>}
    <div className="workspace">
      <aside className={`left-panel ${mobilePanel === "elements" ? "mobile-open" : ""}`}>
        <div className="panel-tabs">
          <button className={activeTab === "add" ? "panel-tab active" : "panel-tab"} onClick={() => setActiveTab("add")}><Plus size={16} />Add</button>
          <button className={activeTab === "layers" ? "panel-tab active" : "panel-tab"} onClick={() => setActiveTab("layers")}><Layers3 size={16} />Layers</button>
        </div>
        {activeTab === "add" ? <>
          <div className="panel-heading"><div><h2>Elements</h2><p>Build your page</p></div><button className="subtle-icon" aria-label="Search elements"><Search size={16} /></button></div>
          <div className="element-grid">{library.map(({ kind, label, icon: Icon }) => <button key={kind} className="element-tile" onClick={() => addBlock(kind)}><Icon size={19} /><span>{label}</span></button>)}</div>
          <div className="library-section"><div className="section-label">PAGE SECTIONS</div>{sectionNames.map((name) => <button className="library-row" key={name} onClick={() => addBlock("section", name)}><Grid2X2 size={15} /><span>{name}</span><Plus size={14} /></button>)}</div>
          <div className="library-section"><div className="section-label">STARTER TEMPLATES</div>{pageTemplates.map((template) => <button className="library-row template-row" key={template.name} title={template.description} onClick={() => applyTemplate(template)}><Layers3 size={15} /><span>{template.name}<small>{template.description}</small></span><Plus size={14} /></button>)}</div>
          <div className="left-panel-foot"><Sparkles size={15} /><span>{projectId ? "Cloud sync and browser recovery are enabled." : "Changes are recovered in this browser. Cloud sync is next."}</span></div>
        </> : <div className="layers-list"><div className="panel-heading"><div><h2>Layers</h2><p>{blocks.length} elements on page</p></div></div>{blocks.map((block, index) => <div key={block.id} className={selected === block.id ? "layer-row selected" : "layer-row"}><button onClick={() => setSelected(block.id)}><span className="layer-bullet" />{block.label}</button><div><button aria-label="Move up" onClick={() => move(index, -1)}><ArrowUp size={13} /></button><button aria-label="Move down" onClick={() => move(index, 1)}><ArrowDown size={13} /></button><button aria-label="Delete" onClick={() => { commit(blocks.filter((b) => b.id !== block.id)); setSelected(""); }}><Trash2 size={13} /></button></div></div>)}</div>}
      </aside>
      <section className="editor-area">
        <div className="editor-toolbar"><div className="breadcrumb"><span>Pages</span><ChevronRight size={14} /><strong>Home</strong><ChevronDown size={14} /></div>
          <div className="device-switch"><button className={device === "desktop" ? "device active" : "device"} onClick={() => setDevice("desktop")} aria-label="Desktop"><Monitor size={16} /></button><button className={device === "tablet" ? "device active" : "device"} onClick={() => setDevice("tablet")} aria-label="Tablet"><Tablet size={16} /></button><button className={device === "mobile" ? "device active" : "device"} onClick={() => setDevice("mobile")} aria-label="Mobile"><Smartphone size={16} /></button></div><span className="zoom-label">100%</span>
        </div>
        <div className="canvas-scroll"><div className={`website-canvas ${device} ${preview ? "preview-mode" : ""}`}>
          {!preview && <div className="canvas-site-nav"><div className="mock-logo">NORTHSTAR<span>.</span></div><div className="mock-links"><span>Home</span><span>About</span><span>Services</span><span>Contact</span></div><button className="mock-nav-cta">Let's talk <ArrowRight size={13} /></button></div>}
          <div className="hero-canvas"><div className="hero-kicker"><span /> A NEW WAY FORWARD</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => <SortableBlock key={block.id} block={block} selected={selected === block.id} preview={preview} onSelect={() => setSelected(block.id)} onContent={(value) => { if (value !== block.content) updateBlock(block.id, { content: value }); }} />)}
              </SortableContext>
            </DndContext>
            {!preview && <button className="canvas-add" onClick={() => addBlock("heading")}><Plus size={15} />Add element</button>}
            <div className="hero-meta"><span>DESIGNED WITH INTENTION</span><span>SCROLL TO EXPLORE ↓</span></div>
          </div>
          {!preview && <div className="canvas-bottom"><span>© 2026 BUILDEROS</span><span>MADE FOR WHAT'S NEXT</span></div>}
        </div></div>
        <div className="statusbar"><span><span className="status-dot" />{saved ? (projectId ? "Document saved to cloud" : "Document saved locally") : saveError || "Saving changes…"}</span><span>Drag the grip on any selected block to reorder it</span></div>
      </section>
      <aside className={`right-panel ${mobilePanel === "properties" ? "mobile-open" : ""}`}>
        <div className="right-panel-header"><div><h2>Properties</h2><p>{current ? current.label : "Select an element"}</p></div><button className="subtle-icon"><Settings2 size={17} /></button></div>
        {current ? <div className="properties-content">
          <div className="property-group"><div className="property-title">CONTENT</div><label className="field-label">Text content</label><textarea className="content-input" value={current.content} onChange={(e) => updateBlock(current.id, { content: e.target.value })} rows={4} /></div>
          <div className="property-group"><div className="property-title">LAYOUT</div><label className="field-label">Width</label><select className="content-input" value={current.styles.width ?? "100%"} onChange={(e) => updateBlock(current.id, { styles: { width: e.target.value } })}><option value="auto">Auto</option><option value="100%">100%</option><option value="80%">80%</option><option value="50%">50%</option></select><label className="field-label spaced">Text alignment</label><div className="segmented">{(["left", "center", "right"] as const).map((align) => <button key={align} className={current.styles.align === align ? "chosen" : ""} onClick={() => updateBlock(current.id, { styles: { align } })}>{align}</button>)}</div></div>
          <div className="property-group"><div className="property-title">APPEARANCE</div><label className="field-label">Opacity · {current.styles.opacity ?? 100}%</label><input type="range" min="10" max="100" value={current.styles.opacity ?? 100} onChange={(e) => updateBlock(current.id, { styles: { opacity: Number(e.target.value) } })} className="range-control" /><label className="field-label spaced">Border radius · {current.styles.radius ?? 0}px</label><input type="range" min="0" max="40" value={current.styles.radius ?? 0} onChange={(e) => updateBlock(current.id, { styles: { radius: Number(e.target.value) } })} className="range-control" /></div>
          <div className="property-group"><div className="property-title">MOTION & INTERACTION</div><label className="field-label">Entrance animation</label><select className="content-input" value={current.styles.animation ?? "none"} onChange={(e) => updateBlock(current.id, { styles: { animation: e.target.value as NonNullable<Block["styles"]["animation"]> } })}><option value="none">No animation</option><option value="fade-up">Fade up</option><option value="fade-in">Fade in</option><option value="slide-left">Slide from left</option><option value="slide-right">Slide from right</option><option value="zoom-in">Zoom in</option><option value="float">Gentle float</option><option value="reveal">Reveal</option></select><p className="field-hint">Animations currently run in editor Preview; published-site motion support is a separate renderer integration step.</p></div>
          <div className="property-group"><div className="property-title">ADVANCED</div><button className="advanced-row"><Code2 size={15} />Custom CSS <ChevronRight size={14} /></button><button className="advanced-row" onClick={() => setPreview(true)}><WandSparkles size={15} />Preview interactions <ChevronRight size={14} /></button></div>
        </div> : <div className="empty-properties"><MousePointer2 size={22} /><strong>Nothing selected</strong><span>Select an element on the canvas to edit its properties.</span></div>}
      </aside>
    </div>
    <nav className="mobile-editor-nav" aria-label="Editor navigation">
      <button type="button" className={mobilePanel === "elements" ? "active" : ""} onClick={() => { setMobilePanel(mobilePanel === "elements" ? null : "elements"); setActiveTab("add"); }}><Menu size={17} />Elements</button>
      <button type="button" className={!mobilePanel ? "active" : ""} onClick={() => setMobilePanel(null)}><Monitor size={17} />Canvas</button>
      <button type="button" className={mobilePanel === "properties" ? "active" : ""} onClick={() => setMobilePanel(mobilePanel === "properties" ? null : "properties")}><SlidersHorizontal size={17} />Properties</button>
    </nav>
  </main>;
}
