/* Precision workbench SVG library: graphite archive drawer, paper specimen tiles, amber only for executable actions. */
import { FilePenLine, LibraryBig, Plus, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const SVG_LIBRARY_KEY = "logocraft-svg-library-v1";
const MAX_ASSETS = 36;
const MAX_FILE_BYTES = 800 * 1024;
const MAX_LIBRARY_BYTES = 4.2 * 1024 * 1024;

type SvgLibraryItem = { id: string; name: string; dataUrl: string; markup: string; viewBox: string; createdAt: string };
const uid = () => `svg-library-${Math.random().toString(36).slice(2, 8)}`;

function prepareSvg(source: string, fallbackName: string): Omit<SvgLibraryItem, "id" | "createdAt"> {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror") || parsed.documentElement.nodeName.toLowerCase() !== "svg") throw new Error("invalid svg");
  parsed.querySelectorAll("script, foreignObject, iframe, object, embed, style, image, a, animate, animateTransform, set").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => Array.from(node.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase(); const value = attribute.value.trim().toLowerCase();
    if (name.startsWith("on") || ((name === "href" || name === "xlink:href") && !value.startsWith("#"))) node.removeAttribute(attribute.name);
  }));
  const root = parsed.documentElement; root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = root.getAttribute("viewBox") || "0 0 240 240";
  return { name: fallbackName.replace(/\.svg$/i, "").trim() || "未命名 SVG", dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(root.outerHTML)}`, markup: root.innerHTML, viewBox };
}

export default function SvgLibraryPanel() {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<SvgLibraryItem[]>([]);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SVG_LIBRARY_KEY) || "[]");
      if (Array.isArray(stored)) setAssets(stored.filter((item): item is SvgLibraryItem => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.dataUrl === "string" && typeof item.markup === "string" && typeof item.viewBox === "string").slice(0, MAX_ASSETS));
    } catch { toast.error("无法读取本地 SVG 图库。"); }
    finally { setReady(true); }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(SVG_LIBRARY_KEY, JSON.stringify(assets)); }
    catch { toast.error("SVG 图库空间不足，请删除较大的资产后重试。"); }
  }, [assets, ready]);

  useEffect(() => {
    const show = () => setOpen(true);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    if (new URLSearchParams(window.location.search).get("svgLibrary") === "1") setOpen(true);
    window.addEventListener("logocraft-svg-library-open", show); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("logocraft-svg-library-open", show); window.removeEventListener("keydown", key); };
  }, []);

  const addAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!(file.type === "image/svg+xml" || /\.svg$/i.test(file.name))) { toast.error("SVG 图库仅接受 .svg 文件。"); event.target.value = ""; return; }
    if (file.size > MAX_FILE_BYTES) { toast.error("单个 SVG 请控制在 800 KB 内，以保护本地图库空间。"); event.target.value = ""; return; }
    if (assets.length >= MAX_ASSETS) { toast.error(`SVG 图库最多保存 ${MAX_ASSETS} 个资产，请先清理不用的图形。`); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const item: SvgLibraryItem = { ...prepareSvg(String(reader.result), file.name), id: uid(), createdAt: new Date().toISOString() };
        if (new Blob([JSON.stringify([item, ...assets])]).size > MAX_LIBRARY_BYTES) throw new Error("storage");
        setAssets((previous) => [item, ...previous]); toast.success(`已加入 SVG 图库：${item.name}`);
      } catch { toast.error("该 SVG 无法安全解析，或图库存储空间不足。"); }
    };
    reader.readAsText(file); event.target.value = "";
  };

  const insertAsset = (asset: SvgLibraryItem) => {
    window.dispatchEvent(new CustomEvent("logocraft-svg-library-insert", { detail: asset }));
    setOpen(false); toast.success(`已插入「${asset.name}」。`);
  };

  const renameAsset = (asset: SvgLibraryItem) => {
    const name = window.prompt("重命名 SVG 资产", asset.name)?.trim();
    if (!name || name === asset.name) return;
    setAssets((previous) => previous.map((item) => item.id === asset.id ? { ...item, name } : item));
  };

  return <>
    <button className="fixed right-4 top-[74px] z-30 inline-flex items-center gap-2 border border-[#ff6b35]/45 bg-[#1d1d20]/95 px-3 py-2 text-[10px] font-extrabold tracking-[.08em] text-[#fff5ec] shadow-lg backdrop-blur transition hover:border-[#ff6b35] hover:bg-[#29292d] active:scale-[.97]" title="打开本地 SVG 图库" onClick={() => setOpen(true)}><LibraryBig size={15} className="text-[#ff6b35]" /> SVG 图库</button>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="SVG 图库">
      <section className="modal-surface flex max-h-[min(720px,calc(100dvh-32px))] w-full max-w-4xl flex-col overflow-hidden border border-white/10 bg-[#1d1d20] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">本地资产档案</p><h2 className="mt-1 flex items-center gap-2 font-display text-[20px] font-bold text-[#fff8f0]"><LibraryBig size={18} className="text-[#ff6b35]" /> SVG 图库 <span className="technical-number text-[10px] text-[#8f8d90]">{assets.length}/{MAX_ASSETS}</span></h2></div><div className="flex items-center gap-2"><button className="action-button action-primary h-9 px-3 text-[10px]" onClick={() => fileRef.current?.click()}><Upload size={14} /> 上传 SVG</button><button className="tool-button h-9 w-9" title="关闭 SVG 图库" onClick={() => setOpen(false)}><X size={17} /></button></div></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5"><p className="mb-4 max-w-2xl text-[11px] leading-relaxed text-[#9b999d]">图库只保存在当前浏览器。上传的 SVG 会移除脚本、位图和外部引用；资产插入画板后仍可独立编辑与导出。</p>{assets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{assets.map((asset) => <article key={asset.id} className="group relative overflow-hidden border border-white/10 bg-[#222225]"><button className="block w-full text-left" title={`插入 ${asset.name}`} onClick={() => insertAsset(asset)}><div className="flex aspect-[5/4] items-center justify-center border-b border-white/10 bg-[#fbf8f2] p-4"><img src={asset.dataUrl} alt="" className="h-full w-full object-contain" /></div><div className="truncate px-3 py-2.5 text-[11px] font-bold text-[#eee9e1]">{asset.name}</div></button><div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100"><button className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#1d1d20]/95 text-[#c7c3be] hover:text-[#ff9c77]" title="重命名资产" onClick={() => renameAsset(asset)}><FilePenLine size={13} /></button><button className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#1d1d20]/95 text-[#c7c3be] hover:text-[#ff8a73]" title="删除资产" onClick={() => setAssets((previous) => previous.filter((item) => item.id !== asset.id))}><Trash2 size={13} /></button></div></article>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-white/15 bg-[#19191b] text-center"><LibraryBig size={28} className="mb-3 text-[#ff6b35]" /><strong className="text-[13px] text-[#f4efe7]">SVG 图库尚为空</strong><p className="mt-2 max-w-xs text-[11px] leading-relaxed text-[#939196]">上传您自己的矢量图形后，可在此重命名、删除，并一键插入当前画板。</p><button className="action-button action-primary mt-4 h-9 px-4 text-[10px]" onClick={() => fileRef.current?.click()}><Plus size={14} /> 上传第一个 SVG</button></div>}</div>
        <footer className="border-t border-white/10 px-5 py-3 text-[9px] leading-relaxed text-[#858387]">单个资产上限 800 KB；图库最多 {MAX_ASSETS} 个资产。若需要跨浏览器迁移，请保留原始 SVG 文件后重新上传。</footer>
        <input ref={fileRef} type="file" accept="image/svg+xml,.svg" className="hidden" onChange={addAsset} />
      </section>
    </div>}
  </>;
}
