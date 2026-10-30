"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, Box, Check, ChevronDown,
  ChevronRight, CircleHelp, Code2, Copy, Eye, FileText, Globe2, Grid2X2,
  Image as ImageIcon, Layers3, LayoutDashboard, Link2, Menu, Monitor,
  MousePointer2, Plus, Redo2, Search, Settings2, Smartphone, Sparkles,
  Tablet, Type, Undo2, Upload, WandSparkles, X
} from "lucide-react";

type BlockKind = "heading" | "text" | "button" | "image" | "section";
type Block = { id: string; kind: BlockKind; label: string; content: string };

const starterBlocks: Block[] = [
  { id: "hero-title", kind: "heading", label: "Main heading", content: "Make your next big idea real." },
  { id: "hero-copy", kind: "text", label: "Supporting text", content: "A beautiful starting point for your business. Tell visitors what makes you different." },
  { id: "hero-button", kind: "button", label: "Primary button", content: "Get started" }
];

const library: { kind: BlockKind; label: string; icon: typeof Type }[] = [
  { kind: "section", label: "Section", icon: Layers3 },
  { kind: "heading", label: "Heading", icon: Type },
  { kind: "text", label: "Paragraph", icon: FileText },
  { kind: "button", label: "Button", icon: MousePointer2 },
  { kind: "image", label: "Image", icon: ImageIcon }
];

function makeId() { return `block-${Math.random().toString(36).slice(2, 10)}`; }

