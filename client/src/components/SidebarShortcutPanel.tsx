/* Component design: "精密工作台" — concise keyboard reference placed like a calibrated sidecar. */
import { CircleHelp, History, Keyboard, PanelsTopLeft } from "lucide-react";

const emit = (name: string) => window.dispatchEvent(new Event(name));

export default function SidebarShortcutPanel() {
  return <aside className="shortcut-sidecar hidden 2xl:block" aria-label="快捷键说明"><div className="flex items-center justify-between"><span className="section-label">快捷操作</span><Keyboard size={13} className="text-[#ff8b63]" /></div><div className="mt-3 space-y-1.5"><button className="shortcut-sidecar-row" title="打开历史记录（H）" onClick={() => emit("logocraft-history")}><span><History size={13} /> 历史记录</span><kbd>H</kbd></button><button className="shortcut-sidecar-row" title="打开画板管理" onClick={() => emit("logocraft-boards")}><span><PanelsTopLeft size={13} /> 多画板</span><kbd>B</kbd></button><button className="shortcut-sidecar-row" title="查看全部快捷键（?）" onClick={() => emit("logocraft-shortcuts")}><span><Keyboard size={13} /> 全部快捷键</span><kbd>?</kbd></button><button className="shortcut-sidecar-row" title="重新播放新手引导" onClick={() => emit("logocraft-onboarding-open")}><span><CircleHelp size={13} /> 新手引导</span><kbd>↗</kbd></button></div></aside>;
}
