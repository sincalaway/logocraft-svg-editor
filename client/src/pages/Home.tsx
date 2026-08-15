/* Page design: "精密工作台" — graphite tool trays, a warm paper canvas, and lava-amber precision states. */
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  EyeOff,
  FileDown,
  Grid2X2,
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
const CANVAS = { width: 720, height: 520 };
const DRAFT_KEY = "logocraft-editor-draft-v2";
const MIN_SIZE = 16;

type ElementType = "mark" | "text" | "shape" | "image";
type AssetKind = "pointer" | "shapes" | "text" | "upload";
type LibraryTab = "shapes" | "text" | "templates";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

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
  locked?: boolean;
  hidden?: boolean;
};

type Interaction =
  | { kind: "move"; ids: string[]; startX: number; startY: number; bases: Record<string, Pick<DesignElement, "x" | "y">> }
  | { kind: "resize"; id: string; handle: ResizeHandle; startX: number; startY: number; base: DesignElement }
  | { kind: "marquee"; startX: number; startY: number; currentX: number; currentY: number; additive: boolean };

type Preset = { id: string; name: string; note: string; thumbnail: string; elements: Omit<DesignElement, "id">[] };

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

const presets: Preset[] = [
  {
    id: "arch-studio",
    name: "拱形工作室",
    note: "拱形 + 定位点",
    thumbnail: SPECIMEN_ARC,
    elements: [
      { type: "shape", name: "拱形", x: 230, y: 118, width: 250, height: 250, rotation: 0, fill: "#1C1A18", shape: "arc" },
      { type: "shape", name: "琥珀圆", x: 332, y: 248, width: 70, height: 70, rotation: 0, fill: "#FF6B35", shape: "circle" },
      { type: "text", name: "工作室名称", x: 176, y: 388, width: 368, height: 56, rotation: 0, fill: "#1C1A18", content: "STUDIO ARC", fontSize: 38, fontFamily: "DM Sans" },
    ],
  },
  {
    id: "orbit-line",
    name: "轨道档案",
    note: "圆轨 + 标记线",
    thumbnail: SPECIMEN_ORBIT,
    elements: [
      { type: "shape", name: "轨道", x: 210, y: 106, width: 300, height: 300, rotation: 0, fill: "#25394A", shape: "arc" },
      { type: "shape", name: "标记线", x: 350, y: 98, width: 20, height: 312, rotation: 0, fill: "#A64131", shape: "square" },
      { type: "text", name: "档案名称", x: 200, y: 420, width: 320, height: 40, rotation: 0, fill: "#1C1A18", content: "ORBIT / 01", fontSize: 27, fontFamily: "Manrope" },
    ],
  },
  {
    id: "signal-stack",
    name: "信号堆栈",
    note: "星芒 + 双色块",
    thumbnail: SPECIMEN_ARC,
    elements: [
      { type: "shape", name: "深青方", x: 194, y: 132, width: 185, height: 185, rotation: 0, fill: "#25394A", shape: "square" },
      { type: "shape", name: "琥珀星芒", x: 332, y: 200, width: 160, height: 160, rotation: 8, fill: "#FF6B35", shape: "spark" },
      { type: "text", name: "信号字标", x: 185, y: 396, width: 355, height: 56, rotation: 0, fill: "#1C1A18", content: "SIGNAL FORM", fontSize: 35, fontFamily: "DM Sans" },
    ],
  },
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function ResizeHandles({ onPointerDown }: { onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => void }) {
  const handles: Array<{ key: ResizeHandle; className: string; label: string }> = [
    { key: "nw", className: "-left-[7px] -top-[7px] cursor-nwse-resize", label: "左上调整大小" },
    { key: "n", className: "left-1/2 -top-[7px] -translate-x-1/2 cursor-ns-resize", label: "上方调整大小" },
    { key: "ne", className: "-right-[7px] -top-[7px] cursor-nesw-resize", label: "右上调整大小" },
    { key: "e", className: "right-[-7px] top-1/2 -translate-y-1/2 cursor-ew-resize", label: "右侧调整大小" },
    { key: "se", className: "-bottom-[7px] -right-[7px] cursor-nwse-resize", label: "右下调整大小" },
    { key: "s", className: "bottom-[-7px] left-1/2 -translate-x-1/2 cursor-ns-resize", label: "下方调整大小" },
    { key: "sw", className: "-bottom-[7px] -left-[7px] cursor-nesw-resize", label: "左下调整大小" },
    { key: "w", className: "left-[-7px] top-1/2 -translate-y-1/2 cursor-ew-resize", label: "左侧调整大小" },
  ];
  return <>{handles.map((handle) => <button key={handle.key} aria-label={handle.label} className={`resize-handle absolute z-20 ${handle.className}`} onPointerDown={(event) => onPointerDown(event, handle.key)} />)}</>;
}

function DesignObject({ element, selected, allowResize, onPointerDown, onResizePointerDown }: {
  element: DesignElement;
  selected: boolean;
  allowResize: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => void;
}) {
  if (element.hidden) return null;
  const content = element.type === "mark" ? <MarkGlyph color={element.fill} /> : element.type === "shape" ? <ShapeGlyph shape={element.shape} fill={element.fill} /> : element.type === "image" ? <img src={element.src} className="h-full w-full object-contain" draggable={false} alt="已上传的图形" /> : (
    <div className="flex h-full w-full items-center justify-center whitespace-nowrap text-center font-bold leading-none" style={{ color: element.fill, fontSize: element.fontSize, fontFamily: element.fontFamily }}>{element.content}</div>
  );
  return (
    <div
      className={`absolute touch-none select-none ${selected ? "selection-outline" : ""} ${element.locked ? "cursor-not-allowed" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, cursor: element.locked ? "not-allowed" : "grab" }}
      onPointerDown={onPointerDown}
      role="button"
      aria-label={`选择 ${element.name}`}
    >
      {content}
      {selected && !element.locked && allowResize && <ResizeHandles onPointerDown={onResizePointerDown} />}
      {selected && element.locked && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-[#1e1e21] text-[#ff6b35]"><Lock size={10} /></span>}
    </div>
  );
}

function makeSvg(elements: DesignElement[]) {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}"><rect width="100%" height="100%" fill="#fbf8f2"/>${body}</svg>`;
}

export default function Home() {
  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const elementsRef = useRef(elements);
  const [selectedIds, setSelectedIds] = useState<string[]>(["craft-mark"]);
  const [history, setHistory] = useState<DesignElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<AssetKind>("pointer");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("shapes");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [designName, setDesignName] = useState("Untitled mark");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saving" | "saved">("loading");
  const [draftReady, setDraftReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const selectedElements = useMemo(() => elements.filter((element) => selectedIds.includes(element.id)), [elements, selectedIds]);
  const selected = selectedElements.length === 1 ? selectedElements[0] : null;
  const visibleLayerCount = elements.filter((element) => !element.hidden).length;
  const scaledWidth = CANVAS.width * zoom;
  const scaledHeight = CANVAS.height * zoom;

  const commit = useCallback((next: DesignElement[]) => {
    setElements(next);
    setHistory((previous) => {
      const revised = [...previous.slice(0, historyIndex + 1), next];
      setHistoryIndex(revised.length - 1);
      return revised;
    });
  }, [historyIndex]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { elements?: DesignElement[]; designName?: string };
        if (Array.isArray(draft.elements) && draft.elements.length) {
          setElements(draft.elements);
          setHistory([draft.elements]);
          setHistoryIndex(0);
          setSelectedIds([]);
          if (draft.designName) setDesignName(draft.designName);
          toast.message("已恢复此浏览器中的本地草稿。");
        }
      }
    } catch {
      toast.error("无法读取本地草稿，将使用当前画布。");
    } finally {
      setDraftReady(true);
      setDraftStatus("saved");
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setZoom(0.42);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    setDraftStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, elements, designName, savedAt: new Date().toISOString() }));
        setDraftStatus("saved");
      } catch {
        toast.error("本地草稿空间不足，暂未保存最近改动。");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftReady, elements, designName]);

  const pointOnCanvas = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clamp((clientX - rect.left) / zoom, 0, CANVAS.width), y: clamp((clientY - rect.top) / zoom, 0, CANVAS.height) };
  };

  const updateSelected = (updates: Partial<DesignElement>) => {
    if (!selected) return;
    commit(elements.map((element) => element.id === selected.id ? { ...element, ...updates } : element));
  };

  const addElement = (part: Omit<DesignElement, "id" | "x" | "y">) => {
    const next: DesignElement = { ...part, id: uid("element"), x: 314 - part.width / 2, y: 228 - part.height / 2 };
    commit([...elements, next]);
    setSelectedIds([next.id]);
    toast.success(`已添加${next.name}`);
  };

  const addText = () => {
    setActiveTool("text"); setLibraryTab("text");
    addElement({ type: "text", name: "文本", width: 260, height: 54, rotation: 0, fill: "#1C1A18", content: "新建标题", fontSize: 36, fontFamily: "DM Sans" });
  };

  const addShape = (template: typeof shapeTemplates[number]) => {
    setActiveTool("shapes"); setLibraryTab("shapes");
    addElement({ type: "shape", name: template.name, width: template.width, height: template.height, rotation: 0, fill: template.fill, shape: template.shape });
  };

  const applyPreset = (preset: Preset) => {
    const next = preset.elements.map((element) => ({ ...element, id: uid("preset") }));
    commit(next);
    setSelectedIds(next.map((element) => element.id));
    setZoom(1);
    toast.success(`已应用「${preset.name}」预设。`);
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

  const onObjectPointerDown = (event: ReactPointerEvent<HTMLDivElement>, element: DesignElement) => {
    event.stopPropagation();
    const nextSelection = event.shiftKey ? (selectedIds.includes(element.id) ? selectedIds.filter((id) => id !== element.id) : [...selectedIds, element.id]) : (selectedIds.includes(element.id) ? selectedIds : [element.id]);
    setSelectedIds(nextSelection);
    if (element.locked) { toast.message("此图层已锁定；可在图层管理器中解锁。"); return; }
    const point = pointOnCanvas(event.clientX, event.clientY);
    const moveIds = nextSelection.filter((id) => !elements.find((candidate) => candidate.id === id)?.locked && !elements.find((candidate) => candidate.id === id)?.hidden);
    if (!moveIds.length) return;
    const bases = Object.fromEntries(moveIds.map((id) => {
      const candidate = elements.find((item) => item.id === id)!;
      return [id, { x: candidate.x, y: candidate.y }];
    }));
    stageRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ kind: "move", ids: moveIds, startX: point.x, startY: point.y, bases });
  };

  const onResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandle) => {
    event.preventDefault(); event.stopPropagation();
    if (!selected || selected.locked) return;
    const point = pointOnCanvas(event.clientX, event.clientY);
    stageRef.current?.setPointerCapture(event.pointerId);
    setInteraction({ kind: "resize", id: selected.id, handle, startX: point.x, startY: point.y, base: selected });
  };

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || activeTool !== "pointer") return;
    const point = pointOnCanvas(event.clientX, event.clientY);
    stageRef.current?.setPointerCapture(event.pointerId);
    if (!event.shiftKey) setSelectedIds([]);
    setInteraction({ kind: "marquee", startX: point.x, startY: point.y, currentX: point.x, currentY: point.y, additive: event.shiftKey });
  };

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interaction) return;
    const point = pointOnCanvas(event.clientX, event.clientY);
    if (interaction.kind === "marquee") {
      setInteraction({ ...interaction, currentX: point.x, currentY: point.y });
      return;
    }
    if (interaction.kind === "move") {
      const dx = point.x - interaction.startX; const dy = point.y - interaction.startY;
      setElements((previous) => previous.map((element) => {
        const base = interaction.bases[element.id];
        return base ? { ...element, x: clamp(base.x + dx, -element.width + MIN_SIZE, CANVAS.width - MIN_SIZE), y: clamp(base.y + dy, -element.height + MIN_SIZE, CANVAS.height - MIN_SIZE) } : element;
      }));
      return;
    }
    const dx = point.x - interaction.startX; const dy = point.y - interaction.startY;
    const { base, handle } = interaction;
    let x = base.x; let y = base.y; let width = base.width; let height = base.height;
    if (handle.includes("e")) width = clamp(base.width + dx, MIN_SIZE, CANVAS.width - base.x);
    if (handle.includes("s")) height = clamp(base.height + dy, MIN_SIZE, CANVAS.height - base.y);
    if (handle.includes("w")) { x = clamp(base.x + dx, 0, base.x + base.width - MIN_SIZE); width = base.x + base.width - x; }
    if (handle.includes("n")) { y = clamp(base.y + dy, 0, base.y + base.height - MIN_SIZE); height = base.y + base.height - y; }
    setElements((previous) => previous.map((element) => element.id === interaction.id ? { ...element, x, y, width, height } : element));
  };

  const onStagePointerUp = () => {
    if (!interaction) return;
    if (interaction.kind === "marquee") {
      const left = Math.min(interaction.startX, interaction.currentX); const top = Math.min(interaction.startY, interaction.currentY);
      const right = Math.max(interaction.startX, interaction.currentX); const bottom = Math.max(interaction.startY, interaction.currentY);
      const matched = elements.filter((element) => !element.hidden && element.x + element.width >= left && element.x <= right && element.y + element.height >= top && element.y <= bottom).map((element) => element.id);
      setSelectedIds((previous) => interaction.additive ? Array.from(new Set([...previous, ...matched])) : matched);
    } else {
      const current = elementsRef.current;
      setHistory((previous) => {
        const revised = [...previous.slice(0, historyIndex + 1), current];
        setHistoryIndex(revised.length - 1);
        return revised;
      });
    }
    setInteraction(null);
  };

  const onCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((current) => clamp(Number((current + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)), 0.4, 2.4));
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedIds([]);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex); setElements(history[nextIndex]); setSelectedIds([]);
  };
  const removeSelected = () => {
    if (!selectedIds.length) return;
    const next = elements.filter((element) => !selectedIds.includes(element.id));
    commit(next); setSelectedIds([]); toast.message(`${selectedIds.length} 个图层已移除`);
  };

  const toggleLayer = (id: string, key: "locked" | "hidden") => {
    const next = elements.map((element) => element.id === id ? { ...element, [key]: !element[key] } : element);
    commit(next);
    if (key === "hidden" && selectedIds.includes(id)) setSelectedIds((previous) => previous.filter((selectedId) => selectedId !== id));
  };

  const reorderLayer = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceIndex = elements.findIndex((element) => element.id === sourceId);
    const targetIndex = elements.findIndex((element) => element.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...elements];
    const [source] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    commit(next);
  };

  const exportSvg = () => {
    const blob = new Blob([makeSvg(elements)], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${designName.trim().replace(/\s+/g, "-").toLowerCase() || "logocraft-design"}.svg`; link.click(); URL.revokeObjectURL(link.href);
    toast.success("SVG 已导出，保留无限缩放能力。");
  };

  const exportPng = () => {
    const svg = makeSvg(elements); const image = new Image();
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
      if ((event.key === "Backspace" || event.key === "Delete") && selectedIds.length) { event.preventDefault(); removeSelected(); }
      if (event.key === "Escape") { setSelectedIds([]); setPreviewOpen(false); setInteraction(null); }
    };
    window.addEventListener("keydown", keyHandler); return () => window.removeEventListener("keydown", keyHandler);
  });

  const numeric = (key: "x" | "y" | "width" | "height" | "rotation" | "fontSize", value: string) => updateSelected({ [key]: Number(value) } as Partial<DesignElement>);
  const marqueeStyle = interaction?.kind === "marquee" ? { left: Math.min(interaction.startX, interaction.currentX), top: Math.min(interaction.startY, interaction.currentY), width: Math.abs(interaction.currentX - interaction.startX), height: Math.abs(interaction.currentY - interaction.startY) } : null;

  return (
    <main className="editor-shell flex min-h-screen flex-col overflow-hidden">
      <header className="topbar relative z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-white/10 px-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-white/10 bg-[#232326] shadow-inner shadow-white/5"><img src={BRAND_MARK} alt="LogoCraft 图形标志" className="absolute inset-0 h-full w-full object-contain p-1 opacity-30" /><span className="relative h-7 w-7"><MarkGlyph color="#F8F3EA" /></span></div>
          <div className="min-w-0"><div className="relative inline-flex items-baseline font-display text-[15px] font-bold tracking-[-.065em] text-[#fff9f0]"><span>Logo</span><span className="relative text-[#ff875f]">Craft<i className="absolute -bottom-1 left-[1px] h-px w-[93%] bg-[#ff6b35]" /></span></div><div className="technical-muted hidden text-[9px] font-bold text-[#8f8e90] sm:block">LC / SVG EDITOR · 02</div></div>
          <div className="ml-1 hidden h-7 w-px bg-white/10 sm:block" />
          <input value={designName} onChange={(event) => setDesignName(event.target.value)} aria-label="设计名称" className="hidden w-36 border-0 bg-transparent px-2 text-[12px] font-semibold text-[#c9c7c3] outline-none placeholder:text-[#777] md:block" />
          <span className="hidden rounded-md bg-[#29292d] px-2 py-1 text-[10px] font-bold text-[#a6a5a4] lg:inline">{draftStatus === "saving" ? "保存中" : "自动保存"}</span>
        </div>
        <div className="flex items-center gap-1.5"><button className="action-button" onClick={undo} disabled={historyIndex <= 0} title="撤销（⌘Z）"><ArrowLeft size={15} /><span className="hidden lg:inline">撤销</span></button><button className="action-button" onClick={redo} disabled={historyIndex >= history.length - 1} title="重做（⌘⇧Z）"><ArrowRight size={15} /><span className="hidden lg:inline">重做</span></button><span className="mx-1 hidden h-6 w-px bg-white/10 md:block" /><button className="action-button" onClick={() => setPreviewOpen(true)}><Eye size={15} /><span className="hidden sm:inline">预览</span></button><button className="action-button action-primary" onClick={exportSvg}><Download size={15} /><span className="hidden sm:inline">导出 SVG</span></button></div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="panel relative z-10 flex w-[58px] shrink-0 flex-col items-center border-r border-white/10 py-3">
          <button className={`tool-button ${activeTool === "pointer" ? "tool-button-active" : ""}`} onClick={() => setActiveTool("pointer")} title="选择与框选"><MousePointer2 size={18} /></button>
          <button className={`tool-button ${activeTool === "shapes" ? "tool-button-active" : ""}`} onClick={() => { setActiveTool("shapes"); setLibraryTab("shapes"); }} title="添加形状"><Shapes size={18} /></button>
          <button className={`tool-button ${activeTool === "text" ? "tool-button-active" : ""}`} onClick={addText} title="添加文本"><Type size={18} /></button>
          <button className={`tool-button ${activeTool === "upload" ? "tool-button-active" : ""}`} onClick={() => { setActiveTool("upload"); fileRef.current?.click(); }} title="上传图形"><ImageUp size={18} /></button>
          <div className="mt-auto flex flex-col gap-1"><button className="tool-button" onClick={() => setLibraryTab("templates")} title="预设模板"><LayoutTemplate size={17} /></button><button className="tool-button" onClick={() => toast.message("拖动空白区域即可框选；Shift 可追加选择；滚轮缩放画布。")} title="编辑提示"><Sparkles size={17} /></button></div>
        </aside>

        <aside className="panel hidden w-[244px] shrink-0 border-r border-white/10 lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-4 pb-3 pt-4"><p className="section-label">资产与模板</p><div className="mt-3 flex gap-1 border-b border-white/10"><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "shapes" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => { setLibraryTab("shapes"); setActiveTool("shapes"); }}>图形</button><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "text" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setLibraryTab("text")}>文字</button><button className={`tool-tab flex-1 px-1 py-2 text-[9px] font-extrabold tracking-[.08em] ${libraryTab === "templates" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setLibraryTab("templates")}>预设</button></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {libraryTab === "text" && <section><p className="section-label">排版</p><button className="mt-3 flex w-full items-center gap-3 border-y border-white/10 bg-[#222225] p-3 text-left transition hover:border-[#ff6b35]/60" onClick={addText}><span className="flex h-9 w-9 items-center justify-center bg-[#1b1b1e] text-[#ff6b35]"><Type size={18} /></span><span><strong className="block text-[12px] text-[#f8f4ec]">添加标题</strong><small className="text-[10px] text-[#909094]">可在检查器中编辑</small></span><Plus className="ml-auto text-[#929196]" size={16} /></button><p className="mb-2 mt-6 section-label">字体组合</p><div className="border-y border-white/10 bg-[#222225] p-3"><p className="font-display text-lg font-bold text-[#f6f2ea]">DM Sans</p><p className="mt-1 text-[10px] text-[#98979a]">清晰字形，用于标志与标题</p></div></section>}
            {libraryTab === "shapes" && <section><p className="section-label">基础几何</p><div className="mt-3 grid grid-cols-2 gap-[1px] overflow-hidden border border-white/10 bg-white/10">{shapeTemplates.map((template) => <button key={template.name} className="specimen-card aspect-square border-0 p-4" onClick={() => addShape(template)} title={`添加${template.name}`}><ShapeGlyph shape={template.shape} fill={template.fill} /></button>)}</div><button className="mt-5 flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-[10px] font-extrabold tracking-[.08em] text-[#aaa9ac] transition hover:border-[#ff6b35]/70 hover:text-[#fff8f2]" onClick={() => fileRef.current?.click()}><Upload size={15} /> 导入 SVG 或图片</button></section>}
            {libraryTab === "templates" && <section><p className="section-label">快速构图</p><p className="mt-2 text-[10px] leading-relaxed text-[#929196]">应用预设将替换当前画布，并保留在本地草稿中。</p><div className="mt-3 space-y-2">{presets.map((preset) => <button key={preset.id} onClick={() => applyPreset(preset)} className="template-row group w-full overflow-hidden border border-white/10 bg-[#222225] text-left"><div className="relative h-20 overflow-hidden border-b border-white/10"><img src={preset.thumbnail} alt="" className="h-full w-full object-cover opacity-60 transition duration-200 group-hover:scale-[1.04] group-hover:opacity-85" /><div className="absolute inset-0 bg-gradient-to-r from-[#1e1e21]/70 via-transparent to-[#1e1e21]/20" /></div><div className="flex items-center justify-between p-2.5"><span><strong className="block text-[11px] text-[#f5f0e8]">{preset.name}</strong><small className="text-[9px] text-[#97969a]">{preset.note}</small></span><Plus className="text-[#ff7a4a]" size={15} /></div></button>)}</div></section>}
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#1b1b1d]/60">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[.07] px-4 text-[10px] font-bold tracking-[.1em] text-[#88878a]"><span>画布 / 标志主构图</span><span className="hidden sm:inline">720 × 520 PX</span></div>
          <div className="relative min-h-0 flex-1 overflow-auto p-5 md:p-10" onWheel={onCanvasWheel}>
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.06) .6px, transparent .6px)", backgroundSize: "14px 14px" }} />
            <div className="relative z-[1] mx-auto" style={{ width: scaledWidth }}>
              <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-bold tracking-[.12em] text-[#7f7e81]"><span className="technical-number">LOGOCRAFT / 02</span><span className="technical-number">{Math.round(zoom * 100)}%</span></div>
              <div className="relative" style={{ width: scaledWidth, height: scaledHeight }}>
                <div className="drafting-ruler drafting-ruler-top" style={{ width: scaledWidth }}><span>000</span><span>{Math.round(CANVAS.width * .25)}</span><span>{Math.round(CANVAS.width * .5)}</span><span>{Math.round(CANVAS.width * .75)}</span><span>{CANVAS.width}</span></div>
                <div className="drafting-ruler drafting-ruler-left" style={{ height: scaledHeight }}><span>000</span><span>{Math.round(CANVAS.height * .5)}</span><span>{CANVAS.height}</span></div>
                <div ref={stageRef} className="paper-canvas canvas-grid absolute left-0 top-0" style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${zoom})`, transformOrigin: "top left" }} onPointerMove={onStagePointerMove} onPointerUp={onStagePointerUp} onPointerDown={onStagePointerDown}>
                  <div className="canvas-registration">X 000 · Y 000 · ARTBOARD A</div>
                  {elements.map((element) => <DesignObject key={element.id} element={element} selected={selectedIds.includes(element.id)} allowResize={selectedIds.length === 1} onPointerDown={(event) => onObjectPointerDown(event, element)} onResizePointerDown={onResizePointerDown} />)}
                  {marqueeStyle && <div className="marquee-box" style={marqueeStyle} />}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 text-[10px] font-semibold text-[#858487]"><span className="technical-number flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" /> RGB / sRGB IEC61966-2.1</span><span className="technical-number">{visibleLayerCount} / {elements.length} 个图层</span></div>
            </div>
          </div>
          <div className="flex h-9 shrink-0 items-center justify-between border-t border-white/[.07] px-4 text-[10px] font-medium text-[#8c8b8e]"><span className="flex items-center gap-2"><MoveUpRight size={13} /> 框选多元素 · Shift 追加</span><span className="hidden sm:inline">滚轮缩放 · <kbd className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-[#c1c0be]">Delete</kbd> 删除</span></div>
        </section>

        <aside className="panel hidden w-[290px] shrink-0 border-l border-white/10 xl:flex xl:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="section-label">检查器</p><p className="mt-1 text-[12px] font-bold text-[#f4f0e9]">{selected ? selected.name : selectedIds.length > 1 ? `已选择 ${selectedIds.length} 个图层` : "未选择对象"}</p></div>{selectedIds.length > 0 && <button className="tool-button h-8 w-8" onClick={removeSelected} title="移除所选图层"><Trash2 size={15} /></button>}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="border-b border-white/10 px-4 py-4"><div className="flex items-center justify-between"><p className="section-label">图层管理</p><span className="flex items-center gap-1 text-[9px] font-bold text-[#8e8d90]"><Layers3 size={12} /> {elements.length}</span></div><div className="mt-3 space-y-1">{[...elements].reverse().map((element) => <div key={element.id} draggable onDragStart={() => setDragLayerId(element.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragLayerId) reorderLayer(dragLayerId, element.id); setDragLayerId(null); }} onDragEnd={() => setDragLayerId(null)} className={`layer-row group ${selectedIds.includes(element.id) ? "layer-row-active" : ""} ${dragLayerId === element.id ? "opacity-50" : ""}`} onClick={() => setSelectedIds([element.id])}><GripVertical className="shrink-0 text-[#69696d]" size={13} /><span className="min-w-0 flex-1 truncate text-[11px] font-bold">{element.name}</span><button onClick={(event) => { event.stopPropagation(); toggleLayer(element.id, "locked"); }} className="rounded p-1 text-[#89888c] hover:bg-white/10 hover:text-[#ffb396]" aria-label={element.locked ? "解锁图层" : "锁定图层"}>{element.locked ? <Lock size={13} /> : <Unlock size={13} />}</button><button onClick={(event) => { event.stopPropagation(); toggleLayer(element.id, "hidden"); }} className="rounded p-1 text-[#89888c] hover:bg-white/10 hover:text-[#ffb396]" aria-label={element.hidden ? "显示图层" : "隐藏图层"}>{element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button></div>)}</div><p className="mt-3 text-[9px] leading-relaxed text-[#77767a]">拖动图层改变前后层级；锁定后无法在画布移动或调整。</p></section>
            {selected && <div className="px-4 py-4"><section><p className="section-label">外观</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="inspector-field"><label>填充</label><div className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-[#252529] px-2"><input type="color" value={selected.fill} onChange={(event) => updateSelected({ fill: event.target.value })} className="h-4 w-4 border-0 bg-transparent p-0" /><span className="text-[10px] font-bold text-[#dad7d2]">{selected.fill.toUpperCase()}</span></div></div><div className="inspector-field"><label>旋转</label><input type="number" value={selected.rotation} onChange={(event) => numeric("rotation", event.target.value)} /></div></div><div className="mt-3 grid grid-cols-2 gap-[3px] border-y border-white/10 py-2">{palettes.map((palette) => <button key={palette.name} aria-label={`设为${palette.name}`} onClick={() => updateSelected({ fill: palette.color })} className={`h-6 border transition hover:brightness-125 ${selected.fill === palette.color ? "border-[#ff6b35] ring-1 ring-[#ff6b35]" : "border-white/10"}`} style={{ background: palette.color, filter: palette.color === "#FF6B35" ? "saturate(1)" : "saturate(.55)" }} />)}</div></section>
              {selected.type === "text" && <section className="mt-6 border-t border-white/10 pt-5"><p className="section-label">文字</p><div className="mt-3 space-y-3"><div className="inspector-field"><label>内容</label><input value={selected.content ?? ""} onChange={(event) => updateSelected({ content: event.target.value })} /></div><div className="grid grid-cols-2 gap-2"><div className="inspector-field"><label>字号</label><input type="number" min="10" max="160" value={selected.fontSize} onChange={(event) => numeric("fontSize", event.target.value)} /></div><div className="inspector-field"><label>字体</label><select value={selected.fontFamily} onChange={(event) => updateSelected({ fontFamily: event.target.value })}><option>DM Sans</option><option>Manrope</option><option>Georgia</option><option>Arial Black</option></select></div></div></div></section>}
              <section className="mt-6 border-t border-white/10 pt-5"><p className="section-label">位置与尺寸</p><div className="mt-3 grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map((key) => <div className="inspector-field" key={key}><label>{key === "width" ? "宽度" : key === "height" ? "高度" : key.toUpperCase()}</label><input type="number" value={Math.round(Number(selected[key]))} onChange={(event) => numeric(key, event.target.value)} /></div>)}</div></section></div>}
            {!selected && selectedIds.length === 0 && <div className="px-4 py-6 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white/[.05] text-[#ff6b35]"><MousePointer2 size={17} /></div><p className="mt-3 text-[11px] font-bold text-[#dad7d1]">选择一个图层</p><p className="mt-1 text-[10px] leading-relaxed text-[#89888c]">在画布框选多个对象，或从图层列表定位对象。</p></div>}
          </div>
          <div className="border-t border-white/10 p-3"><div className="mb-2 flex items-center justify-between px-1 text-[9px] font-bold text-[#89888c]"><span>画布缩放</span><span className="technical-number">{Math.round(zoom * 100)}%</span></div><div className="flex gap-1"><button className="action-button flex-1" onClick={() => setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.4, 2.4))}><ZoomOut size={14} /></button><button className="action-button flex-1" onClick={() => setZoom(1)}>100%</button><button className="action-button flex-1" onClick={() => setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.4, 2.4))}><ZoomIn size={14} /></button></div><button className="action-button mt-2 w-full justify-start" onClick={() => { commit(initialElements); setSelectedIds(["craft-mark"]); setZoom(1); toast.success("已还原到 LogoCraft 初始构图。"); }}><RotateCcw size={14} /> 还原初始构图</button></div>
        </aside>
      </div>
      <input ref={fileRef} onChange={handleUpload} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" />

      {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="预览设计"><div className="modal-surface w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">预览</p><h2 className="mt-1 font-display text-[18px] font-bold text-[#fff9f0]">{designName}</h2></div><button className="tool-button" onClick={() => setPreviewOpen(false)} aria-label="关闭预览"><X size={18} /></button></div><div className="grid gap-4 bg-[#1a1a1c] p-5 md:grid-cols-2"><div className="overflow-hidden rounded-xl bg-[#fbf8f2] shadow-xl"><svg viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements).replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div><div className="overflow-hidden rounded-xl bg-[#09090a] p-0 shadow-xl"><svg viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`} className="block w-full" dangerouslySetInnerHTML={{ __html: makeSvg(elements).replace('fill=\"#fbf8f2\"', 'fill=\"#09090a\"').replace(/^<svg[^>]*>|<\/svg>$/g, "") }} /></div></div><div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4"><button className="action-button" onClick={exportPng}><FileDown size={15} /> PNG</button><button className="action-button action-primary" onClick={exportSvg}><Download size={15} /> SVG</button></div></div></div>}
    </main>
  );
}
