/* Page design: "精密工作台" — calibrated paper canvas, graphite trays, and lava-amber active states. */
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  EyeOff,
  FileDown,
  FolderOpen,
  GripVertical,
  ImageUp,
  Layers3,
  LayoutTemplate,
  Lock,
  MousePointer2,
  MoveUpRight,
  Plus,
  RotateCcw,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Unlock,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ChangeEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const BRAND_MARK = "/manus-storage/logocraft-mark_c3af8c50.png";
const SPECIMEN_ARC = "/manus-storage/logocraft-specimen-arc_f9421857.png";
const SPECIMEN_ORBIT = "/manus-storage/logocraft-specimen-orbit_a365a6e9.png";
const DEFAULT_ARTBOARD = { width: 720, height: 520, bleed: 0 };
const PROJECTS_KEY = "logocraft-projects-v3";
const LEGACY_DRAFT_KEY = "logocraft-editor-draft-v2";
const MIN_SIZE = 16;
const SNAP_DISTANCE = 5;

type ElementType = "mark" | "text" | "shape" | "image";
type AssetKind = "pointer" | "shapes" | "text" | "upload";
type LibraryTab = "shapes" | "text" | "templates";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Alignment = "left" | "centerX" | "right" | "top" | "centerY" | "bottom" | "distributeX" | "distributeY";

type DesignElement = {
  id: string; type: ElementType; name: string; x: number; y: number; width: number; height: number; rotation: number; fill: string;
  content?: string; fontSize?: number; fontFamily?: string; shape?: "spark" | "circle" | "square" | "arc"; src?: string; locked?: boolean; hidden?: boolean;
};
type LayerGroup = { id: string; name: string; elementIds: string[]; collapsed?: boolean };
type ReferenceLine = { id: string; axis: "x" | "y"; position: number; color?: string; locked?: boolean };
type ReferencePreset = { id: string; name: string; lines: ReferenceLine[] };
type Artboard = { width: number; height: number; bleed: number };
type HistoryMeta = Record<number, { name?: string; favorite?: boolean; thumbnail?: string }>;
type Project = { id: string; name: string; elements: DesignElement[]; groups: LayerGroup[]; referenceLines: ReferenceLine[]; referenceVisible: boolean; referencePresets: ReferencePreset[]; artboard: Artboard; historyMeta: HistoryMeta; modifiedAt: string };
type Guide = { axis: "x" | "y"; position: number };
type Interaction =
  | { kind: "move"; ids: string[]; startX: number; startY: number; bases: Record<string, Pick<DesignElement, "x" | "y">> }
  | { kind: "resize"; id: string; handle: ResizeHandle; startX: number; startY: number; base: DesignElement }
  | { kind: "rotate"; id: string; startAngle: number; base: DesignElement }
  | { kind: "groupRotate"; ids: string[]; centerX: number; centerY: number; startAngle: number; bases: Record<string, DesignElement> }
  | { kind: "groupScale"; ids: string[]; centerX: number; centerY: number; startDistance: number; bases: Record<string, DesignElement> }
  | { kind: "marquee"; startX: number; startY: number; currentX: number; currentY: number; additive: boolean };
type Preset = { id: string; name: string; note: string; thumbnail: string; elements: Omit<DesignElement, "id">[] };

const initialElements: DesignElement[] = [
  { id: "craft-mark", type: "mark", name: "LogoCraft 标记", x: 248, y: 142, width: 224, height: 174, rotation: 0, fill: "#1C1A18" },
  { id: "craft-word", type: "text", name: "LogoCraft 字标", x: 202, y: 335, width: 316, height: 64, rotation: 0, fill: "#1C1A18", content: "LogoCraft", fontSize: 46, fontFamily: "DM Sans" },
  { id: "craft-line", type: "shape", name: "定位点", x: 520, y: 392, width: 18, height: 18, rotation: 0, fill: "#FF6B35", shape: "circle" },
];
const palettes = [{ name: "熔岩琥珀", color: "#FF6B35" }, { name: "墨黑", color: "#1C1A18" }, { name: "纸白", color: "#FBF8F2" }, { name: "苔藓绿", color: "#44624A" }, { name: "深青", color: "#25394A" }, { name: "赭红", color: "#A64131" }];
const shapeTemplates: Array<Pick<DesignElement, "name" | "shape" | "fill" | "width" | "height">> = [
  { name: "锚点", shape: "circle", fill: "#25394A", width: 34, height: 34 }, { name: "负形切口", shape: "arc", fill: "#1C1A18", width: 76, height: 76 }, { name: "双弧构件", shape: "arc", fill: "#A64131", width: 82, height: 82 }, { name: "LC 弧片", shape: "arc", fill: "#25394A", width: 96, height: 96 },
];
const presets: Preset[] = [
  { id: "arch-studio", name: "拱形工作室", note: "拱形 + 定位点", thumbnail: SPECIMEN_ARC, elements: [{ type: "shape", name: "拱形", x: 230, y: 118, width: 250, height: 250, rotation: 0, fill: "#1C1A18", shape: "arc" }, { type: "shape", name: "琥珀圆", x: 332, y: 248, width: 70, height: 70, rotation: 0, fill: "#FF6B35", shape: "circle" }, { type: "text", name: "工作室名称", x: 176, y: 388, width: 368, height: 56, rotation: 0, fill: "#1C1A18", content: "STUDIO ARC", fontSize: 38, fontFamily: "DM Sans" }] },
  { id: "orbit-line", name: "轨道档案", note: "圆轨 + 标记线", thumbnail: SPECIMEN_ORBIT, elements: [{ type: "shape", name: "轨道", x: 210, y: 106, width: 300, height: 300, rotation: 0, fill: "#25394A", shape: "arc" }, { type: "shape", name: "标记线", x: 350, y: 98, width: 20, height: 312, rotation: 0, fill: "#A64131", shape: "square" }, { type: "text", name: "档案名称", x: 200, y: 420, width: 320, height: 40, rotation: 0, fill: "#1C1A18", content: "ORBIT / 01", fontSize: 27, fontFamily: "Manrope" }] },
  { id: "signal-stack", name: "信号堆栈", note: "星芒 + 双色块", thumbnail: SPECIMEN_ARC, elements: [{ type: "shape", name: "深青方", x: 194, y: 132, width: 185, height: 185, rotation: 0, fill: "#25394A", shape: "square" }, { type: "shape", name: "琥珀星芒", x: 332, y: 200, width: 160, height: 160, rotation: 8, fill: "#FF6B35", shape: "spark" }, { type: "text", name: "信号字标", x: 185, y: 396, width: 355, height: 56, rotation: 0, fill: "#1C1A18", content: "SIGNAL FORM", fontSize: 35, fontFamily: "DM Sans" }] },
];

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const freshProject = (name = "Untitled mark", elements = initialElements, groups: LayerGroup[] = [], referenceLines: ReferenceLine[] = []): Project => ({ id: uid("project"), name, elements, groups, referenceLines, referenceVisible: true, referencePresets: [], artboard: DEFAULT_ARTBOARD, historyMeta: {}, modifiedAt: new Date().toISOString() });

