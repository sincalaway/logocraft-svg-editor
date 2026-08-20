/* Precision workbench color module: direct SVG palette, targeted paint replacement, and gradient-stop editing. */
import { Pipette, Replace, SwatchBook } from "lucide-react";
import { useEffect, useState } from "react";
import type { SvgColorInspection } from "@/lib/svg-colors";

type Props = {
  inspection: SvgColorInspection;
  activeColor: string;
  onSetActiveColor: (color: string) => void;
  onReplaceColor: (from: string, to: string) => void;
  onEditGradientStop: (gradientId: string, index: number, color: string) => void;
};

export default function SvgColorInspector({ inspection, activeColor, onSetActiveColor, onReplaceColor, onEditGradientStop }: Props) {
  const [replacement, setReplacement] = useState(activeColor);

  useEffect(() => setReplacement(activeColor), [activeColor]);

  return <div className="col-span-2 mt-1 border-t border-white/[.07] pt-3">
    <div className="flex items-center justify-between gap-2"><span className="section-label">SVG 色彩</span><span className="technical-number text-[8px] text-[#8f8c8e]">{inspection.colors.length} 色 / {inspection.gradients.length} 渐变点</span></div>
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="technical-number mr-1 text-[8px] text-[#8c898c]">点击设为主题色</span>{inspection.colors.map((color) => <button key={color} type="button" title={`设为主题色：${color}`} onClick={() => onSetActiveColor(color)} className={`h-5 w-5 border transition ${color === activeColor ? "scale-110 border-[#ff6b35] ring-1 ring-[#ff6b35]/50" : "border-white/25 hover:border-white/70"}`} style={{ backgroundColor: color }} />)}</div>
    <div className="mt-3 grid grid-cols-[1fr_34px_auto] items-end gap-1.5"><label className="inspector-field"><span>替换主题色</span><input type="text" readOnly value={activeColor.toUpperCase()} /></label><label className="flex h-8 items-center justify-center border border-white/10 bg-[#252529]" title="选择替换后的颜色"><input type="color" aria-label="替换后的 SVG 颜色" value={replacement} onChange={(event) => setReplacement(event.target.value)} className="h-5 w-5 border-0 bg-transparent p-0" /></label><button type="button" className="action-button h-8 px-2 text-[9px]" title={`将 ${activeColor} 替换为 ${replacement}`} onClick={() => onReplaceColor(activeColor, replacement)}><Replace size={13} /> 替换</button></div>
    {inspection.gradients.length > 0 && <div className="mt-3 border-t border-white/[.07] pt-3"><div className="flex items-center gap-1.5 text-[9px] font-bold text-[#d6d1ca]"><SwatchBook size={12} className="text-[#ff6b35]" /> 渐变色列表</div><div className="mt-2 space-y-1.5">{inspection.gradients.map((stop) => <div key={`${stop.gradientId}-${stop.index}`} className="grid grid-cols-[1fr_30px_72px] items-center gap-1.5"><span className="truncate technical-number text-[8px] text-[#8e8b8e]" title={`${stop.gradientType === "linear" ? "线性" : "径向"}渐变 #${stop.gradientId} · ${stop.offset}`}>{stop.gradientType === "linear" ? "线性" : "径向"} #{stop.gradientId} · {stop.offset}</span><input type="color" aria-label={`编辑渐变 ${stop.gradientId} 的 ${stop.offset} 色点`} value={stop.color} onChange={(event) => onEditGradientStop(stop.gradientId, stop.index, event.target.value)} className="h-5 w-6 border-0 bg-transparent p-0" /><span className="technical-number text-[8px] text-[#d7d2ca]">{stop.color}</span></div>)}</div></div>}
    <p className="mt-2 flex items-center gap-1 text-[8px] leading-relaxed text-[#88858a]"><Pipette size={10} /> 替换会作用于当前 SVG 内同色的填充、描边和渐变停靠点。</p>
  </div>;
}