export default function Home() {
  const [blocks, setBlocks] = useState<Block[]>(starterBlocks);
  const [selected, setSelected] = useState<string>("hero-title");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"add" | "layers">("add");
  const [siteName, setSiteName] = useState("Untitled website");
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);

  const current = useMemo(() => blocks.find((b) => b.id === selected) ?? null, [blocks, selected]);

  function commit(next: Block[]) {
    setHistory((h) => [...h.slice(-39), blocks]);
    setFuture([]);
    setBlocks(next);
    setSaved(false);
  }
  function addBlock(kind: BlockKind) {
    const label = library.find((x) => x.kind === kind)?.label ?? "Element";
    const content = kind === "heading" ? "Your new heading" : kind === "text" ? "Write something meaningful for your visitors." : kind === "button" ? "Learn more" : kind === "image" ? "Add your image" : "New section";
    const block = { id: makeId(), kind, label, content };
    commit([...blocks, block]);
    setSelected(block.id);
  }
  function updateContent(value: string) {
    if (!current) return;
    commit(blocks.map((b) => b.id === current.id ? { ...b, content: value } : b));
  }
  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    commit(next);
  }
  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture((f) => [blocks, ...f]);
    setHistory((h) => h.slice(0, -1));
    setBlocks(previous);
    setSaved(false);
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, blocks]);
    setBlocks(future[0]);
    setFuture((f) => f.slice(1));
    setSaved(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-area">
          <div className="brand-mark"><Layers3 size={19} strokeWidth={2.4} /></div>
          <span className="brand-name">builder<span>OS</span></span>
          <span className="top-divider" />
          {editingName ? <input className="site-name-input" value={siteName} autoFocus onChange={(e) => setSiteName(e.target.value)} onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingName(false)} /> : <button className="site-name" onClick={() => setEditingName(true)}>{siteName}<ChevronDown size={14} /></button>}
          <span className="save-indicator"><span className={saved ? "save-dot" : "save-dot pending"} />{saved ? "All changes saved" : "Unsaved changes"}</span>
        </div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Undo" onClick={undo} disabled={!history.length}><Undo2 size={17} /></button>
          <button className="icon-button" aria-label="Redo" onClick={redo} disabled={!future.length}><Redo2 size={17} /></button>
          <span className="top-divider" />
          <button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button>
          <button className="icon-button" aria-label="Notifications"><Bell size={17} /></button>
          <button className="avatar">B</button>
          <button className="preview-button" onClick={() => setPreview(!preview)}><Eye size={15} />{preview ? "Edit" : "Preview"}</button>
          <button className="publish-button" onClick={() => { setSaved(true); window.alert("Publishing will be connected to the BuilderOS publishing service in the next build phase."); }}><Globe2 size={15} />Publish</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-tabs">
            <button className={activeTab === "add" ? "panel-tab active" : "panel-tab"} onClick={() => setActiveTab("add")}><Plus size={16} />Add</button>
            <button className={activeTab === "layers" ? "panel-tab active" : "panel-tab"} onClick={() => setActiveTab("layers")}><Layers3 size={16} />Layers</button>
          </div>
          {activeTab === "add" ? <>
            <div className="panel-heading"><div><h2>Elements</h2><p>Build your page</p></div><button className="subtle-icon"><Search size={16} /></button></div>
            <div className="element-grid">
              {library.map(({ kind, label, icon: Icon }) => <button key={kind} className="element-tile" onClick={() => addBlock(kind)}><Icon size={19} /><span>{label}</span></button>)}
            </div>
            <div className="library-section"><div className="section-label">PAGE SECTIONS</div>{["Header", "Hero", "Features", "About", "Testimonials", "FAQ", "Contact", "Footer"].map((name) => <button className="library-row" key={name} onClick={() => addBlock("section")}><Grid2X2 size={15} /><span>{name}</span><Plus size={14} /></button>)}</div>
            <div className="left-panel-foot"><Sparkles size={15} /><span>More elements coming as the builder grows.</span></div>
          </> : <div className="layers-list"><div className="panel-heading"><div><h2>Layers</h2><p>{blocks.length} elements on page</p></div></div>{blocks.map((block, index) => <div key={block.id} className={selected === block.id ? "layer-row selected" : "layer-row"}><button onClick={() => setSelected(block.id)}><span className="layer-bullet" />{block.label}</button><div><button aria-label="Move up" onClick={() => move(index, -1)}><ArrowUp size={13} /></button><button aria-label="Move down" onClick={() => move(index, 1)}><ArrowDown size={13} /></button><button aria-label="Delete" onClick={() => { commit(blocks.filter((b) => b.id !== block.id)); setSelected(""); }}><X size={13} /></button></div></div>)}</div>}
        </aside>

        <section className="editor-area">
          <div className="editor-toolbar">
            <div className="breadcrumb"><span>Pages</span><ChevronRight size={14} /><strong>Home</strong><ChevronDown size={14} /></div>
            <div className="device-switch">
              <button className={device === "desktop" ? "device active" : "device"} onClick={() => setDevice("desktop")} aria-label="Desktop"><Monitor size={16} /></button>
              <button className={device === "tablet" ? "device active" : "device"} onClick={() => setDevice("tablet")} aria-label="Tablet"><Tablet size={16} /></button>
              <button className={device === "mobile" ? "device active" : "device"} onClick={() => setDevice("mobile")} aria-label="Mobile"><Smartphone size={16} /></button>
            </div>
            <span className="zoom-label">100%</span>
          </div>
          <div className="canvas-scroll">
            <div className={`website-canvas ${device} ${preview ? "preview-mode" : ""}`}>
              {!preview && <div className="canvas-site-nav"><div className="mock-logo">NORTHSTAR<span>.</span></div><div className="mock-links"><span>Home</span><span>About</span><span>Services</span><span>Contact</span></div><button className="mock-nav-cta">Let's talk <ArrowRight size={13} /></button></div>}
              <div className="hero-canvas">
                <div className="hero-kicker"><span /> A NEW WAY FORWARD</div>
                {blocks.map((block, index) => <div key={block.id} className={selected === block.id && !preview ? "canvas-block selected-block" : "canvas-block"} onClick={() => !preview && setSelected(block.id)}>
                  {block.kind === "heading" ? <h1 contentEditable={!preview} suppressContentEditableWarning onBlur={(e) => { const v = e.currentTarget.textContent ?? ""; if (v !== block.content) commit(blocks.map((b) => b.id === block.id ? { ...b, content: v } : b)); }}>{block.content}</h1> : block.kind === "text" ? <p contentEditable={!preview} suppressContentEditableWarning onBlur={(e) => { const v = e.currentTarget.textContent ?? ""; if (v !== block.content) commit(blocks.map((b) => b.id === block.id ? { ...b, content: v } : b)); }}>{block.content}</p> : block.kind === "button" ? <button className="hero-cta">{block.content}<ArrowRight size={16} /></button> : block.kind === "image" ? <div className="image-placeholder"><ImageIcon size={22} />{block.content}<span>Upload an image</span></div> : <div className="section-placeholder">{block.content}</div>}
                  {selected === block.id && !preview && <span className="selection-tag">{block.label}</span>}
                </div>)}
                {!preview && <button className="canvas-add" onClick={() => addBlock("heading")}><Plus size={15} />Add element</button>}
                <div className="hero-meta"><span>DESIGNED WITH INTENTION</span><span>SCROLL TO EXPLORE ↓</span></div>
              </div>
              {!preview && <div className="canvas-bottom"><span>© 2026 NORTHSTAR STUDIO</span><span>MADE FOR WHAT'S NEXT</span></div>}
            </div>
          </div>
          <div className="statusbar"><span><span className="status-dot" />Canvas ready</span><span>Autosave connection will be enabled with Supabase</span></div>
        </section>

        <aside className="right-panel">
          <div className="right-panel-header"><div><h2>Properties</h2><p>{current ? current.label : "Select an element"}</p></div><button className="subtle-icon"><Settings2 size={17} /></button></div>
          {current ? <div className="properties-content">
            <div className="property-group"><div className="property-title">CONTENT</div><label className="field-label">Text content</label><textarea className="content-input" value={current.content} onChange={(e) => updateContent(e.target.value)} rows={4} /></div>
            <div className="property-group"><div className="property-title">LAYOUT</div><label className="field-label">Width</label><div className="segmented"><button className="chosen">Auto</button><button>100%</button><button>Custom</button></div><label className="field-label spaced">Alignment</label><div className="segmented"><button className="chosen">Left</button><button>Center</button><button>Right</button></div></div>
            <div className="property-group"><div className="property-title">APPEARANCE</div><label className="field-label">Opacity</label><input type="range" min="0" max="100" defaultValue="100" className="range-control" /><label className="field-label spaced">Border radius</label><div className="value-input">12 <span>px</span></div></div>
            <div className="property-group"><div className="property-title">ADVANCED</div><button className="advanced-row"><Code2 size={15} />Custom CSS <ChevronRight size={14} /></button><button className="advanced-row"><WandSparkles size={15} />Animation <ChevronRight size={14} /></button></div>
          </div> : <div className="empty-properties"><MousePointer2 size={22} /><strong>Nothing selected</strong><span>Select an element on the canvas to edit its properties.</span></div>}
        </aside>
      </div>
    </main>
  );
}