function MarkGlyph({ color = "#1C1A18" }: { color?: string }) {
  return <svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true"><path d="M69 46v78c0 10 8 18 18 18h53" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" /><path d="M181 69c-10-15-26-24-45-24-30 0-54 21-54 47s24 47 54 47c19 0 35-10 45-24" fill="none" stroke={color} strokeWidth="20" strokeLinecap="round" /><circle cx="185" cy="136" r="10" fill="#FF6B35" /></svg>;
}
function ShapeGlyph({ shape, fill }: { shape: DesignElement["shape"]; fill: string }) {
  if (shape === "circle") return <div className="h-full w-full rounded-full" style={{ background: fill }} />;
  if (shape === "square") return <div className="h-full w-full rounded-[10%]" style={{ background: fill }} />;
  if (shape === "arc") return <div className="h-full w-full rounded-full border-[14px] border-r-transparent" style={{ borderColor: fill, borderRightColor: "transparent", transform: "rotate(-30deg)" }} />;
  return <svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 3 60 36 91 21 72 51 97 66 63 66 67 99 50 70 32 99 36 66 3 66 28 51 9 21 40 36Z" fill={fill} /></svg>;
}
function ResizeHandles({ onPointerDown }: { onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => void }) {
  const handles: Array<{ key: ResizeHandle; className: string; label: string }> = [
    { key: "nw", className: "-left-[7px] -top-[7px] cursor-nwse-resize", label: "左上调整大小" }, { key: "n", className: "left-1/2 -top-[7px] -translate-x-1/2 cursor-ns-resize", label: "上方调整大小" }, { key: "ne", className: "-right-[7px] -top-[7px] cursor-nesw-resize", label: "右上调整大小" }, { key: "e", className: "right-[-7px] top-1/2 -translate-y-1/2 cursor-ew-resize", label: "右侧调整大小" }, { key: "se", className: "-bottom-[7px] -right-[7px] cursor-nwse-resize", label: "右下调整大小" }, { key: "s", className: "bottom-[-7px] left-1/2 -translate-x-1/2 cursor-ns-resize", label: "下方调整大小" }, { key: "sw", className: "-bottom-[7px] -left-[7px] cursor-nesw-resize", label: "左下调整大小" }, { key: "w", className: "left-[-7px] top-1/2 -translate-y-1/2 cursor-ew-resize", label: "左侧调整大小" },
  ];
  return <>{handles.map((handle) => <button key={handle.key} aria-label={handle.label} className={`resize-handle absolute z-20 ${handle.className}`} onPointerDown={(event) => onPointerDown(event, handle.key)} />)}</>;
}
function MultiTransformBox({ bounds, ids }: { bounds: { left: number; top: number; width: number; height: number; centerX: number; centerY: number }; ids: string[] }) {
  const dispatch = (kind: "rotate" | "scale", event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-group-transform", { detail: { kind, ids, clientX: event.clientX, clientY: event.clientY, centerX: bounds.centerX, centerY: bounds.centerY } })); };
  return <div className="multi-transform-box" style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}><span className="multi-transform-stem" /><button className="multi-rotate-handle" aria-label="整体旋转所选图层" onPointerDown={(event) => dispatch("rotate", event)}>↻</button><button className="multi-scale-handle" aria-label="整体缩放所选图层" onPointerDown={(event) => dispatch("scale", event)}>↗</button><span className="multi-transform-label">{ids.length} LAYERS</span></div>;
}
function DesignObject({ element, selected, allowResize, onPointerDown, onResizePointerDown }: { element: DesignElement; selected: boolean; allowResize: boolean; onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void; onResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => void }) {
  if (element.hidden) return null;
  const content = element.type === "mark" ? <MarkGlyph color={element.fill} /> : element.type === "shape" ? <ShapeGlyph shape={element.shape} fill={element.fill} /> : element.type === "image" ? <img src={element.src} className="h-full w-full object-contain" draggable={false} alt="已上传的图形" /> : <div className="flex h-full w-full items-center justify-center whitespace-nowrap text-center font-bold leading-none" style={{ color: element.fill, fontSize: element.fontSize, fontFamily: element.fontFamily }}>{element.content}</div>;
  return <div className={`absolute touch-none select-none ${selected ? "selection-outline" : ""} ${element.locked ? "cursor-not-allowed" : ""}`} style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, cursor: element.locked ? "not-allowed" : "grab" }} onPointerDown={onPointerDown} role="button" aria-label={`选择 ${element.name}`}>{content}{selected && !element.locked && allowResize && <><ResizeHandles onPointerDown={onResizePointerDown} /><span className="rotate-stem" /><button aria-label="旋转对象" className="rotate-handle" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-rotate", { detail: { id: element.id, clientX: event.clientX, clientY: event.clientY } })); }}>↻</button></>}{selected && !allowResize && <div className="multi-corner-controls"><button aria-label="整体旋转所选图层" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-group-transform", { detail: { kind: "rotate", clientX: event.clientX, clientY: event.clientY } })); }}>↻</button><button aria-label="整体缩放所选图层" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-group-transform", { detail: { kind: "scale", clientX: event.clientX, clientY: event.clientY } })); }}>↗</button></div>}{selected && element.locked && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-[#1e1e21] text-[#ff6b35]"><Lock size={10} /></span>}</div>;
}
function makeSvg(elements: DesignElement[], artboard: Artboard = DEFAULT_ARTBOARD) {
  const body = elements.filter((element) => !element.hidden).map((el) => {
    const start = `<g transform="translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.width / 2} ${el.height / 2})">`;
    if (el.type === "mark") return `${start}<svg width="${el.width}" height="${el.height}" viewBox="0 0 240 180"><path d="M69 46v78c0 10 8 18 18 18h53" fill="none" stroke="${el.fill}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M181 69c-10-15-26-24-45-24-30 0-54 21-54 47s24 47 54 47c19 0 35-10 45-24" fill="none" stroke="${el.fill}" stroke-width="20" stroke-linecap="round"/><circle cx="185" cy="136" r="10" fill="#FF6B35"/></svg></g>`;
    if (el.type === "text") return `${start}<text x="${el.width / 2}" y="${Math.max((el.height + (el.fontSize ?? 24)) / 2 - 4, 30)}" text-anchor="middle" fill="${el.fill}" font-size="${el.fontSize}" font-family="${el.fontFamily}, sans-serif" font-weight="700">${(el.content ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text></g>`;
    if (el.type === "image") return "";
    if (el.shape === "circle") return `${start}<circle cx="${el.width / 2}" cy="${el.height / 2}" r="${Math.min(el.width, el.height) / 2}" fill="${el.fill}"/></g>`;
    if (el.shape === "square") return `${start}<rect width="${el.width}" height="${el.height}" rx="${Math.min(el.width, el.height) * .1}" fill="${el.fill}"/></g>`;
    if (el.shape === "arc") return `${start}<path d="M${el.width * .72} ${el.height * .16} A${el.width * .34} ${el.height * .34} 0 1 0 ${el.width * .75} ${el.height * .73}" fill="none" stroke="${el.fill}" stroke-width="${Math.min(el.width, el.height) * .15}" stroke-linecap="round"/></g>`;
    return `${start}<path d="M${el.width *.5} 3 ${el.width *.6} ${el.height *.36} ${el.width *.91} ${el.height *.21} ${el.width *.72} ${el.height *.51} ${el.width *.97} ${el.height *.66} ${el.width *.63} ${el.height *.66} ${el.width *.67} ${el.height *.99} ${el.width *.5} ${el.height *.7} ${el.width *.32} ${el.height *.99} ${el.width *.36} ${el.height *.66} ${el.width *.03} ${el.height *.66} ${el.width *.28} ${el.height *.51} ${el.width *.09} ${el.height *.21} ${el.width *.4} ${el.height *.36}Z" fill="${el.fill}"/></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}"><rect width="100%" height="100%" fill="#fbf8f2"/>${body}</svg>`;
}

export default function Home() {
  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const [artboard, setArtboard] = useState<Artboard>(DEFAULT_ARTBOARD);
  const [groups, setGroups] = useState<LayerGroup[]>([]);
  const [referenceLines, setReferenceLines] = useState<ReferenceLine[]>([]);
  const [referenceVisible, setReferenceVisible] = useState(true);
  const [referencePresets, setReferencePresets] = useState<ReferencePreset[]>([]);
  const [guideDrag, setGuideDrag] = useState<{ id: string; axis: "x" | "y" } | null>(null);
  const [projects, setProjects] = useState<Project[]>([freshProject()]);
  const [activeProjectId, setActiveProjectId] = useState(projects[0].id);
  const [projectReady, setProjectReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(["craft-mark"]);
  const [history, setHistory] = useState<DesignElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLabels, setHistoryLabels] = useState<string[]>(["初始构图"]);
  const [historyMeta, setHistoryMeta] = useState<HistoryMeta>({});
  const [styleClipboard, setStyleClipboard] = useState<Pick<DesignElement, "fill" | "fontSize" | "fontFamily" | "rotation"> | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rotationTip, setRotationTip] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState<AssetKind>("pointer");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("shapes");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [designName, setDesignName] = useState("Untitled mark");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [zoom, setZoom] = useState(1);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<"loading" | "saving" | "saved">("loading");
  const stageRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef(elements);
  const selectedIdsRef = useRef(selectedIds);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => {
    const beginRotation = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; clientX: number; clientY: number }>).detail;
      const element = elementsRef.current.find((item) => item.id === detail.id);
      const rect = stageRef.current?.getBoundingClientRect();
      if (!element || element.locked || !rect) return;
      const x = (detail.clientX - rect.left) / zoom; const y = (detail.clientY - rect.top) / zoom;
      const centerX = element.x + element.width / 2; const centerY = element.y + element.height / 2;
      setInteraction({ kind: "rotate", id: element.id, startAngle: Math.atan2(y - centerY, x - centerX) * 180 / Math.PI, base: element });
    };
    window.addEventListener("logocraft-rotate", beginRotation);
    return () => window.removeEventListener("logocraft-rotate", beginRotation);
  }, [zoom]);
  useEffect(() => {
    const beginTransform = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: "rotate" | "scale"; ids?: string[]; clientX: number; clientY: number; centerX?: number; centerY?: number }>).detail;
      const rect = stageRef.current?.getBoundingClientRect(); if (!rect) return;
      const ids = detail.ids ?? selectedIdsRef.current; const targets = elementsRef.current.filter((item) => ids.includes(item.id)); if (targets.length < 2) return;
      const centerX = detail.centerX ?? (Math.min(...targets.map((item) => item.x)) + Math.max(...targets.map((item) => item.x + item.width))) / 2;
      const centerY = detail.centerY ?? (Math.min(...targets.map((item) => item.y)) + Math.max(...targets.map((item) => item.y + item.height))) / 2;
      const bases = Object.fromEntries(ids.map((id) => { const element = elementsRef.current.find((item) => item.id === id); return element ? [id, element] : null; }).filter(Boolean) as Array<[string, DesignElement]>);
      const x = (detail.clientX - rect.left) / zoom; const y = (detail.clientY - rect.top) / zoom;
      if (detail.kind === "rotate") setInteraction({ kind: "groupRotate", ids, centerX, centerY, startAngle: Math.atan2(y - centerY, x - centerX) * 180 / Math.PI, bases });
      else setInteraction({ kind: "groupScale", ids, centerX, centerY, startDistance: Math.max(1, Math.hypot(x - centerX, y - centerY)), bases });
    };
    const beginReference = (event: Event) => { const detail = (event as CustomEvent<{ id: string; axis: "x" | "y"; pointerId: number }>).detail; stageRef.current?.setPointerCapture(detail.pointerId); setGuideDrag({ id: detail.id, axis: detail.axis }); };
    window.addEventListener("logocraft-group-transform", beginTransform); window.addEventListener("logocraft-reference-begin", beginReference);
    return () => { window.removeEventListener("logocraft-group-transform", beginTransform); window.removeEventListener("logocraft-reference-begin", beginReference); };
  }, [zoom]);
  useEffect(() => {
    const createReference = (event: Event) => { const axis = (event as CustomEvent<{ axis: "x" | "y" }>).detail.axis; setReferenceLines((previous) => [...previous, { id: uid("guide"), axis, position: axis === "x" ? artboard.width / 2 : artboard.height / 2, color: "#367D97" }]); };
    const deleteReference = (event: Event) => setReferenceLines((previous) => previous.filter((line) => line.id !== (event as CustomEvent<string>).detail));
    const updateReference = (event: Event) => { const detail = (event as CustomEvent<{ id: string; updates: Partial<ReferenceLine> }>).detail; setReferenceLines((previous) => previous.map((line) => line.id === detail.id ? { ...line, ...detail.updates } : line)); };
    const changeVisibility = (event: Event) => setReferenceVisible((event as CustomEvent<boolean>).detail);
    const publishReference = () => window.dispatchEvent(new CustomEvent("logocraft-reference-updated", { detail: { lines: referenceLines, visible: referenceVisible } }));
    window.addEventListener("logocraft-reference-create", createReference); window.addEventListener("logocraft-reference-delete", deleteReference); window.addEventListener("logocraft-reference-update", updateReference); window.addEventListener("logocraft-reference-visible", changeVisibility); window.addEventListener("logocraft-reference-request", publishReference); publishReference();
    return () => { window.removeEventListener("logocraft-reference-create", createReference); window.removeEventListener("logocraft-reference-delete", deleteReference); window.removeEventListener("logocraft-reference-update", updateReference); window.removeEventListener("logocraft-reference-visible", changeVisibility); window.removeEventListener("logocraft-reference-request", publishReference); };
  }, [referenceLines, referenceVisible, artboard]);
  useEffect(() => {
    const updateArtboard = (event: Event) => { const updates = (event as CustomEvent<Partial<Artboard>>).detail; setArtboard((previous) => ({ width: clamp(Math.round(updates.width ?? previous.width), 240, 2400), height: clamp(Math.round(updates.height ?? previous.height), 180, 1600), bleed: clamp(Math.round(updates.bleed ?? previous.bleed), 0, 120) })); };
    const publishArtboard = () => window.dispatchEvent(new CustomEvent("logocraft-artboard-updated", { detail: artboard }));
    window.addEventListener("logocraft-artboard-update", updateArtboard); window.addEventListener("logocraft-artboard-request", publishArtboard); publishArtboard();
    return () => { window.removeEventListener("logocraft-artboard-update", updateArtboard); window.removeEventListener("logocraft-artboard-request", publishArtboard); };
  }, [artboard]);
  useEffect(() => {
    const savePreset = (event: Event) => { const name = String((event as CustomEvent<string>).detail || "").trim(); if (!name || !referenceLines.length) return; setReferencePresets((previous) => [...previous, { id: uid("reference-preset"), name, lines: referenceLines.map((line) => ({ ...line })) }]); toast.success(`已保存参考线预设「${name}」。`); };
    const applyPreset = (event: Event) => { const id = (event as CustomEvent<string>).detail; const preset = referencePresets.find((item) => item.id === id); if (!preset) return; setReferenceLines(preset.lines.map((line) => ({ ...line, id: uid("guide") }))); toast.success(`已应用「${preset.name}」预设。`); };
    const deletePreset = (event: Event) => setReferencePresets((previous) => previous.filter((preset) => preset.id !== (event as CustomEvent<string>).detail));
    const publishPresets = () => window.dispatchEvent(new CustomEvent("logocraft-reference-presets-updated", { detail: referencePresets }));
    window.addEventListener("logocraft-reference-preset-save", savePreset); window.addEventListener("logocraft-reference-preset-apply", applyPreset); window.addEventListener("logocraft-reference-preset-delete", deletePreset); window.addEventListener("logocraft-reference-presets-request", publishPresets); publishPresets();
    return () => { window.removeEventListener("logocraft-reference-preset-save", savePreset); window.removeEventListener("logocraft-reference-preset-apply", applyPreset); window.removeEventListener("logocraft-reference-preset-delete", deletePreset); window.removeEventListener("logocraft-reference-presets-request", publishPresets); };
  }, [referenceLines, referencePresets]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROJECTS_KEY);
      const legacy = window.localStorage.getItem(LEGACY_DRAFT_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as { activeProjectId?: string; projects?: Project[] };
        if (Array.isArray(stored.projects) && stored.projects.length) {
          const active = stored.projects.find((project) => project.id === stored.activeProjectId) ?? stored.projects[0];
          setProjects(stored.projects); setActiveProjectId(active.id); setElements(active.elements); setArtboard(active.artboard ?? DEFAULT_ARTBOARD); setGroups(active.groups ?? []); setReferenceLines(active.referenceLines ?? []); setReferenceVisible(active.referenceVisible ?? true); setReferencePresets(active.referencePresets ?? []); setHistoryMeta(active.historyMeta ?? {}); setDesignName(active.name); setHistory([active.elements]); setHistoryIndex(0); setHistoryLabels(["恢复工程"]); setSelectedIds(active.elements[0] ? [active.elements[0].id] : []);
          toast.message("已恢复本地工程集合。");
        }
      } else if (legacy) {
        const old = JSON.parse(legacy) as { elements?: DesignElement[]; designName?: string };
        if (Array.isArray(old.elements) && old.elements.length) {
          const migrated = freshProject(old.designName || "已迁移草稿", old.elements, []);
          setProjects([migrated]); setActiveProjectId(migrated.id); setElements(migrated.elements); setArtboard(DEFAULT_ARTBOARD); setGroups([]); setReferenceLines([]); setReferenceVisible(true); setReferencePresets([]); setHistoryMeta({}); setDesignName(migrated.name); setHistory([migrated.elements]); setHistoryIndex(0); setHistoryLabels(["迁移旧草稿"]); setSelectedIds(migrated.elements[0] ? [migrated.elements[0].id] : []);
          toast.message("旧草稿已迁移为独立工程。");
        }
      }
    } catch { toast.error("无法读取本地工程，将使用默认画布。"); }
    finally { setProjectReady(true); setProjectStatus("saved"); }
  }, []);
  useEffect(() => { if (window.matchMedia("(max-width: 639px)").matches) setZoom(0.42); }, []);
  useEffect(() => {
    if (!projectReady) return;
    setProjectStatus("saving");
    const timer = window.setTimeout(() => {
      setProjects((previous) => previous.map((project) => project.id === activeProjectId ? { ...project, name: designName || "Untitled mark", elements, artboard, groups, referenceLines, referenceVisible, referencePresets, historyMeta, modifiedAt: new Date().toISOString() } : project));
      setProjectStatus("saved");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [projectReady, activeProjectId, designName, elements, artboard, groups, referenceLines, referenceVisible, referencePresets, historyMeta]);
  useEffect(() => {
    if (!projectReady) return;
    const timer = window.setTimeout(() => window.localStorage.setItem(PROJECTS_KEY, JSON.stringify({ version: 3, activeProjectId, projects })), 500);
    return () => window.clearTimeout(timer);
  }, [projectReady, activeProjectId, projects]);

  const selectedElements = useMemo(() => elements.filter((element) => selectedIds.includes(element.id)), [elements, selectedIds]);
  const selected = selectedElements.length === 1 ? selectedElements[0] : null;
  const visibleLayerCount = elements.filter((element) => !element.hidden).length;
  const scaledWidth = artboard.width * zoom; const scaledHeight = artboard.height * zoom;
  const groupedIds = useMemo(() => new Set(groups.flatMap((group) => group.elementIds)), [groups]);
  const selectionBounds = useMemo(() => {
    if (selectedElements.length < 2) return null;
    const left = Math.min(...selectedElements.map((element) => element.x)); const right = Math.max(...selectedElements.map((element) => element.x + element.width));
    const top = Math.min(...selectedElements.map((element) => element.y)); const bottom = Math.max(...selectedElements.map((element) => element.y + element.height));
    return { left, top, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
  }, [selectedElements]);

  const commit = useCallback((next: DesignElement[], label = "编辑图层") => {
    setElements(next);
    setHistory((previous) => { const revised = [...previous.slice(0, historyIndex + 1), next]; setHistoryIndex(revised.length - 1); return revised; });
    setHistoryLabels((previous) => [...previous.slice(0, historyIndex + 1), label]);
  }, [historyIndex]);
  const pointOnCanvas = (clientX: number, clientY: number) => { const rect = stageRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 }; return { x: clamp((clientX - rect.left) / zoom, 0, artboard.width), y: clamp((clientY - rect.top) / zoom, 0, artboard.height) }; };
  const updateSelected = (updates: Partial<DesignElement>) => { if (!selected) return; commit(elements.map((element) => element.id === selected.id ? { ...element, ...updates } : element)); };
  const updateMany = (updates: Partial<DesignElement>) => { if (!selectedIds.length) return; commit(elements.map((element) => selectedIds.includes(element.id) ? { ...element, ...updates } : element)); };
  const addElement = (part: Omit<DesignElement, "id" | "x" | "y">) => { const next = { ...part, id: uid("element"), x: 314 - part.width / 2, y: 228 - part.height / 2 }; commit([...elements, next]); setSelectedIds([next.id]); toast.success(`已添加${next.name}`); };
  const addText = () => { setActiveTool("text"); setLibraryTab("text"); addElement({ type: "text", name: "文本", width: 260, height: 54, rotation: 0, fill: "#1C1A18", content: "新建标题", fontSize: 36, fontFamily: "DM Sans" }); };
  const addShape = (template: typeof shapeTemplates[number]) => { setActiveTool("shapes"); setLibraryTab("shapes"); addElement({ type: "shape", name: template.name, width: template.width, height: template.height, rotation: 0, fill: template.fill, shape: template.shape }); };
  const applyPreset = (preset: Preset) => { const next = preset.elements.map((element) => ({ ...element, id: uid("preset") })); commit(next); setGroups([]); setSelectedIds(next.map((element) => element.id)); setZoom(1); toast.success(`已应用「${preset.name}」预设。`); };
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) { toast.error("请选择 PNG、JPG 或 SVG 图像文件。"); return; } const reader = new FileReader(); reader.onload = () => addElement({ type: "image", name: file.name, width: 150, height: 150, rotation: 0, fill: "#1C1A18", src: String(reader.result) }); reader.readAsDataURL(file); event.target.value = ""; };

  const resolveSnap = (ids: string[], bases: Record<string, Pick<DesignElement, "x" | "y">>, dx: number, dy: number) => {
    const moving = elements.filter((element) => ids.includes(element.id));
    const targets = elements.filter((element) => !ids.includes(element.id) && !element.hidden);
    const xTargets = [0, artboard.width / 2, artboard.width, ...referenceLines.filter((line) => line.axis === "x").map((line) => line.position), ...targets.flatMap((element) => [element.x, element.x + element.width / 2, element.x + element.width])];
    const yTargets = [0, artboard.height / 2, artboard.height, ...referenceLines.filter((line) => line.axis === "y").map((line) => line.position), ...targets.flatMap((element) => [element.y, element.y + element.height / 2, element.y + element.height])];
    let nextX = dx; let nextY = dy; const nextGuides: Guide[] = [];
    let bestX: { distance: number; correction: number; position: number } | null = null;
    let bestY: { distance: number; correction: number; position: number } | null = null;
    moving.forEach((element) => {
      const base = bases[element.id]; const xEdges = [base.x + dx, base.x + element.width / 2 + dx, base.x + element.width + dx]; const yEdges = [base.y + dy, base.y + element.height / 2 + dy, base.y + element.height + dy];
      xEdges.forEach((edge) => xTargets.forEach((target) => { const distance = Math.abs(target - edge); if (distance <= SNAP_DISTANCE && (!bestX || distance < bestX.distance)) bestX = { distance, correction: target - edge, position: target }; }));
      yEdges.forEach((edge) => yTargets.forEach((target) => { const distance = Math.abs(target - edge); if (distance <= SNAP_DISTANCE && (!bestY || distance < bestY.distance)) bestY = { distance, correction: target - edge, position: target }; }));
    });
    const xSnap = bestX as { distance: number; correction: number; position: number } | null;
    const ySnap = bestY as { distance: number; correction: number; position: number } | null;
    if (xSnap) { nextX += xSnap.correction; nextGuides.push({ axis: "x", position: xSnap.position }); }
    if (ySnap) { nextY += ySnap.correction; nextGuides.push({ axis: "y", position: ySnap.position }); }
    return { dx: nextX, dy: nextY, guides: nextGuides };
  };
  const onObjectPointerDown = (event: ReactPointerEvent<HTMLDivElement>, element: DesignElement) => {
    event.stopPropagation(); const nextSelection = event.shiftKey ? (selectedIds.includes(element.id) ? selectedIds.filter((id) => id !== element.id) : [...selectedIds, element.id]) : (selectedIds.includes(element.id) ? selectedIds : [element.id]); setSelectedIds(nextSelection);
    if (element.locked) { toast.message("此图层已锁定；可在图层管理器中解锁。"); return; }
    const point = pointOnCanvas(event.clientX, event.clientY); const moveIds = nextSelection.filter((id) => !elements.find((candidate) => candidate.id === id)?.locked && !elements.find((candidate) => candidate.id === id)?.hidden); if (!moveIds.length) return;
    const bases = Object.fromEntries(moveIds.map((id) => { const candidate = elements.find((item) => item.id === id)!; return [id, { x: candidate.x, y: candidate.y }]; })); stageRef.current?.setPointerCapture(event.pointerId); setInteraction({ kind: "move", ids: moveIds, startX: point.x, startY: point.y, bases });
  };
  const onResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => { event.preventDefault(); event.stopPropagation(); if (!selected || selected.locked) return; const point = pointOnCanvas(event.clientX, event.clientY); stageRef.current?.setPointerCapture(event.pointerId); setInteraction({ kind: "resize", id: selected.id, handle, startX: point.x, startY: point.y, base: selected }); };
  const onRotatePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation(); if (!selected || selected.locked) return; const point = pointOnCanvas(event.clientX, event.clientY); const centerX = selected.x + selected.width / 2; const centerY = selected.y + selected.height / 2; const startAngle = Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI; stageRef.current?.setPointerCapture(event.pointerId); setInteraction({ kind: "rotate", id: selected.id, startAngle, base: selected }); };
  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (event.target !== event.currentTarget || activeTool !== "pointer") return; const point = pointOnCanvas(event.clientX, event.clientY); stageRef.current?.setPointerCapture(event.pointerId); if (!event.shiftKey) setSelectedIds([]); setInteraction({ kind: "marquee", startX: point.x, startY: point.y, currentX: point.x, currentY: point.y, additive: event.shiftKey }); };
  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointOnCanvas(event.clientX, event.clientY);
    if (guideDrag) { setReferenceLines((previous) => previous.map((line) => line.id === guideDrag.id ? { ...line, position: clamp(guideDrag.axis === "x" ? point.x : point.y, 0, guideDrag.axis === "x" ? artboard.width : artboard.height) } : line)); return; }
    if (!interaction) return;
    if (interaction.kind === "marquee") { setInteraction({ ...interaction, currentX: point.x, currentY: point.y }); return; }
    if (interaction.kind === "move") { const snapped = resolveSnap(interaction.ids, interaction.bases, point.x - interaction.startX, point.y - interaction.startY); setGuides(snapped.guides); setElements((previous) => previous.map((element) => { const base = interaction.bases[element.id]; return base ? { ...element, x: clamp(base.x + snapped.dx, -element.width + MIN_SIZE, artboard.width - MIN_SIZE), y: clamp(base.y + snapped.dy, -element.height + MIN_SIZE, artboard.height - MIN_SIZE) } : element; })); return; }
    if (interaction.kind === "rotate") { const centerX = interaction.base.x + interaction.base.width / 2; const centerY = interaction.base.y + interaction.base.height / 2; const currentAngle = Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI; const raw = interaction.base.rotation + currentAngle - interaction.startAngle; const snap15 = Math.round(raw / 15) * 15; const snap45 = Math.round(raw / 45) * 45; const rotation = Math.abs(raw - snap45) <= 5 ? snap45 : snap15; setRotationTip(((rotation % 360) + 360) % 360); setElements((previous) => previous.map((element) => element.id === interaction.id ? { ...element, rotation } : element)); return; }
    if (interaction.kind === "groupRotate") { const currentAngle = Math.atan2(point.y - interaction.centerY, point.x - interaction.centerX) * 180 / Math.PI; const raw = currentAngle - interaction.startAngle; const delta = Math.round(raw / 15) * 15; const radians = delta * Math.PI / 180; setRotationTip(((delta % 360) + 360) % 360); setElements((previous) => previous.map((element) => { const base = interaction.bases[element.id]; if (!base) return element; const cx = base.x + base.width / 2 - interaction.centerX; const cy = base.y + base.height / 2 - interaction.centerY; const nextCx = interaction.centerX + cx * Math.cos(radians) - cy * Math.sin(radians); const nextCy = interaction.centerY + cx * Math.sin(radians) + cy * Math.cos(radians); return { ...base, x: nextCx - base.width / 2, y: nextCy - base.height / 2, rotation: base.rotation + delta }; })); return; }
    if (interaction.kind === "groupScale") { const distance = Math.hypot(point.x - interaction.centerX, point.y - interaction.centerY); const scale = clamp(distance / interaction.startDistance, 0.2, 4); setElements((previous) => previous.map((element) => { const base = interaction.bases[element.id]; if (!base) return element; const nextWidth = Math.max(MIN_SIZE, base.width * scale); const nextHeight = Math.max(MIN_SIZE, base.height * scale); const nextCx = interaction.centerX + (base.x + base.width / 2 - interaction.centerX) * scale; const nextCy = interaction.centerY + (base.y + base.height / 2 - interaction.centerY) * scale; return { ...base, x: nextCx - nextWidth / 2, y: nextCy - nextHeight / 2, width: nextWidth, height: nextHeight }; })); return; }
    const dx = point.x - interaction.startX; const dy = point.y - interaction.startY; const { base, handle } = interaction; let x = base.x; let y = base.y; let width = base.width; let height = base.height;
    if (handle.includes("e")) width = clamp(base.width + dx, MIN_SIZE, artboard.width - base.x); if (handle.includes("s")) height = clamp(base.height + dy, MIN_SIZE, artboard.height - base.y); if (handle.includes("w")) { x = clamp(base.x + dx, 0, base.x + base.width - MIN_SIZE); width = base.x + base.width - x; } if (handle.includes("n")) { y = clamp(base.y + dy, 0, base.y + base.height - MIN_SIZE); height = base.y + base.height - y; }
    setElements((previous) => previous.map((element) => element.id === interaction.id ? { ...element, x, y, width, height } : element));
  };
  const onStagePointerUp = () => {
    if (guideDrag) { setGuideDrag(null); return; }
    if (!interaction) return;
    if (interaction.kind === "marquee") { const left = Math.min(interaction.startX, interaction.currentX); const top = Math.min(interaction.startY, interaction.currentY); const right = Math.max(interaction.startX, interaction.currentX); const bottom = Math.max(interaction.startY, interaction.currentY); const matched = elements.filter((element) => !element.hidden && element.x + element.width >= left && element.x <= right && element.y + element.height >= top && element.y <= bottom).map((element) => element.id); setSelectedIds((previous) => interaction.additive ? Array.from(new Set([...previous, ...matched])) : matched); } else { const current = elementsRef.current; const label = interaction.kind === "rotate" ? "旋转图层" : interaction.kind === "resize" ? "调整图层尺寸" : "移动图层"; setHistory((previous) => { const revised = [...previous.slice(0, historyIndex + 1), current]; setHistoryIndex(revised.length - 1); return revised; }); setHistoryLabels((previous) => [...previous.slice(0, historyIndex + 1), label]); }
    setGuides([]); setRotationTip(null); setInteraction(null);
  };
  const onCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => { event.preventDefault(); setZoom((current) => clamp(Number((current + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)), 0.4, 2.4)); };

  const alignSelection = (mode: Alignment) => {
    if (selectedElements.length < 2) { toast.message("请选择至少两个图层后进行对齐或分布。"); return; }
    const left = Math.min(...selectedElements.map((element) => element.x)); const right = Math.max(...selectedElements.map((element) => element.x + element.width)); const top = Math.min(...selectedElements.map((element) => element.y)); const bottom = Math.max(...selectedElements.map((element) => element.y + element.height));
    const centerX = (left + right) / 2; const centerY = (top + bottom) / 2; let next = elements.map((element) => ({ ...element })); const selectedSet = new Set(selectedIds);
    if (mode === "distributeX" || mode === "distributeY") {
      if (selectedElements.length < 3) { toast.message("等距分布至少需要三个图层。"); return; }
      const ordered = [...selectedElements].sort((a, b) => mode === "distributeX" ? a.x - b.x : a.y - b.y);
      const span = mode === "distributeX" ? right - left : bottom - top; const occupied = ordered.reduce((total, element) => total + (mode === "distributeX" ? element.width : element.height), 0); const gap = (span - occupied) / (ordered.length - 1); let cursor = mode === "distributeX" ? left : top;
      const coordinates = new Map<string, number>(); ordered.forEach((element) => { coordinates.set(element.id, cursor); cursor += (mode === "distributeX" ? element.width : element.height) + gap; });
      next = next.map((element) => coordinates.has(element.id) ? { ...element, [mode === "distributeX" ? "x" : "y"]: coordinates.get(element.id)! } : element);
    } else next = next.map((element) => {
      if (!selectedSet.has(element.id)) return element;
      if (mode === "left") return { ...element, x: left }; if (mode === "right") return { ...element, x: right - element.width }; if (mode === "centerX") return { ...element, x: centerX - element.width / 2 }; if (mode === "top") return { ...element, y: top }; if (mode === "bottom") return { ...element, y: bottom - element.height }; return { ...element, y: centerY - element.height / 2 };
    });
    commit(next); toast.success(mode.startsWith("distribute") ? "已等距分布所选图层。" : "已对齐所选图层。");
  };
  const alignToReference = (axis: "x" | "y", mode: "start" | "center" | "end" = "center") => {
    if (selectedElements.length < 2) { toast.message("请选择多个图层后对齐至参考线。"); return; }
    const candidates = referenceLines.filter((line) => line.axis === axis); if (!candidates.length) { toast.message(`请先创建${axis === "x" ? "垂直" : "水平"}参考线。`); return; }
    const left = Math.min(...selectedElements.map((element) => element.x)); const right = Math.max(...selectedElements.map((element) => element.x + element.width)); const top = Math.min(...selectedElements.map((element) => element.y)); const bottom = Math.max(...selectedElements.map((element) => element.y + element.height));
    const source = axis === "x" ? (mode === "start" ? left : mode === "end" ? right : (left + right) / 2) : (mode === "start" ? top : mode === "end" ? bottom : (top + bottom) / 2);
    const reference = candidates.reduce((nearest, line) => Math.abs(line.position - source) < Math.abs(nearest.position - source) ? line : nearest);
    const delta = reference.position - source; commit(elements.map((element) => selectedIds.includes(element.id) ? (axis === "x" ? { ...element, x: element.x + delta } : { ...element, y: element.y + delta }) : element), `对齐至${axis === "x" ? "垂直" : "水平"}参考线`); toast.success("已将所选图层对齐到最近参考线。");
  };
  const copyStyle = () => { if (!selected) { toast.message("请选择一个图层后复制样式。"); return; } setStyleClipboard({ fill: selected.fill, fontSize: selected.fontSize, fontFamily: selected.fontFamily, rotation: selected.rotation }); toast.success("图层样式已复制。"); };
  const pasteStyle = () => { if (!selected || !styleClipboard) { toast.message("请先复制样式，再选择目标图层粘贴。"); return; } commit(elements.map((element) => element.id === selected.id ? { ...element, fill: styleClipboard.fill, fontSize: styleClipboard.fontSize, fontFamily: styleClipboard.fontFamily } : element), "粘贴图层样式"); toast.success("图层样式已粘贴。"); };
  const restoreHistory = (index: number) => { if (!history[index]) return; setElements(history[index]); setHistoryIndex(index); setSelectedIds([]); setHistoryOpen(false); toast.message(`已回退到：${historyLabels[index] ?? "历史版本"}`); };
  const undo = () => { if (historyIndex <= 0) return; const nextIndex = historyIndex - 1; setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedIds([]); };
  const redo = () => { if (historyIndex >= history.length - 1) return; const nextIndex = historyIndex + 1; setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedIds([]); };
  const removeSelected = () => { if (!selectedIds.length) return; const next = elements.filter((element) => !selectedIds.includes(element.id)); commit(next); setGroups((previous) => previous.map((group) => ({ ...group, elementIds: group.elementIds.filter((id) => !selectedIds.includes(id)) })).filter((group) => group.elementIds.length)); setSelectedIds([]); toast.message("已移除所选图层"); };
  const toggleLayer = (id: string, key: "locked" | "hidden") => { commit(elements.map((element) => element.id === id ? { ...element, [key]: !element[key] } : element)); if (key === "hidden" && selectedIds.includes(id)) setSelectedIds((previous) => previous.filter((selectedId) => selectedId !== id)); };
  const reorderLayer = (sourceId: string, targetId: string) => { if (sourceId === targetId) return; const sourceIndex = elements.findIndex((element) => element.id === sourceId); const targetIndex = elements.findIndex((element) => element.id === targetId); if (sourceIndex < 0 || targetIndex < 0) return; const next = [...elements]; const [source] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, source); commit(next); };
  const createGroup = () => { if (selectedIds.length < 2) { toast.message("请选择至少两个图层后创建分组。"); return; } const group: LayerGroup = { id: uid("group"), name: `图层组 ${groups.length + 1}`, elementIds: selectedIds }; setGroups((previous) => [...previous.map((item) => ({ ...item, elementIds: item.elementIds.filter((id) => !selectedIds.includes(id)) })).filter((item) => item.elementIds.length), group]); toast.success("已将所选图层编入新组。"); };
  const deleteGroup = (id: string) => { setGroups((previous) => previous.filter((group) => group.id !== id)); toast.message("分组已解除，图层保持不变。"); };
  const toggleGroup = (id: string) => setGroups((previous) => previous.map((group) => group.id === id ? { ...group, collapsed: !group.collapsed } : group));
  const activateProject = (project: Project) => { setActiveProjectId(project.id); setElements(project.elements); setArtboard(project.artboard ?? DEFAULT_ARTBOARD); setGroups(project.groups ?? []); setReferenceLines(project.referenceLines ?? []); setReferenceVisible(project.referenceVisible ?? true); setReferencePresets(project.referencePresets ?? []); setHistoryMeta(project.historyMeta ?? {}); setDesignName(project.name); setHistory([project.elements]); setHistoryIndex(0); setHistoryLabels(["切换工程"]); setSelectedIds([]); setZoom(1); toast.message(`已切换到「${project.name}」。`); };
  const createProject = () => { const project = freshProject(`草稿 ${projects.length + 1}`, initialElements, []); setProjects((previous) => [...previous, project]); activateProject(project); };
  const deleteProject = (id: string) => { if (projects.length === 1) { toast.error("至少保留一个工程草稿。"); return; } const remaining = projects.filter((project) => project.id !== id); setProjects(remaining); if (id === activeProjectId) activateProject(remaining[0]); };
  const exportJson = () => { const payload = { format: "LogoCraft project", version: 5, name: designName, elements, artboard, groups, referenceLines, referenceVisible, referencePresets, historyMeta, exportedAt: new Date().toISOString() }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-project"}.json`; link.click(); URL.revokeObjectURL(link.href); toast.success("JSON 工程文件已导出。"); };
  const importJson = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const payload = JSON.parse(String(reader.result)) as Partial<Project>; if (!Array.isArray(payload.elements)) throw new Error("invalid"); const imported = freshProject(payload.name || file.name.replace(/\.json$/i, "导入工程"), payload.elements as DesignElement[], Array.isArray(payload.groups) ? payload.groups as LayerGroup[] : [], Array.isArray(payload.referenceLines) ? payload.referenceLines as ReferenceLine[] : []); imported.artboard = payload.artboard ?? DEFAULT_ARTBOARD; imported.referenceVisible = payload.referenceVisible ?? true; imported.referencePresets = payload.referencePresets ?? []; imported.historyMeta = payload.historyMeta ?? {}; setProjects((previous) => [...previous, imported]); activateProject(imported); toast.success("JSON 工程已导入为新的草稿。"); } catch { toast.error("无法识别该 JSON 工程文件。"); } }; reader.readAsText(file); event.target.value = ""; };
  const exportSvg = () => { const blob = new Blob([makeSvg(elements, artboard)], { type: "image/svg+xml;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-design"}.svg`; link.click(); URL.revokeObjectURL(link.href); toast.success("SVG 已导出，保留无限缩放能力。"); };
  const exportPng = () => { const svg = makeSvg(elements, artboard); const image = new Image(); image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = artboard.width * 2; canvas.height = artboard.height * 2; const context = canvas.getContext("2d"); if (!context) return; context.drawImage(image, 0, 0, canvas.width, canvas.height); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-design"}.png`; link.click(); toast.success("PNG 已导出。"); }; image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; };
  useEffect(() => { const snapshots = history.map((snapshot, index) => ({ count: snapshot.length, names: snapshot.map((element) => element.name), thumbnail: historyMeta[index]?.thumbnail ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(makeSvg(snapshot, artboard))}` })); const publishHistory = () => window.dispatchEvent(new CustomEvent("logocraft-history-updated", { detail: { labels: historyLabels, activeIndex: historyIndex, meta: historyMeta, snapshots } })); publishHistory(); window.addEventListener("logocraft-history-request", publishHistory); return () => window.removeEventListener("logocraft-history-request", publishHistory); }, [history, historyLabels, historyIndex, historyMeta, artboard]);
  useEffect(() => { const rename = (event: Event) => { const detail = (event as CustomEvent<{ index: number; name: string }>).detail; setHistoryMeta((previous) => ({ ...previous, [detail.index]: { ...previous[detail.index], name: detail.name } })); }; const favorite = (event: Event) => { const index = (event as CustomEvent<number>).detail; const snapshot = history[index]; if (!snapshot) return; const thumbnail = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(makeSvg(snapshot, artboard))}`; setHistoryMeta((previous) => ({ ...previous, [index]: { ...previous[index], favorite: !previous[index]?.favorite, thumbnail } })); }; const exportSnapshot = (event: Event) => { const index = (event as CustomEvent<number>).detail; const snapshot = history[index]; if (!snapshot) return; const blob = new Blob([makeSvg(snapshot, artboard)], { type: "image/svg+xml;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${designName.replace(/\s+/g, "-").toLowerCase() || "logocraft"}-snapshot-${index + 1}.svg`; link.click(); URL.revokeObjectURL(link.href); toast.success("收藏快照已导出为 SVG。"); }; window.addEventListener("logocraft-history-rename", rename); window.addEventListener("logocraft-history-favorite", favorite); window.addEventListener("logocraft-history-export", exportSnapshot); return () => { window.removeEventListener("logocraft-history-rename", rename); window.removeEventListener("logocraft-history-favorite", favorite); window.removeEventListener("logocraft-history-export", exportSnapshot); }; }, [history, artboard, designName]);
  useEffect(() => { const onCopy = () => copyStyle(); const onPaste = () => pasteStyle(); const onRestore = (event: Event) => restoreHistory((event as CustomEvent<number>).detail); const onReferenceAlign = (event: Event) => { const detail = (event as CustomEvent<{ axis: "x" | "y"; mode: "start" | "center" | "end" }>).detail; alignToReference(detail.axis, detail.mode); }; window.addEventListener("logocraft-copy-style", onCopy); window.addEventListener("logocraft-paste-style", onPaste); window.addEventListener("logocraft-history-restore", onRestore); window.addEventListener("logocraft-reference-align", onReferenceAlign); return () => { window.removeEventListener("logocraft-copy-style", onCopy); window.removeEventListener("logocraft-paste-style", onPaste); window.removeEventListener("logocraft-history-restore", onRestore); window.removeEventListener("logocraft-reference-align", onReferenceAlign); }; });
  useEffect(() => { const keyHandler = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if (target.tagName === "INPUT" || target.tagName === "SELECT") return; const meta = event.metaKey || event.ctrlKey; if (meta && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); } if (meta && event.key.toLowerCase() === "c" && selected) { event.preventDefault(); copyStyle(); } if (meta && event.key.toLowerCase() === "v" && selected) { event.preventDefault(); pasteStyle(); } if (event.key === "?") { event.preventDefault(); window.dispatchEvent(new Event("logocraft-shortcuts")); } if (event.key.toLowerCase() === "h") { event.preventDefault(); window.dispatchEvent(new Event("logocraft-history")); } if ((event.key === "Backspace" || event.key === "Delete") && selectedIds.length) { event.preventDefault(); removeSelected(); } if (event.key === "Escape") { setSelectedIds([]); setPreviewOpen(false); setShortcutsOpen(false); setHistoryOpen(false); setInteraction(null); setGuides([]); } }; window.addEventListener("keydown", keyHandler); return () => window.removeEventListener("keydown", keyHandler); });
  const numeric = (key: "x" | "y" | "width" | "height" | "rotation" | "fontSize", value: string) => updateSelected({ [key]: Number(value) } as Partial<DesignElement>);
  const marqueeStyle = interaction?.kind === "marquee" ? { left: Math.min(interaction.startX, interaction.currentX), top: Math.min(interaction.startY, interaction.currentY), width: Math.abs(interaction.currentX - interaction.startX), height: Math.abs(interaction.currentY - interaction.startY) } : null;
  const activeProject = projects.find((project) => project.id === activeProjectId);

  return <main className="editor-shell flex min-h-screen flex-col overflow-hidden">
    <header className="topbar relative z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-white/10 px-3 md:px-5"><div className="flex min-w-0 items-center gap-3"><div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-white/10 bg-[#232326] shadow-inner shadow-white/5"><img src={BRAND_MARK} alt="LogoCraft 图形标志" className="absolute inset-0 h-full w-full object-contain p-1 opacity-30" /><span className="relative h-7 w-7"><MarkGlyph color="#F8F3EA" /></span></div><div className="min-w-0"><div className="relative inline-flex items-baseline font-display text-[15px] font-bold tracking-[-.065em] text-[#fff9f0]"><span>Logo</span><span className="relative text-[#ff875f]">Craft<i className="absolute -bottom-1 left-[1px] h-px w-[93%] bg-[#ff6b35]" /></span></div><div className="technical-muted hidden text-[9px] font-bold text-[#8f8e90] sm:block">LC / SVG EDITOR · 03</div></div><div className="ml-1 hidden h-7 w-px bg-white/10 sm:block" /><input value={designName} onChange={(event) => setDesignName(event.target.value)} aria-label="工程名称" className="hidden w-36 border-0 bg-transparent px-2 text-[12px] font-semibold text-[#c9c7c3] outline-none placeholder:text-[#777] md:block" /><span className="hidden rounded-md bg-[#29292d] px-2 py-1 text-[10px] font-bold text-[#a6a5a4] lg:inline">{projectStatus === "saving" ? "保存中" : "多草稿已保存"}</span></div><div className="flex items-center gap-1.5"><button className="action-button" onClick={undo} disabled={historyIndex <= 0} title="撤销（⌘Z）"><ArrowLeft size={15} /><span className="hidden lg:inline">撤销</span></button><button className="action-button" onClick={redo} disabled={historyIndex >= history.length - 1} title="重做（⌘⇧Z）"><ArrowRight size={15} /><span className="hidden lg:inline">重做</span></button><span className="mx-1 hidden h-6 w-px bg-white/10 md:block" /><button className="action-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /><span className="hidden sm:inline">预览</span></button><button className="action-button action-primary" onClick={exportSvg}><Download size={15} /><span className="hidden sm:inline">导出 SVG</span></button></div></header>
    <div className="flex min-h-0 flex-1">
      <aside className="panel relative z-10 flex w-[58px] shrink-0 flex-col items-center border-r border-white/10 py-3"><button className={`tool-button ${activeTool === "pointer" ? "tool-button-active" : ""}`} onClick={() => setActiveTool("pointer")} title="选择与框选"><MousePointer2 size={18} /></button><button className={`tool-button ${activeTool === "shapes" ? "tool-button-active" : ""}`} onClick={() => { setActiveTool("shapes"); setLibraryTab("shapes"); }} title="添加形状"><Shapes size={18} /></button><button className={`tool-button ${activeTool === "text" ? "tool-button-active" : ""}`} onClick={addText} title="添加文本"><Type size={18} /></button><button className={`tool-button ${activeTool === "upload" ? "tool-button-active" : ""}`} onClick={() => { setActiveTool("upload"); fileRef.current?.click(); }} title="上传图形"><ImageUp size={18} /></button><div className="mt-auto flex flex-col gap-1"><button className="tool-button" onClick={() => setLibraryTab("templates")} title="预设模板"><LayoutTemplate size={17} /></button><button className="tool-button" onClick={() => toast.message("拖动对象时会自动对齐至画布、中心线和其他图层边缘。")} title="智能吸附提示"><Sparkles size={17} /></button></div></aside>
      <aside className="panel hidden w-[244px] shrink-0 border-r border-white/10 lg:flex lg:flex-col"><div className="border-b border-white/10 px-4 pb-3 pt-4"><p className="section-label">资产与模板</p><div className="mt-3 flex gap-1 border-b border-white/10"><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "shapes" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => { setLibraryTab("shapes"); setActiveTool("shapes"); }}>图形</button><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "text" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setLibraryTab("text")}>文字</button><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "templates" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setLibraryTab("templates")}>预设</button></div></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{libraryTab === "text" && <section><p className="section-label">排版</p><button className="mt-3 flex w-full items-center gap-3 border-y border-white/10 bg-[#222225] p-3 text-left transition hover:border-[#ff6b35]/60" onClick={addText}><span className="flex h-9 w-9 items-center justify-center bg-[#1b1b1e] text-[#ff6b35]"><Type size={18} /></span><span><strong className="block text-[12px] text-[#f8f4ec]">添加标题</strong><small className="text-[10px] text-[#909094]">可在检查器中编辑</small></span><Plus className="ml-auto text-[#929196]" size={16} /></button></section>}{libraryTab === "shapes" && <section><p className="section-label">基础几何</p><div className="mt-3 grid grid-cols-2 gap-[1px] overflow-hidden border border-white/10 bg-white/10">{shapeTemplates.map((template) => <button key={template.name} className="specimen-card aspect-square border-0 p-4" onClick={() => addShape(template)} title={`添加${template.name}`}><ShapeGlyph shape={template.shape} fill={template.fill} /></button>)}</div><button className="mt-5 flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-[10px] font-extrabold tracking-[.08em] text-[#aaa9ac] transition hover:border-[#ff6b35]/70 hover:text-[#fff8f2]" onClick={() => fileRef.current?.click()}><Upload size={15} /> 导入 SVG 或图片</button></section>}{libraryTab === "templates" && <section><p className="section-label">快速构图</p><p className="mt-2 text-[10px] leading-relaxed text-[#929196]">应用预设将替换当前画布，并保留为独立工程。</p><div className="mt-3 space-y-2">{presets.map((preset) => <button key={preset.id} onClick={() => applyPreset(preset)} className="template-row group w-full overflow-hidden border border-white/10 bg-[#222225] text-left"><div className="relative h-20 overflow-hidden border-b border-white/10"><img src={preset.thumbnail} alt="" className="h-full w-full object-cover opacity-60 transition duration-200 group-hover:scale-[1.04] group-hover:opacity-85" /><div className="absolute inset-0 bg-gradient-to-r from-[#1e1e21]/70 via-transparent to-[#1e1e21]/20" /></div><div className="flex items-center justify-between p-2.5"><span><strong className="block text-[11px] text-[#f5f0e8]">{preset.name}</strong><small className="text-[9px] text-[#97969a]">{preset.note}</small></span><Plus className="text-[#ff7a4a]" size={15} /></div></button>)}</div></section>}</div></aside>
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#1b1b1d]/60"><div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[.07] px-4 text-[10px] font-bold tracking-[.1em] text-[#88878a]"><span>画布 / 标志主构图</span>{selectedIds.length > 1 ? <div className="alignment-rack"><span className="hidden 2xl:inline">对齐</span>{([ ["left", "L"], ["centerX", "C"], ["right", "R"], ["top", "T"], ["centerY", "M"], ["bottom", "B"], ["distributeX", "↔"], ["distributeY", "↕"] ] as Array<[Alignment, string]>).map(([mode, label]) => <button key={mode} onClick={() => alignSelection(mode)} title={mode} className="alignment-tool">{label}</button>)}</div> : <span className="hidden sm:inline">{artboard.width} × {artboard.height} PX · B {artboard.bleed}</span>}</div><div className="relative min-h-0 flex-1 overflow-auto p-5 md:p-10" onWheel={onCanvasWheel}><div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.06) .6px, transparent .6px)", backgroundSize: "14px 14px" }} /><div className="relative z-[1] mx-auto" style={{ width: scaledWidth }}><div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold tracking-[.12em] text-[#7f7e81]"><span className="technical-number">LOGOCRAFT / 03</span><span className="technical-number">{Math.round(zoom * 100)}%</span></div><div className="relative" style={{ width: scaledWidth, height: scaledHeight }}><div className="drafting-ruler drafting-ruler-top" style={{ width: scaledWidth }}><span>000</span><span>{Math.round(artboard.width * .25)}</span><span>{Math.round(artboard.width * .5)}</span><span>{Math.round(artboard.width * .75)}</span><span>{artboard.width}</span></div><div className="drafting-ruler drafting-ruler-left" style={{ height: scaledHeight }}><span>000</span><span>{Math.round(artboard.height * .5)}</span><span>{artboard.height}</span></div><div className="bleed-frame" style={{ width: scaledWidth, height: scaledHeight, padding: artboard.bleed * zoom }}><div ref={stageRef} className="paper-canvas canvas-grid absolute left-0 top-0" style={{ width: artboard.width, height: artboard.height, transform: `scale(${zoom})`, transformOrigin: "top left" }} onPointerMove={onStagePointerMove} onPointerUp={onStagePointerUp} onPointerDown={onStagePointerDown}><div className="canvas-registration">X 000 · Y 000 · ARTBOARD A</div>{elements.map((element) => <DesignObject key={element.id} element={element} selected={selectedIds.includes(element.id)} allowResize={selectedIds.length === 1} onPointerDown={(event) => onObjectPointerDown(event, element)} onResizePointerDown={onResizePointerDown} />)}{guides.map((guide, index) => <span key={`${guide.axis}-${index}`} className={`smart-guide smart-guide-${guide.axis}`} style={guide.axis === "x" ? { left: guide.position } : { top: guide.position }} />)}{marqueeStyle && <div className="marquee-box" style={marqueeStyle} />}</div></div></div><div className="flex items-center justify-between pt-3 text-[10px] font-semibold text-[#858487]"><span className="technical-number flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" /> RGB / sRGB IEC61966-2.1</span><span className="technical-number">{visibleLayerCount} / {elements.length} 个图层</span></div></div></div><div className="flex h-9 shrink-0 items-center justify-between border-t border-white/[.07] px-4 text-[10px] font-medium text-[#8c8e]"><span className="flex items-center gap-2"><MoveUpRight size={13} /> 智能吸附 · Shift 追加</span><span className="hidden sm:inline">多选后可使用顶部对齐工具</span></div></section>
      <aside className="panel hidden w-[306px] shrink-0 border-l border-white/10 xl:flex xl:flex-col"><div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="section-label">检查器</p><p className="mt-1 text-[12px] font-bold text-[#f4f0e9]">{selected ? selected.name : selectedIds.length > 1 ? `已选择 ${selectedIds.length} 个图层` : "未选择对象"}</p></div>{selectedIds.length > 0 && <button className="tool-button h-8 w-8" onClick={removeSelected} title="移除所选图层"><Trash2 size={15} /></button>}</div><div className="min-h-0 flex-1 overflow-y-auto"><section className="border-b border-white/10 px-4 py-4"><div className="flex items-center justify-between"><p className="section-label">图层与分组</p><span className="flex items-center gap-1 text-[9px] font-bold text-[#8e8d90]"><Layers3 size={12} /> {elements.length}</span></div><div className="mt-3 space-y-1">{groups.map((group) => <div key={group.id} className="group-tray"><div className="group-tray-head"><button className="min-w-0 flex-1 truncate text-left text-[10px] font-extrabold tracking-[.06em] text-[#f6efe7]" onClick={() => { toggleGroup(group.id); setSelectedIds(group.elementIds); }}>{group.collapsed ? "▸" : "▾"} {group.name}</button><button onClick={() => deleteGroup(group.id)} title="解除分组" className="rounded p-1 text-[#868589] hover:text-[#ffb396]"><X size={12} /></button></div>{!group.collapsed && group.elementIds.map((id) => { const element = elements.find((item) => item.id === id); if (!element) return null; return <div key={id} draggable onDragStart={() => setDragLayerId(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragLayerId) reorderLayer(dragLayerId, id); setDragLayerId(null); }} onDragEnd={() => setDragLayerId(null)} className={`layer-row group ${selectedIds.includes(id) ? "layer-row-active" : ""} ${dragLayerId === id ? "opacity-50" : ""}`} onClick={() => setSelectedIds([id])}><GripVertical className="shrink-0 text-[#69696d]" size={12} /><span className="min-w-0 flex-1 truncate text-[10px] font-bold">{element.name}</span><button onClick={(event) => { event.stopPropagation(); toggleLayer(id, "locked"); }} className="layer-action" aria-label="切换锁定">{element.locked ? <Lock size={12} /> : <Unlock size={12} />}</button><button onClick={(event) => { event.stopPropagation(); toggleLayer(id, "hidden"); }} className="layer-action" aria-label="切换可见性">{element.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</button></div>; })}</div>)}{[...elements].reverse().filter((element) => !groupedIds.has(element.id)).map((element) => <div key={element.id} draggable onDragStart={() => setDragLayerId(element.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragLayerId) reorderLayer(dragLayerId, element.id); setDragLayerId(null); }} onDragEnd={() => setDragLayerId(null)} className={`layer-row group ${selectedIds.includes(element.id) ? "layer-row-active" : ""} ${dragLayerId === element.id ? "opacity-50" : ""}`} onClick={() => setSelectedIds([element.id])}><GripVertical className="shrink-0 text-[#69696d]" size={13} /><span className="min-w-0 flex-1 truncate text-[11px] font-bold">{element.name}</span><button onClick={(event) => { event.stopPropagation(); toggleLayer(element.id, "locked"); }} className="layer-action" aria-label="切换锁定">{element.locked ? <Lock size={13} /> : <Unlock size={13} />}</button><button onClick={(event) => { event.stopPropagation(); toggleLayer(element.id, "hidden"); }} className="layer-action" aria-label="切换可见性">{element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button></div>)}</div><div className="mt-2 flex gap-1"><button className="action-button flex-1 px-2 text-[10px]" onClick={createGroup}>+ 创建分组</button><button className="action-button flex-1 px-2 text-[10px]" onClick={() => setSelectedIds(elements.filter((element) => !element.hidden).map((element) => element.id))}>选择可见</button></div></section>
      {selectedIds.length > 1 && <section className="border-b border-white/10 px-4 py-4"><p className="section-label">批量属性</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="inspector-field"><label>统一填充</label><input type="color" value="#FF6B35" onChange={(event) => updateMany({ fill: event.target.value })} /></div><div className="inspector-field"><label>批量状态</label><div className="flex gap-1"><button className="action-button flex-1 px-2" onClick={() => updateMany({ locked: true })}><Lock size={12} /></button><button className="action-button flex-1 px-2" onClick={() => updateMany({ hidden: true })}><EyeOff size={12} /></button></div></div></div><p className="mt-2 text-[9px] text-[#858488]">颜色、锁定与隐藏会应用到全部 {selectedIds.length} 个选中图层。</p></section>}
      {selected && <section className="px-4 py-4"><p className="section-label">属性</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="inspector-field"><label>填充</label><div className="flex h-8 items-center gap-2 rounded-[3px] border border-white/10 bg-[#252529] px-2"><input type="color" value={selected.fill} onChange={(event) => updateSelected({ fill: event.target.value })} className="h-4 w-4 border-0 bg-transparent p-0" /><span className="technical-number text-[10px] font-bold text-[#dad7d2]">{selected.fill.toUpperCase()}</span></div></div><div className="inspector-field"><label>旋转</label><input type="number" value={selected.rotation} onChange={(event) => numeric("rotation", event.target.value)} /></div></div>{selected.type === "text" && <div className="mt-3 space-y-2"><div className="inspector-field"><label>内容</label><input value={selected.content ?? ""} onChange={(event) => updateSelected({ content: event.target.value })} /></div><div className="inspector-field"><label>字号</label><input type="number" value={selected.fontSize} onChange={(event) => numeric("fontSize", event.target.value)} /></div></div>}<div className="mt-4 grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map((key) => <div className="inspector-field" key={key}><label>{key === "width" ? "宽度" : key === "height" ? "高度" : key.toUpperCase()}</label><input type="number" value={Math.round(Number(selected[key]))} onChange={(event) => numeric(key, event.target.value)} /></div>)}</div></section>}
      <section className="border-t border-white/10 px-4 py-4"><div className="flex items-center justify-between"><p className="section-label">工程草稿</p><span className="technical-number text-[9px] text-[#8e8d90]">{projects.length}</span></div><div className="mt-3 space-y-1">{projects.map((project) => <div key={project.id} className={`draft-row ${project.id === activeProjectId ? "draft-row-active" : ""}`}><button onClick={() => activateProject(project)} className="min-w-0 flex-1 truncate text-left text-[10px] font-bold">{project.name}</button><button onClick={() => deleteProject(project.id)} title="删除草稿" className="rounded p-1 text-[#858488] hover:text-[#ffb396]"><Trash2 size={12} /></button></div>)}</div><div className="mt-2 grid grid-cols-3 gap-1"><button className="action-button px-2 text-[10px]" onClick={createProject} title="新建草稿"><Plus size={13} /></button><button className="action-button px-2 text-[10px]" onClick={() => jsonRef.current?.click()} title="导入 JSON"><FolderOpen size={13} /></button><button className="action-button px-2 text-[10px]" onClick={exportJson} title="导出 JSON"><FileDown size={13} /></button></div><p className="mt-2 text-[9px] leading-relaxed text-[#77767a]">当前工程：{activeProject?.name ?? "—"}。修改将自动保存到此浏览器。</p></section></div><div className="border-t border-white/10 p-3"><div className="mb-2 flex items-center justify-between px-1 text-[9px] font-bold text-[#89888c]"><span>画布缩放</span><span className="technical-number">{Math.round(zoom * 100)}%</span></div><div className="flex gap-1"><button className="action-button flex-1" onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.4, 2.4))}><ZoomOut size={14} /></button><button className="action-button flex-1" onClick={() => setZoom(1)}>100%</button><button className="action-button flex-1" onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.4, 2.4))}><ZoomIn size={14} /></button></div><button className="action-button mt-2 w-full justify-start" onClick={() => { commit(initialElements); setGroups([]); setSelectedIds(["craft-mark"]); setZoom(1); toast.success("已还原到 LogoCraft 初始构图。"); }}><RotateCcw size={14} /> 还原初始构图</button></div></aside>
    </div><input ref={fileRef} onChange={handleUpload} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" /><input ref={jsonRef} onChange={importJson} type="file" accept="application/json,.json" className="hidden" />
    {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="预览设计"><div className="modal-surface w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">预览</p><h2 className="mt-1 font-display text-[18px] font-bold text-[#fff9f0]">{designName}</h2></div><button className="tool-button" onClick={() => setPreviewOpen(false)} aria-label="关闭预览"><X size={18} /></button></div><div className="grid gap-4 bg-[#1a1a1c] p-5 md:grid-cols-2"><div className="overflow-hidden rounded-xl bg-[#fbf8f2] shadow-xl"><svg viewBox={`0 0 ${artboard.width} ${artboard.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements, artboard).replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div><div className="overflow-hidden rounded-xl bg-[#09090a] p-0 shadow-xl"><svg viewBox={`0 0 ${artboard.width} ${artboard.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements, artboard).replace('fill=\"#fbf8f2\"', 'fill=\"#09090a\"').replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div></div><div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4"><button className="action-button" onClick={exportPng}><FileDown size={15} /> PNG</button><button className="action-button action-primary" onClick={exportSvg}><Download size={15} /> SVG</button></div></div></div>}
  </main>;
}
