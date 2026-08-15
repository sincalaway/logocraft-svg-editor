/* Component design: "精密工作台" — a command console that feels like an instrument search terminal. */
import { Command, FileOutput, FolderPlus, HelpCircle, History, Layers3, Play, Redo2, ScanSearch, Settings2, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";

type Action = { group: string; value: string; label: string; hint: string; shortcut?: string; icon: typeof Command; event: string; detail?: unknown };
const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export default function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const actions = useMemo<Action[]>(() => [
    { group: "编辑", value: "undo undo 撤销", label: "撤销上一步", hint: "回到上一个编辑状态", shortcut: "⌘Z", icon: Undo2, event: "logocraft-command-undo" },
    { group: "编辑", value: "redo redo 重做", label: "重做上一步", hint: "恢复刚才撤销的修改", shortcut: "⌘⇧Z", icon: Redo2, event: "logocraft-command-redo" },
    { group: "编辑", value: "add text text 添加文本", label: "添加文本图层", hint: "新建可编辑的品牌文字", shortcut: "T", icon: Command, event: "logocraft-command-add-text" },
    { group: "工程", value: "new board artboard 新建画板", label: "新建画板", hint: "创建独立尺寸与图层的交付面", shortcut: "B", icon: Layers3, event: "logocraft-board-create" },
    { group: "工程", value: "history 版本 历史", label: "打开操作历史", hint: "回退、比较与标注快照", shortcut: "H", icon: History, event: "logocraft-history" },
    { group: "工程", value: "versions save restore 历史版本", label: "打开保存版本", hint: "预览或恢复本地持久化版本", shortcut: "⌘J", icon: History, event: "logocraft-versions-open" },
    { group: "交付", value: "export svg 导出 质量 规范", label: "打开 SVG 交付预检", hint: "优化代码并检查品牌规范", shortcut: "E", icon: FileOutput, event: "logocraft-production-open", detail: "export" },
    { group: "交付", value: "preview 预览", label: "预览当前画板", hint: "在深浅底色中检查成品", icon: Play, event: "logocraft-command-preview" },
    { group: "设置", value: "settings artboard 画板 设置", label: "打开画板设置", hint: "修改尺寸、出血与测量单位", icon: Settings2, event: "logocraft-artboard-open" },
    { group: "设置", value: "guides reference 参考线", label: "打开参考线控制", hint: "创建、管理与应用参考线预设", icon: ScanSearch, event: "logocraft-reference-open" },
    { group: "帮助", value: "shortcuts 快捷键 帮助", label: "查看快捷键", hint: "打开全局快捷键说明", shortcut: "?", icon: HelpCircle, event: "logocraft-shortcuts" },
    { group: "帮助", value: "tour onboarding 新手引导", label: "重新播放新手引导", hint: "查看多画板、精确编辑与版本审阅", icon: Sparkles, event: "logocraft-onboarding-open" },
  ], []);

  useEffect(() => {
    const show = () => setOpen(true);
    const keydown = (event: KeyboardEvent) => { const meta = event.metaKey || event.ctrlKey; if (meta && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); } if (meta && event.key.toLowerCase() === "j") { event.preventDefault(); emit("logocraft-versions-open"); } };
    if (new URLSearchParams(window.location.search).has("command")) setOpen(true);
    window.addEventListener("logocraft-command-open", show); window.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("logocraft-command-open", show); window.removeEventListener("keydown", keydown); };
  }, []);

  const run = (action: Action) => { emit(action.event, action.detail); setOpen(false); };
  return <CommandDialog open={open} onOpenChange={setOpen} title="LogoCraft 命令面板" description="搜索并执行编辑器命令" className="command-palette border border-white/15 p-0" showCloseButton={false}><div className="command-palette-head"><span className="section-label">LOGOCRAFT / COMMAND</span><kbd>⌘ K</kbd></div><CommandInput placeholder="搜索命令、工具或设置…" className="command-palette-input" /><CommandList className="command-palette-list"><CommandEmpty className="command-palette-empty">未找到匹配命令。</CommandEmpty>{["编辑", "工程", "交付", "设置", "帮助"].map((group, index) => <div key={group}>{index > 0 && <CommandSeparator className="bg-white/10" />}<CommandGroup heading={group} className="command-palette-group">{actions.filter((action) => action.group === group).map((action) => { const Icon = action.icon; return <CommandItem key={action.value} value={action.value} onSelect={() => run(action)} className="command-palette-item"><Icon size={16} /><span className="min-w-0"><strong>{action.label}</strong><small>{action.hint}</small></span>{action.shortcut && <CommandShortcut className="command-palette-shortcut">{action.shortcut}</CommandShortcut>}</CommandItem>; })}</CommandGroup></div>)}</CommandList><footer className="command-palette-foot">↑↓ 浏览　↵ 执行　Esc 关闭</footer></CommandDialog>;
}
