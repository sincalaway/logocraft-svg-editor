/* Precision workbench SVG library: graphite archive drawer, paper specimen tiles, amber only for executable actions. */
import { FilePenLine, FolderTree, Heart, LibraryBig, LoaderCircle, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const SVG_LIBRARY_KEY = "logocraft-svg-library-v1";
const SVG_FAVORITES_KEY = "logocraft-svg-catalog-favorites-v1";
const MAX_ASSETS = 36;
const MAX_FILE_BYTES = 800 * 1024;
const MAX_LIBRARY_BYTES = 4.2 * 1024 * 1024;

type SvgLibraryItem = { id: string; name: string; dataUrl: string; markup: string; viewBox: string; createdAt: string };
type CatalogCategory = { id: string; name: string; count: number; manifest: string };
type CatalogAsset = { id: string; name: string; path: string; categoryId?: string; categoryName?: string };
const uid = () => `svg-library-${Math.random().toString(36).slice(2, 8)}`;

function prepareSvg(source: string, fallbackName: string): Omit<SvgLibraryItem, "id" | "createdAt"> {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror") || parsed.documentElement.nodeName.toLowerCase() !== "svg") throw new Error("invalid svg");
  parsed.querySelectorAll("script, foreignObject, iframe, object, embed, style, image, a, animate, animateTransform, set").forEach((node) => node.remove());
  parsed.querySelectorAll("*").forEach((node) => Array.from(node.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase(); const value = attribute.value.trim().toLowerCase();
    if (name.startsWith("on") || ((name === "href" || name === "xlink:href") && !value.startsWith("#")) || (value.includes("url(") && !value.includes("url(#"))) node.removeAttribute(attribute.name);
  }));
  const root = parsed.documentElement; root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = root.getAttribute("viewBox") || "0 0 240 240";
  return { name: fallbackName.replace(/\.svg$/i, "").trim() || "未命名 SVG", dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(root.outerHTML)}`, markup: root.innerHTML, viewBox };
}

export default function SvgLibraryPanel() {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<SvgLibraryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<"local" | "catalog" | "favorites">("catalog");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [catalogAssets, setCatalogAssets] = useState<CatalogAsset[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<CatalogAsset[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SVG_LIBRARY_KEY) || "[]");
      if (Array.isArray(stored)) setAssets(stored.filter((item): item is SvgLibraryItem => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.dataUrl === "string" && typeof item.markup === "string" && typeof item.viewBox === "string").slice(0, MAX_ASSETS));
      const storedFavorites = JSON.parse(window.localStorage.getItem(SVG_FAVORITES_KEY) || "[]");
      if (Array.isArray(storedFavorites)) setFavorites(Array.from(new Set(storedFavorites.filter((item): item is string => typeof item === "string"))).slice(0, 600));
    } catch { toast.error("无法读取本地 SVG 图库或收藏。 "); }
    finally { setReady(true); setFavoritesReady(true); }
    fetch("/svg-library/index.json").then((response) => response.ok ? response.json() : Promise.reject(new Error("catalog unavailable"))).then((payload: { categories?: CatalogCategory[] }) => {
      const next = Array.isArray(payload.categories) ? payload.categories : [];
      setCategories(next); if (next[0]) setActiveCategory(next[0].id);
    }).catch(() => setCatalogStatus("error"));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(SVG_LIBRARY_KEY, JSON.stringify(assets)); }
    catch { toast.error("SVG 图库空间不足，请删除较大的资产后重试。 "); }
  }, [assets, ready]);

  useEffect(() => {
    if (!favoritesReady) return;
    try { window.localStorage.setItem(SVG_FAVORITES_KEY, JSON.stringify(favorites)); }
    catch { toast.error("无法保存 SVG 收藏。 "); }
  }, [favorites, favoritesReady]);

  useEffect(() => {
    if (source !== "catalog" || !activeCategory) return;
    const category = categories.find((item) => item.id === activeCategory);
    if (!category) return;
    let active = true; setCatalogStatus("loading");
    fetch(category.manifest).then((response) => response.ok ? response.json() : Promise.reject(new Error("manifest unavailable"))).then((payload: { assets?: CatalogAsset[] }) => {
      if (!active) return; setCatalogAssets(Array.isArray(payload.assets) ? payload.assets : []); setCatalogStatus("idle");
    }).catch(() => { if (active) setCatalogStatus("error"); });
    return () => { active = false; };
  }, [activeCategory, categories, source]);

  useEffect(() => {
    if ((!query.trim() && source !== "favorites") || searchIndex) return;
    let active = true; setSearchStatus("loading");
    Promise.all(categories.map(async (category) => {
      const response = await fetch(category.manifest);
      if (!response.ok) throw new Error("search manifest unavailable");
      const payload = (await response.json()) as { assets?: CatalogAsset[] };
      return (Array.isArray(payload.assets) ? payload.assets : []).map((asset) => ({ ...asset, categoryId: category.id, categoryName: category.name }));
    })).then((groups) => {
      if (!active) return; setSearchIndex(groups.reduce<CatalogAsset[]>((all, group) => all.concat(group), [])); setSearchStatus("idle");
    }).catch(() => { if (active) setSearchStatus("error"); });
    return () => { active = false; };
  }, [query, searchIndex, source]);

  useEffect(() => {
    const show = () => setOpen(true);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    if (new URLSearchParams(window.location.search).get("svgLibrary") === "1") setOpen(true);
    window.addEventListener("logocraft-svg-library-open", show); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("logocraft-svg-library-open", show); window.removeEventListener("keydown", key); };
  }, []);

  const searchedAssets = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !searchIndex) return [];
    return searchIndex.filter((asset) => `${asset.name} ${asset.categoryName ?? ""}`.toLowerCase().includes(term)).slice(0, 180);
  }, [query, searchIndex]);
  const favoriteAssets = useMemo(() => (searchIndex ?? []).filter((asset) => favorites.includes(asset.id)), [favorites, searchIndex]);
  const isFavorite = (asset: CatalogAsset) => favorites.includes(asset.id);
  const toggleFavorite = (asset: CatalogAsset) => setFavorites((previous) => previous.includes(asset.id) ? previous.filter((id) => id !== asset.id) : [asset.id, ...previous]);

  const dispatchInsert = (asset: Omit<SvgLibraryItem, "id" | "createdAt">) => {
    window.dispatchEvent(new CustomEvent("logocraft-svg-library-insert", { detail: asset }));
    setOpen(false); toast.success(`已插入「${asset.name}」。`);
  };

  const addAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!(file.type === "image/svg+xml" || /\.svg$/i.test(file.name))) { toast.error("SVG 图库仅接受 .svg 文件。 "); event.target.value = ""; return; }
    if (file.size > MAX_FILE_BYTES) { toast.error("单个 SVG 请控制在 800 KB 内，以保护本地图库空间。 "); event.target.value = ""; return; }
    if (assets.length >= MAX_ASSETS) { toast.error(`本地图库最多保存 ${MAX_ASSETS} 个资产，请先清理不用的图形。`); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const item: SvgLibraryItem = { ...prepareSvg(String(reader.result), file.name), id: uid(), createdAt: new Date().toISOString() };
        if (new Blob([JSON.stringify([item, ...assets])]).size > MAX_LIBRARY_BYTES) throw new Error("storage");
        setAssets((previous) => [item, ...previous]); setSource("local"); toast.success(`已加入本地图库：${item.name}`);
      } catch { toast.error("该 SVG 无法安全解析，或图库存储空间不足。 "); }
    };
    reader.readAsText(file); event.target.value = "";
  };

  const insertCatalogAsset = async (asset: CatalogAsset) => {
    try {
      const response = await fetch(asset.path); if (!response.ok) throw new Error("asset unavailable");
      dispatchInsert(prepareSvg(await response.text(), asset.name));
    } catch { toast.error("无法读取该分类 SVG，请刷新页面后重试。 "); }
  };

  const renameAsset = (asset: SvgLibraryItem) => {
    const name = window.prompt("重命名本地 SVG 资产", asset.name)?.trim();
    if (!name || name === asset.name) return;
    setAssets((previous) => previous.map((item) => item.id === asset.id ? { ...item, name } : item));
  };

  const localGrid = assets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{assets.map((asset) => <article key={asset.id} className="group relative overflow-hidden border border-white/10 bg-[#222225]"><button className="block w-full text-left" title={`插入 ${asset.name}`} onClick={() => dispatchInsert(asset)}><div className="flex aspect-[5/4] items-center justify-center border-b border-white/10 bg-[#fbf8f2] p-4"><img src={asset.dataUrl} alt="" className="h-full w-full object-contain" /></div><div className="truncate px-3 py-2.5 text-[11px] font-bold text-[#eee9e1]">{asset.name}</div></button><div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100"><button className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#1d1d20]/95 text-[#c7c3be] hover:text-[#ff9c77]" title="重命名资产" onClick={() => renameAsset(asset)}><FilePenLine size={13} /></button><button className="flex h-7 w-7 items-center justify-center border border-white/10 bg-[#1d1d20]/95 text-[#c7c3be] hover:text-[#ff8a73]" title="删除资产" onClick={() => setAssets((previous) => previous.filter((item) => item.id !== asset.id))}><Trash2 size={13} /></button></div></article>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-white/15 bg-[#19191b] text-center"><LibraryBig size={28} className="mb-3 text-[#ff6b35]" /><strong className="text-[13px] text-[#f4efe7]">本地图库尚为空</strong><p className="mt-2 max-w-xs text-[11px] leading-relaxed text-[#939196]">上传您自己的 SVG 后，可在此重命名、删除，并一键插入当前画板。</p><button className="action-button action-primary mt-4 h-9 px-4 text-[10px]" onClick={() => fileRef.current?.click()}><Plus size={14} /> 上传第一个 SVG</button></div>;

  const catalogGrid = (items: CatalogAsset[], emptyText: string) => items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((asset) => <article key={asset.id} className="group relative overflow-hidden border border-white/10 bg-[#222225] transition hover:border-[#ff6b35]/70"><button className="block w-full text-left" title={`插入 ${asset.name}`} onClick={() => insertCatalogAsset(asset)}><div className="flex aspect-[5/4] items-center justify-center border-b border-white/10 bg-[#fbf8f2] p-4"><img src={asset.path} alt="" className="h-full w-full object-contain transition duration-200 group-hover:scale-[1.04]" loading="lazy" /></div><div className="truncate px-3 pb-1 pt-2.5 text-[11px] font-bold text-[#eee9e1]">{asset.name}</div>{asset.categoryName && <div className="truncate px-3 pb-2.5 text-[9px] text-[#949196]">{asset.categoryName}</div>}</button><button className={`absolute right-1 top-1 flex h-7 w-7 items-center justify-center border bg-[#1d1d20]/95 transition ${isFavorite(asset) ? "border-[#ff6b35] text-[#ff6b35]" : "border-white/10 text-[#c7c3be] hover:text-[#ff9c77]"}`} title={isFavorite(asset) ? "取消收藏" : "收藏素材"} onClick={(event) => { event.stopPropagation(); toggleFavorite(asset); }}><Heart size={13} fill={isFavorite(asset) ? "currentColor" : "none"} /></button></article>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-white/15 bg-[#19191b] text-center"><Heart size={25} className="mb-3 text-[#ff6b35]" /><strong className="text-[13px] text-[#f4efe7]">{emptyText}</strong><p className="mt-2 max-w-xs text-[11px] leading-relaxed text-[#939196]">点击素材右上角的心形按钮，即可将它保存到当前浏览器的我的收藏。</p></div>;

  const selectingCategory = (id: string) => { setQuery(""); setSource("catalog"); setActiveCategory(id); };
  const isSearching = Boolean(query.trim());
  const catalogHeading = isSearching ? `搜索「${query.trim()}」` : categories.find((category) => category.id === activeCategory)?.name ?? "分类图库";
  const catalogItems = isSearching ? searchedAssets : catalogAssets;

  return <>
    <button className="fixed right-4 top-[74px] z-30 inline-flex items-center gap-2 border border-[#ff6b35]/45 bg-[#1d1d20]/95 px-3 py-2 text-[10px] font-extrabold tracking-[.08em] text-[#fff5ec] shadow-lg backdrop-blur transition hover:border-[#ff6b35] hover:bg-[#29292d] active:scale-[.97]" title="打开 SVG 图库" onClick={() => setOpen(true)}><LibraryBig size={15} className="text-[#ff6b35]" /> SVG 图库</button>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="SVG 图库">
      <section className="modal-surface flex max-h-[min(760px,calc(100dvh-32px))] w-full max-w-5xl flex-col overflow-hidden border border-white/10 bg-[#1d1d20] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">矢量资产档案</p><h2 className="mt-1 flex items-center gap-2 font-display text-[20px] font-bold text-[#fff8f0]"><LibraryBig size={18} className="text-[#ff6b35]" /> SVG 图库</h2></div><div className="flex items-center gap-2"><button className="action-button action-primary h-9 px-3 text-[10px]" onClick={() => fileRef.current?.click()}><Upload size={14} /> 上传 SVG</button><button className="tool-button h-9 w-9" title="关闭 SVG 图库" onClick={() => setOpen(false)}><X size={17} /></button></div></header>
        <div className="flex shrink-0 gap-1 border-b border-white/10 px-5 pt-3"><button className={`tool-tab px-3 py-2 text-[10px] font-extrabold tracking-[.08em] ${source === "catalog" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setSource("catalog")}><FolderTree size={13} className="mr-1 inline" /> 分类图库 {categories.length ? `· ${categories.reduce((sum, category) => sum + category.count, 0)}` : ""}</button><button className={`tool-tab px-3 py-2 text-[10px] font-extrabold tracking-[.08em] ${source === "favorites" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setSource("favorites")}><Heart size={13} className="mr-1 inline" fill={source === "favorites" ? "currentColor" : "none"} /> 我的收藏 {favorites.length}</button><button className={`tool-tab px-3 py-2 text-[10px] font-extrabold tracking-[.08em] ${source === "local" ? "tool-tab-active" : "text-[#88878b]"}`} onClick={() => setSource("local")}><LibraryBig size={13} className="mr-1 inline" /> 本地上传 {assets.length}/{MAX_ASSETS}</button></div>
        {source === "local" ? <div className="min-h-0 flex-1 overflow-y-auto p-5"><p className="mb-4 max-w-2xl text-[11px] leading-relaxed text-[#9b999d]">本地上传的资产只保存在当前浏览器。上传的 SVG 会移除脚本、位图和外部引用；资产插入画板后仍可独立编辑与导出。</p>{localGrid}</div> : <div className="min-h-0 flex flex-1 overflow-hidden"><nav className="hidden w-56 shrink-0 overflow-y-auto border-r border-white/10 bg-[#19191b] p-3 sm:block"><p className="section-label px-2 pb-2">分类目录</p><button className={`mb-1 flex w-full items-center justify-between px-2.5 py-2 text-left text-[10px] font-bold transition ${source === "favorites" ? "bg-[#ff6b35] text-[#1b1b1d]" : "text-[#b1afb0] hover:bg-white/5 hover:text-[#f4efe8]"}`} onClick={() => setSource("favorites")}><span className="flex items-center gap-1"><Heart size={12} fill={source === "favorites" ? "currentColor" : "none"} /> 我的收藏</span><span className="technical-number text-[9px]">{favorites.length}</span></button>{categories.map((category) => <button key={category.id} className={`mb-1 flex w-full items-center justify-between px-2.5 py-2 text-left text-[10px] font-bold transition ${source === "catalog" && activeCategory === category.id && !isSearching ? "bg-[#ff6b35] text-[#1b1b1d]" : "text-[#b1afb0] hover:bg-white/5 hover:text-[#f4efe8]"}`} onClick={() => selectingCategory(category.id)}><span className="truncate">{category.name}</span><span className="technical-number text-[9px]">{category.count}</span></button>)}</nav><div className="min-w-0 flex-1 overflow-y-auto p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="section-label">{source === "favorites" ? "我的收藏" : catalogHeading}</p><p className="mt-1 text-[10px] text-[#979599]">{source === "favorites" ? "收藏会保存在当前浏览器。" : isSearching ? `已检索 ${searchedAssets.length} 个匹配素材。` : "按分类延迟加载；点击素材即可插入当前画板。"}</p></div>{source === "catalog" && <div className="flex items-center gap-2"><label className="flex w-full min-w-[200px] items-center gap-2 border border-white/10 bg-[#252529] px-2.5 py-2 text-[#a7a4a3] focus-within:border-[#ff6b35]/70 sm:w-64"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或分类…" className="w-full bg-transparent text-[11px] text-[#f3eee7] outline-none placeholder:text-[#77757a]" /></label><select className="border border-white/10 bg-[#252529] px-2 py-2 text-[10px] text-[#f3eee7] outline-none sm:hidden" value={activeCategory} onChange={(event) => selectingCategory(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.count}</option>)}</select></div>}</div>{(catalogStatus === "loading" && !isSearching) || searchStatus === "loading" ? <div className="flex min-h-64 items-center justify-center gap-2 text-[11px] text-[#a7a4a3]"><LoaderCircle size={16} className="animate-spin text-[#ff6b35]" /> {isSearching || source === "favorites" ? "建立搜索索引…" : "加载分类资产…"}</div> : catalogStatus === "error" || searchStatus === "error" ? <div className="flex min-h-64 items-center justify-center text-[11px] text-[#ff9f82]">无法加载图库索引，请确认静态资源已完成部署。</div> : source === "favorites" ? catalogGrid(favoriteAssets, "我的收藏尚为空") : catalogGrid(catalogItems, isSearching ? "未找到匹配的 SVG 素材" : "该分类暂无可用素材")}</div></div>}
        <footer className="border-t border-white/10 px-5 py-3 text-[9px] leading-relaxed text-[#858387]">分类图库随 GitHub 与 Cloudflare Pages 静态发布；收藏与本地上传仅保存在当前浏览器。本地上传图库限 {MAX_ASSETS} 个资产，单个上限 800 KB。</footer>
        <input ref={fileRef} type="file" accept="image/svg+xml,.svg" className="hidden" onChange={addAsset} />
      </section>
    </div>}
  </>;
}
