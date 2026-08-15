/* Page design: "精密工作台" — a focused, paper-on-graphite LogoCraft editor with amber precision cues. */
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Circle,
  Download,
  Eye,
  FileDown,
  Grid2X2,
  ImageUp,
  Layers3,
  MousePointer2,
  MoveUpRight,
  Plus,
  RotateCcw,
  Shapes,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const BRAND_MARK = "/manus-storage/logocraft-mark_c3af8c50.png";
const SPECIMEN_ARC = "/manus-storage/logocraft-specimen-arc_f9421857.png";
const SPECIMEN_ORBIT = "/manus-storage/logocraft-specimen-orbit_a365a6e9.png";
const CANVAS = { width: 720, height: 520 };

type ElementType = "mark" | "text" | "shape" | "image";
type AssetKind = "pointer" | "shapes" | "text" | "upload";

type DesignElement = {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  shape?: "spark" | "circle" | "square" | "arc";
  src?: string;
};

const initialElements: DesignElement[] = [
  { id: "craft-mark", type: "mark", name: "LogoCraft 标记", x: 248, y: 142, width: 224, height: 174, rotation: 0, fill: "#1C1A18" },
  { id: "craft-word", type: "text", name: "LogoCraft 字标", x: 202, y: 335, width: 316, height: 64, rotation: 0, fill: "#1C1A18", content: "LogoCraft", fontSize: 46, fontFamily: "DM Sans" },
  { id: "craft-line", type: "shape", name: "定位点", x: 520, y: 392, width: 18, height: 18, rotation: 0, fill: "#FF6B35", shape: "circle" },
];

const palettes = [
  { name: "熔岩琥珀", color: "#FF6B35" },
  { name: "墨黑", color: "#1C1A18" },
  { name: "纸白", color: "#FBF8F2" },
  { name: "苔藓绿", color: "#44624A" },
  { name: "深青", color: "#25394A" },
  { name: "赭红", color: "#A64131" },
];

