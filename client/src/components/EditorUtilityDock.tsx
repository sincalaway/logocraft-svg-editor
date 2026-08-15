/* Design system: "精密工作台" — compact graphite utility dock with amber action cues. */
import { useEffect, useState } from "react";

type HistorySnapshot = { labels: string[]; activeIndex: number; meta?: Record<number, { name?: string; favorite?: boolean; thumbnail?: string }> };
type ReferenceLine = { id: string; axis: "x" | "y"; position: number; color?: string; locked?: boolean };

const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export default function EditorUtilityDock() {
  const [history, setHistory] = useState<HistorySnapshot>({ labels: [], activeIndex: 0 });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [references, setReferences] = useState<ReferenceLine[]>([]);
  const [referencesVisible, setReferencesVisible] = useState(true);

  useEffect(() => {
    const updateHistory = (event: Event) => setHistory((event as CustomEvent<HistorySnapshot>).detail);
    const showHistory = () => setHistoryOpen(true);
    const showShortcuts = () => setShortcutsOpen(true);
    const updateReferences = (event: Event) => { const detail = (event as CustomEvent<{ lines: ReferenceLine[]; visible: boolean }>).detail; setReferences(detail.lines); setReferencesVisible(detail.visible); };
    window.addEventListener("logocraft-history-updated", updateHistory);
    window.addEventListener("logocraft-history", showHistory);
    window.addEventListener("logocraft-shortcuts", showShortcuts);
    window.addEventListener("logocraft-reference-updated", updateReferences);
    window.dispatchEvent(new Event("logocraft-history-request"));
    window.dispatchEvent(new Event("logocraft-reference-request"));
    return () => {
      window.removeEventListener("logocraft-history-updated", updateHistory);
      window.removeEventListener("logocraft-history", showHistory);
      window.removeEventListener("logocraft-shortcuts", showShortcuts);
      window.removeEventListener("logocraft-reference-updated", updateReferences);
    };
  }, []);

  return <>
    <div className="fixed bottom-4 left-[72px] z-40 hidden gap-1 xl:flex">
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => setHistoryOpen(true)} title="历史记录（H）">H</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => setShortcutsOpen(true)} title="快捷键面板（?）">?</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => emit("logocraft-copy-style")} title="复制样式（⌘C）">C</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => emit("logocraft-paste-style")} title="粘贴样式（⌘V）">V</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => emit("logocraft-reference-create", { axis: "x" })} title="新增垂直参考线">│</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => emit("logocraft-reference-create", { axis: "y" })} title="新增水平参考线">─</button>
      <button className="action-button border border-white/10 bg-[#202023] px-2" onClick={() => setReferencesOpen(true)} title="参考线控制">R</button>
    </div>
    {historyOpen && <div className="history-float" role="dialog" aria-label="操作历史"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="section-label">历史记录</span><button className="text-xs text-[#aaa9ac] hover:text-white" onClick={() => setHistoryOpen(false)}>关闭</button></div><div className="max-h-64 overflow-y-auto">{history.labels.map((label, index) => <div key={`${label}-${index}`} className={`history-item ${index === history.activeIndex ? "history-item-active" : ""}`}>{history.meta?.[index]?.favorite && history.meta?.[index]?.thumbnail && <img src={history.meta[index].thumbnail} alt="收藏快照缩略图" className="h-8 w-11 shrink-0 border border-white/10 bg-[#f8f3ea] object-cover" />}<button onClick={() => { emit("logocraft-history-restore", index); setHistoryOpen(false); }} className="min-w-0 flex-1 truncate text-left">{history.meta?.[index]?.favorite ? "★ " : ""}{history.meta?.[index]?.name || label}</button><button className="px-1 text-[#ff9b79] hover:text-[#ff6b35]" onClick={() => emit("logocraft-history-favorite", index)} title="收藏快照">{history.meta?.[index]?.favorite ? "★" : "☆"}</button><button className="px-1 text-[#aaa9ac] hover:text-white" onClick={() => { const name = window.prompt("为此快照命名", history.meta?.[index]?.name || label); if (name?.trim()) emit("logocraft-history-rename", { index, name: name.trim() }); }} title="命名快照">✎</button>{history.meta?.[index]?.favorite && <button className="px-1 text-[#aaa9ac] hover:text-white" onClick={() => emit("logocraft-history-export", index)} title="导出快照">⇩</button>}<span className="technical-number pl-1">{String(index + 1).padStart(2, "0")}</span></div>)}</div></div>}
    {referencesOpen && <div className="reference-float" role="dialog" aria-label="参考线控制"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="section-label">参考线控制</span><button className="text-xs text-[#aaa9ac] hover:text-white" onClick={() => setReferencesOpen(false)}>关闭</button></div><div className="flex items-center justify-between border-b border-white/10 px-3 py-2"><span className="text-[10px] text-[#b7b5b4]">全局显示</span><button className="action-button h-7 px-2 text-[10px]" onClick={() => emit("logocraft-reference-visible", !referencesVisible)}>{referencesVisible ? "显示" : "隐藏"}</button></div><div className="grid grid-cols-3 gap-px border-b border-white/10 bg-white/10"><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "x", mode: "start" })}>V 左</button><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "x", mode: "center" })}>V 中</button><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "x", mode: "end" })}>V 右</button><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "y", mode: "start" })}>H 上</button><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "y", mode: "center" })}>H 中</button><button className="action-button rounded-none bg-[#222225] px-1 text-[9px]" onClick={() => emit("logocraft-reference-align", { axis: "y", mode: "end" })}>H 下</button></div><div className="max-h-52 overflow-y-auto">{references.length ? references.map((line) => <div key={line.id} className="history-item"><span className="technical-number w-8">{line.axis === "x" ? "V" : "H"}</span><input aria-label="参考线颜色" type="color" value={line.color ?? "#367D97"} onChange={(event) => emit("logocraft-reference-update", { id: line.id, updates: { color: event.target.value } })} className="h-5 w-6 border-0 bg-transparent p-0" /><button className="min-w-0 flex-1 truncate text-left text-[10px]" onClick={() => emit("logocraft-reference-update", { id: line.id, updates: { locked: !line.locked } })}>{line.locked ? "已锁定" : "可编辑"} · {Math.round(line.position)} px</button><button className="px-1 text-[#aaa9ac] hover:text-white" onClick={() => emit("logocraft-reference-delete", line.id)} title="删除参考线">×</button></div>) : <p className="px-3 py-5 text-center text-[10px] text-[#858488]">新增水平或垂直参考线后，在此处管理。</p>}</div></div>}
    {shortcutsOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="快捷键面板"><div className="shortcut-modal w-full max-w-md border border-white/10"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="section-label">全局快捷键</p><h2 className="mt-1 font-display text-lg font-bold text-[#fff8f0]">快速操作</h2></div><button className="tool-button h-8 w-8" onClick={() => setShortcutsOpen(false)}>×</button></div><div className="divide-y divide-white/10 px-5">{[["⌘ / Ctrl + Z", "撤销"], ["⌘ / Ctrl + Shift + Z", "重做"], ["⌘ / Ctrl + C", "复制当前图层样式"], ["⌘ / Ctrl + V", "粘贴图层样式"], ["H", "打开历史记录"], ["?", "打开此快捷键面板"], ["Delete", "删除所选图层"], ["Esc", "取消选择 / 关闭面板"]].map(([key, label]) => <div key={key} className="flex items-center justify-between py-3 text-[11px] text-[#b9b8ba]"><span>{label}</span><kbd className="key-cap">{key}</kbd></div>)}</div></div></div>}
  </>;
}