const shapeTemplates: Array<Pick<DesignElement, "name" | "shape" | "fill" | "width" | "height">> = [
  { name: "圆形", shape: "circle", fill: "#FF6B35", width: 74, height: 74 },
  { name: "方形", shape: "square", fill: "#1C1A18", width: 72, height: 72 },
  { name: "星芒", shape: "spark", fill: "#FF6B35", width: 82, height: 82 },
  { name: "弧形", shape: "arc", fill: "#25394A", width: 96, height: 96 },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function MarkGlyph({ color = "#1C1A18" }: { color?: string }) {
  return (
    <svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true">
      <path d="M69 46v78c0 10 8 18 18 18h53" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M181 69c-10-15-26-24-45-24-30 0-54 21-54 47s24 47 54 47c19 0 35-10 45-24" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" />
      <circle cx="185" cy="136" r="10" fill="#FF6B35" />
    </svg>
  );
}

function ShapeGlyph({ shape, fill }: { shape: DesignElement["shape"]; fill: string }) {
  if (shape === "circle") return <div className="h-full w-full rounded-full" style={{ background: fill }} />;
  if (shape === "square") return <div className="h-full w-full rounded-[10%]" style={{ background: fill }} />;
  if (shape === "arc") return <div className="h-full w-full rounded-full border-[14px] border-r-transparent" style={{ borderColor: fill, borderRightColor: "transparent", transform: "rotate(-30deg)" }} />;
  return <svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 3 60 36 91 21 72 51 97 66 63 66 67 99 50 70 32 99 36 66 3 66 28 51 9 21 40 36Z" fill={fill} /></svg>;
}

function DesignObject({ element, selected, onPointerDown }: { element: DesignElement; selected: boolean; onPointerDown: (event: PointerEvent<HTMLDivElement>) => void }) {
  const content = element.type === "mark" ? <MarkGlyph color={element.fill} /> : element.type === "shape" ? <ShapeGlyph shape={element.shape} fill={element.fill} /> : element.type === "image" ? <img src={element.src} className="h-full w-full object-contain" draggable={false} alt="已上传的图形" /> : (
    <div className="flex h-full w-full items-center justify-center whitespace-nowrap text-center font-bold leading-none" style={{ color: element.fill, fontSize: element.fontSize, fontFamily: element.fontFamily }}>{element.content}</div>
  );

  return (
    <div
      className={`absolute touch-none select-none ${selected ? "selection-outline" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, cursor: "grab" }}
      onPointerDown={onPointerDown}
      role="button"
      aria-label={`选择 ${element.name}`}
    >
      {content}
      {selected && <><span className="control-dot absolute -left-2 -top-2" /><span className="control-dot absolute -right-2 -top-2" /><span className="control-dot absolute -bottom-2 -left-2" /><span className="control-dot absolute -bottom-2 -right-2" /></>}
    </div>
  );
}

function makeSvg(elements: DesignElement[]) {
  const body = elements.map((el) => {
    const start = `<g transform="translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.width / 2} ${el.height / 2})">`;
    if (el.type === "mark") return `${start}<svg width="${el.width}" height="${el.height}" viewBox="0 0 240 180"><path d="M69 46v78c0 10 8 18 18 18h53" fill="none" stroke="${el.fill}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M181 69c-10-15-26-24-45-24-30 0-54 21-54 47s24 47 54 47c19 0 35-10 45-24" fill="none" stroke="${el.fill}" stroke-width="20" stroke-linecap="round"/><circle cx="185" cy="136" r="10" fill="#FF6B35"/></svg></g>`;
    if (el.type === "text") return `${start}<text x="${el.width / 2}" y="${Math.max((el.height + (el.fontSize ?? 24)) / 2 - 4, 30)}" text-anchor="middle" fill="${el.fill}" font-size="${el.fontSize}" font-family="${el.fontFamily}, sans-serif" font-weight="700">${(el.content ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text></g>`;
    if (el.type === "image") return "";
    if (el.shape === "circle") return `${start}<circle cx="${el.width / 2}" cy="${el.height / 2}" r="${Math.min(el.width, el.height) / 2}" fill="${el.fill}"/></g>`;
    if (el.shape === "square") return `${start}<rect width="${el.width}" height="${el.height}" rx="${Math.min(el.width, el.height) * .1}" fill="${el.fill}"/></g>`;
    if (el.shape === "arc") return `${start}<path d="M${el.width * .72} ${el.height * .16} A${el.width * .34} ${el.height * .34} 0 1 0 ${el.width * .75} ${el.height * .73}" fill="none" stroke="${el.fill}" stroke-width="${Math.min(el.width, el.height) * .15}" stroke-linecap="round"/></g>`;
    return `${start}<path d="M${el.width*.5} 3 ${el.width*.6} ${el.height*.36} ${el.width*.91} ${el.height*.21} ${el.width*.72} ${el.height*.51} ${el.width*.97} ${el.height*.66} ${el.width*.63} ${el.height*.66} ${el.width*.67} ${el.height*.99} ${el.width*.5} ${el.height*.7} ${el.width*.32} ${el.height*.99} ${el.width*.36} ${el.height*.66} ${el.width*.03} ${el.height*.66} ${el.width*.28} ${el.height*.51} ${el.width*.09} ${el.height*.21} ${el.width*.4} ${el.height*.36}Z" fill="${el.fill}"/></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}"><rect width="100%" height="100%" fill="#fbf8f2"/>${body}</svg>`;
}

export default function Home() {
  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const elementsRef = useRef(elements);
  const [selectedId, setSelectedId] = useState<string | null>("craft-mark");
  const [history, setHistory] = useState<DesignElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<AssetKind>("pointer");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [designName, setDesignName] = useState("Untitled mark");
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const selected = useMemo(() => elements.find((element) => element.id === selectedId) ?? null, [elements, selectedId]);
  const commit = useCallback((next: DesignElement[]) => {
    setElements(next);
    setHistory((previous) => {
      const revised = [...previous.slice(0, historyIndex + 1), next];
      setHistoryIndex(revised.length - 1);
      return revised;
    });
  }, [historyIndex]);

  const updateSelected = (updates: Partial<DesignElement>) => {
    if (!selectedId) return;
    const next = elements.map((element) => element.id === selectedId ? { ...element, ...updates } : element);
    commit(next);
  };

  const addElement = (part: Omit<DesignElement, "id" | "x" | "y">) => {
    const next: DesignElement = { ...part, id: uid("element"), x: 314 - part.width / 2, y: 228 - part.height / 2 };
    commit([...elements, next]);
    setSelectedId(next.id);
    toast.success(`已添加${next.name}`);
  };

  const addText = () => {
    setActiveTool("text");
    addElement({ type: "text", name: "文本", width: 260, height: 54, rotation: 0, fill: "#1C1A18", content: "新建标题", fontSize: 36, fontFamily: "DM Sans" });
  };

  const addShape = (template: typeof shapeTemplates[number]) => {
    setActiveTool("shapes");
    addElement({ type: "shape", name: template.name, width: template.width, height: template.height, rotation: 0, fill: template.fill, shape: template.shape });
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("请选择 PNG、JPG 或 SVG 图像文件。"); return; }
    const reader = new FileReader();
    reader.onload = () => addElement({ type: "image", name: file.name, width: 150, height: 150, rotation: 0, fill: "#1C1A18", src: String(reader.result) });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const onObjectPointerDown = (event: PointerEvent<HTMLDivElement>, element: DesignElement) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedId(element.id);
    setDrag({ id: element.id, dx: (event.clientX - rect.left) * CANVAS.width / (stageRef.current?.clientWidth || CANVAS.width), dy: (event.clientY - rect.top) * CANVAS.height / (stageRef.current?.clientHeight || CANVAS.height) });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) * CANVAS.width / rect.width - drag.dx;
    const y = (event.clientY - rect.top) * CANVAS.height / rect.height - drag.dy;
    setElements((previous) => previous.map((element) => element.id === drag.id ? { ...element, x: Math.max(-30, Math.min(CANVAS.width - 15, x)), y: Math.max(-30, Math.min(CANVAS.height - 15, y)) } : element));
  };

  const onStagePointerUp = () => {
    if (!drag) return;
    setDrag(null);
    const current = elementsRef.current;
    setHistory((previous) => {
      const revised = [...previous.slice(0, historyIndex + 1), current];
      setHistoryIndex(revised.length - 1);
      return revised;
    });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedId(null);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedId(null);
  };
  const removeSelected = () => {
    if (!selected) return;
    const next = elements.filter((element) => element.id !== selected.id);
    commit(next); setSelectedId(null); toast.message("图层已移除");
  };

  const exportSvg = () => {
    const blob = new Blob([makeSvg(elements)], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-design"}.svg`; link.click(); URL.revokeObjectURL(link.href);
    toast.success("SVG 已导出，保留无限缩放能力。");
  };

  const exportPng = () => {
    const svg = makeSvg(elements);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = CANVAS.width * 2; canvas.height = CANVAS.height * 2;
      const context = canvas.getContext("2d"); if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-design"}.png`; link.click(); toast.success("PNG 已导出。");
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT") return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedId) { event.preventDefault(); removeSelected(); }
      if (event.key === "Escape") { setSelectedId(null); setPreviewOpen(false); }
    };
    window.addEventListener("keydown", keyHandler); return () => window.removeEventListener("keydown", keyHandler);
  });

  const numeric = (key: "x" | "y" | "width" | "height" | "rotation" | "fontSize", value: string) => updateSelected({ [key]: Number(value) } as Partial<DesignElement>);

  return (
    <main className="editor-shell flex min-h-screen flex-col overflow-hidden">
      <header className="topbar relative z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-white/10 px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-white/10 bg-[#232326] shadow-inner shadow-white/5"><img src={BRAND_MARK} alt="LogoCraft 图形标志" className="absolute inset-0 h-full w-full object-contain p-1 opacity-30" /><span className="relative h-7 w-7"><MarkGlyph color="#F8F3EA" /></span></div>
          <div className="min-w-0"><div className="font-display text-[15px] font-bold tracking-[-.045em] text-[#fff9f0]">Logo<span className="text-[#ff875f]">Craft</span></div><div className="technical-muted hidden text-[9px] font-bold text-[#8f8e90] sm:block">SVG EDITOR · 01</div></div>
          <div className="ml-1 hidden h-7 w-px bg-white/10 sm:block" />
          <input value={designName} onChange={(event) => setDesignName(event.target.value)} aria-label="设计名称" className="hidden w-36 border-0 bg-transparent px-2 text-[12px] font-semibold text-[#c9c7c3] outline-none placeholder:text-[#777] md:block" />
          <span className="hidden rounded-md bg-[#29292d] px-2 py-1 text-[10px] font-bold text-[#a6a5a4] lg:inline">已保存</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="action-button" onClick={undo} disabled={historyIndex <= 0} title="撤销（⌘Z）"><ArrowLeft size={15} /><span className="hidden lg:inline">撤销</span></button>
          <button className="action-button" onClick={redo} disabled={historyIndex >= history.length - 1} title="重做（⌘⇧Z）"><ArrowRight size={15} /><span className="hidden lg:inline">重做</span></button>
          <span className="mx-1 hidden h-6 w-px bg-white/10 md:block" />
          <button className="action-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /><span className="hidden sm:inline">预览</span></button>
          <button className="action-button action-primary" onClick={exportSvg}><Download size={15} /><span className="hidden sm:inline">导出 SVG</span></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="panel relative z-10 flex w-[58px] shrink-0 flex-col items-center border-r border-white/10 py-3">
          <button className={`tool-button ${activeTool === "pointer" ? "tool-button-active" : ""}`} onClick={() => setActiveTool("pointer")} title="选择工具"><MousePointer2 size={18} /></button>
          <button className={`tool-button ${activeTool === "shapes" ? "tool-button-active" : ""}`} onClick={() => setActiveTool("shapes")} title="添加形状"><Shapes size={18} /></button>
          <button className={`tool-button ${activeTool === "text" ? "tool-button-active" : ""}`} onClick={addText} title="添加文本"><Type size={18} /></button>
          <button className={`tool-button ${activeTool === "upload" ? "tool-button-active" : ""}`} onClick={() => { setActiveTool("upload"); fileRef.current?.click(); }} title="上传图形"><ImageUp size={18} /></button>
          <div className="mt-auto flex flex-col gap-1"><button className="tool-button" onClick={() => toast.message("画板固定为 720 × 520，导出时保持比例。")} title="画布信息"><Grid2X2 size={17} /></button><button className="tool-button" onClick={() => toast.message("快捷键：Delete 删除，Esc 取消选择，⌘Z 撤销。")} title="帮助"><Sparkles size={17} /></button></div>
        </aside>

        <aside className="panel hidden w-[232px] shrink-0 border-r border-white/10 lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-4 pb-3 pt-4"><p className="section-label">资产库</p><div className="mt-3 flex gap-1 border-b border-white/10"><button className={`tool-tab flex-1 px-2 py-2 text-[10px] font-extrabold tracking-[.1em] ${activeTool !== "text" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setActiveTool("shapes")}>图形</button><button className={`tool-tab flex-1 px-2 py-2 text-[10px] font-extrabold tracking-[.1em] ${activeTool === "text" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setActiveTool("text")}>文字</button></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeTool === "text" ? <section><p className="section-label">排版</p><button className="mt-3 flex w-full items-center gap-3 border-y border-white/10 bg-[#222225] p-3 text-left transition hover:border-[#ff6b35]/60" onClick={addText}><span className="flex h-9 w-9 items-center justify-center bg-[#1b1b1e] text-[#ff6b35]"><Type size={18} /></span><span><strong className="block text-[12px] text-[#f8f4ec]">添加标题</strong><small className="text-[10px] text-[#909094]">可在检查器中编辑</small></span><Plus className="ml-auto text-[#929196]" size={16} /></button><p className="mb-2 mt-6 section-label">字体组合</p><div className="border-y border-white/10 bg-[#222225] p-3"><p className="font-display text-lg font-bold text-[#f6f2ea]">DM Sans</p><p className="mt-1 text-[10px] text-[#98979a]">清晰字形，用于标志与标题</p></div></section> : <section><p className="section-label">基础几何</p><div className="mt-3 grid grid-cols-2 gap-[1px] overflow-hidden border border-white/10 bg-white/10">{shapeTemplates.map((template) => <button key={template.name} className="specimen-card aspect-square border-0 p-4" onClick={() => addShape(template)} title={`添加${template.name}`}><ShapeGlyph shape={template.shape} fill={template.fill} /></button>)}</div><p className="mb-2 mt-6 section-label">构图参考</p><div className="grid grid-cols-2 gap-[1px] overflow-hidden border border-white/10 bg-white/10"><button className="specimen-card aspect-square border-0" onClick={() => { addShape(shapeTemplates[3]); toast.message("已从弧形构图开始。"); }}><img src={SPECIMEN_ARC} alt="弧形构图参考" className="h-full w-full object-cover opacity-90" /></button><button className="specimen-card aspect-square border-0" onClick={() => { addShape({ name: "圆形", shape: "circle", fill: "#25394A", width: 74, height: 74 }); toast.message("已从圆形构图开始。"); }}><img src={SPECIMEN_ORBIT} alt="轨道构图参考" className="h-full w-full object-cover opacity-90" /></button></div><button className="mt-5 flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-[10px] font-extrabold tracking-[.08em] text-[#aaa9ac] transition hover:border-[#ff6b35]/70 hover:text-[#fff8f2]" onClick={() => fileRef.current?.click()}><Upload size={15} /> 导入 SVG 或图片</button></section>}
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#1b1b1d]/60">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[.07] px-4 text-[10px] font-bold tracking-[.1em] text-[#88878a]"><span>画布 / 标志主构图</span><span className="hidden sm:inline">720 × 520 PX</span></div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5 md:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.06) .6px, transparent .6px)", backgroundSize: "14px 14px" }} />
            <div className="relative z-[1] w-full max-w-[900px]">
              <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold tracking-[.12em] text-[#7f7e81]"><span>LOGOCRAFT / 01</span><span>100%</span></div>
              <div className="paper-canvas canvas-grid relative mx-auto aspect-[720/520] w-full max-w-[720px]" ref={stageRef} onPointerMove={onStagePointerMove} onPointerUp={onStagePointerUp} onPointerLeave={onStagePointerUp} onPointerDown={() => setSelectedId(null)}>
                {elements.map((element) => <DesignObject key={element.id} element={element} selected={element.id === selectedId} onPointerDown={(event) => onObjectPointerDown(event, element)} />)}
              </div>
              <div className="mx-auto flex w-full max-w-[720px] items-center justify-between pt-3 text-[10px] font-semibold text-[#858487]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" /> RGB / sRGB IEC61966-2.1</span><span>{elements.length} 个图层</span></div>
            </div>
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-white/[.07] px-4 text-[10px] font-medium text-[#8c8b8e]"><span className="flex items-center gap-2"><MoveUpRight size={13} /> 拖拽对象以移动</span><span className="hidden sm:inline">按 <kbd className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-[#c1c0be]">Delete</kbd> 删除图层</span></div>
        </section>

        <aside className="panel hidden w-[260px] shrink-0 border-l border-white/10 xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="section-label">检查器</p><p className="mt-1 text-[12px] font-bold text-[#f4f0e9]">{selected?.name ?? "未选择对象"}</p></div>{selected && <button className="tool-button h-8 w-8" onClick={removeSelected} title="移除图层"><Trash2 size={15} /></button>}</div>
            {selected ? <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4"><section><p className="section-label">外观</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="inspector-field"><label>填充</label><div className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-[#252529] px-2"><input type="color" value={selected.fill} onChange={(event) => updateSelected({ fill: event.target.value })} className="h-4 w-4 border-0 bg-transparent p-0" /><span className="text-[10px] font-bold text-[#dad7d2]">{selected.fill.toUpperCase()}</span></div></div><div className="inspector-field"><label>旋转</label><input type="number" value={selected.rotation} onChange={(event) => numeric("rotation", event.target.value)} /></div></div><div className="mt-3 grid grid-cols-2 gap-[3px] border-y border-white/10 py-2">{palettes.slice(0, 6).map((palette) => <button key={palette.name} aria-label={`设为${palette.name}`} onClick={() => updateSelected({ fill: palette.color })} className={`h-6 border transition hover:brightness-125 ${selected.fill === palette.color ? "border-[#ff6b35] ring-1 ring-[#ff6b35]" : "border-white/10"}`} style={{ background: palette.color, filter: palette.color === "#FF6B35" ? "saturate(1)" : "saturate(.55)" }} />)}</div></section>
            {selected.type === "text" && <section className="mt-6 border-t border-white/10 pt-5"><p className="section-label">文字</p><div className="mt-3 space-y-3"><div className="inspector-field"><label>内容</label><input value={selected.content ?? ""} onChange={(event) => updateSelected({ content: event.target.value })} /></div><div className="grid grid-cols-2 gap-2"><div className="inspector-field"><label>字号</label><input type="number" min="10" max="160" value={selected.fontSize} onChange={(event) => numeric("fontSize", event.target.value)} /></div><div className="inspector-field"><label>字体</label><select value={selected.fontFamily} onChange={(event) => updateSelected({ fontFamily: event.target.value })}><option>DM Sans</option><option>Manrope</option><option>Georgia</option><option>Arial Black</option></select></div></div></div></section>}
            <section className="mt-6 border-t border-white/10 pt-5"><p className="section-label">位置与尺寸</p><div className="mt-3 grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map((key) => <div className="inspector-field" key={key}><label>{key === "width" ? "宽度" : key === "height" ? "高度" : key.toUpperCase()}</label><input type="number" value={Math.round(Number(selected[key]))} onChange={(event) => numeric(key, event.target.value)} /></div>)}</div></section></div> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[.05] text-[#ff6b35]"><MousePointer2 size={18} /></div><p className="mt-4 text-[12px] font-bold text-[#dad7d1]">选择一个图层</p><p className="mt-1 text-[11px] leading-relaxed text-[#89888c]">拖拽画布对象，或从左侧资产库添加图形。</p></div>}
          <div className="border-t border-white/10 p-3"><button className="action-button w-full justify-start" onClick={() => { commit(initialElements); setSelectedId("craft-mark"); toast.success("已还原到 LogoCraft 初始构图。"); }}><RotateCcw size={14} /> 还原初始构图</button></div>
        </aside>
      </div>
      <input ref={fileRef} onChange={handleUpload} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" />

      {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="预览设计"><div className="modal-surface w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">预览</p><h2 className="mt-1 font-display text-[18px] font-bold text-[#fff9f0]">{designName}</h2></div><button className="tool-button" onClick={() => setPreviewOpen(false)} aria-label="关闭预览"><X size={18} /></button></div><div className="grid gap-4 bg-[#1a1a1c] p-5 md:grid-cols-2"><div className="overflow-hidden rounded-xl bg-[#fbf8f2] shadow-xl"><svg viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements).replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div><div className="overflow-hidden rounded-xl bg-[#09090a] p-0 shadow-xl"><svg viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements).replace('fill=\"#fbf8f2\"', 'fill=\"#09090a\"').replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div></div><div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4"><button className="action-button" onClick={exportPng}><FileDown size={15} /> PNG</button><button className="action-button action-primary" onClick={exportSvg}><Download size={15} /> SVG</button></div></div></div>}
    </main>
  );
}
