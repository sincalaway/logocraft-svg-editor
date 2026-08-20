/* Precision workbench color module: extracts every SVG paint and edits only the user-selected color target. */
import { Check, Pipette, Replace, SwatchBook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SvgColorInspection } from "@/lib/svg-colors";

type Props = {
  inspection: SvgColorInspection;
  onReplaceColor: (from: string, to: string) => void;
  onEditGradientStop: (gradientId: string, index: number, color: string) => void;
};

export default function SvgColorInspector({ inspection, onReplaceColor, onEditGradientStop }: Props) {
  const paletteKey = useMemo(() => inspection.colors.join("|"), [inspection.colors]);
  const [selectedColor, setSelectedColor] = useState(inspection.colors[0] ?? "#1C1A18");
  const [editedColor, setEditedColor] = useState(selectedColor);

  useEffect(() => { setSelectedColor((current) => inspection.colors.includes(current) ? current : inspection.colors[0] ?? "#1C1A18"); }, [paletteKey, inspection.colors]);
  useEffect(() => setEditedColor(selectedColor), [selectedColor]);
  const applySelectedColor = () => { if (selectedColor === editedColor) return; onReplaceColor(selectedColor, editedColor); setSelectedColor(editedColor.toUpperCase()); };

  return <div className="col-span-2 mt-1 border-t border-white/[.07] pt-3">
    <div className="flex items-center justify-between gap-2"><span className="section-label">SVG 提取色彩</span><span className="technical-number text-[8px] text-[#8f8c8e]">{inspection.colors.length} 色 / {inspection.gradients.length} 渐变点</span></div>
    <p className="mt-1 text-[8px] leading-relaxed text-[#88858a]">点击色板仅选中要编辑的颜色；不会将其他填充、描边或渐变色统一替换。</p>
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="technical-number mr-1 text-[8px] text-[#8c898c]">提取颜色</span>{inspection.colors.map((color) => <button key={color} type="button" aria-pressed={color === selectedColor} title={`选中颜色：${color}`} onClick={() => setSelectedColor(color)} className={`relative h-6 w-6 border transition ${color === selectedColor ? "scale-110 border-[#ff6b35] ring-1 ring-[#ff6b35]/50" : "border-white/25 hover:border-white/70"}`} style={{ backgroundColor: color }}>{color === selectedColor && <Check size={11} className={`absolute inset-0 m-auto ${color.toUpperCase() === "#F8F5ED" || color.toUpperCase() === "#FFFFFF" ? "text-[#1c1a18]" : "text-white"} drop-shadow-[0_1px_1px_rgba(0,0,0,.65)]`} />}</button>)}</div>
    <div className="mt-3 grid grid-cols-[1fr_34px_auto] items-end gap-1.5"><label className="inspector-field"><span>当前选中色</span><input type="text" readOnly value={selectedColor.toUpperCase()} /></label><label className="flex h-8 items-center justify-center border border-white/10 bg-[#252529]" title="选择当前色的新颜色"><input type="color" aria-label="编辑当前选中的 SVG 颜色" value={editedColor} onChange={(event) => setEditedColor(event.target.value)} className="h-5 w-5 border-0 bg-transparent p-0" /></label><button type="button" className="action-button h-8 px-2 text-[9px]" title={`将选中的 ${selectedColor} 定向修改为 ${editedColor}`} onClick={applySelectedColor}><Replace size={13} /> 应用</button></div>
    {inspection.gradients.length > 0 && <div className="mt-3 border-t border-white/[.07] pt-3"><div className="flex items-center gap-1.5 text-[9px] font-bold text-[#d6d1ca]"><SwatchBook size={12} className="text-[#ff6b35]" /> 渐变色列表</div><div className="mt-2 space-y-1.5">{inspection.gradients.map((stop) => <div key={`${stop.gradientId}-${stop.index}`} className="grid grid-cols-[1fr_30px_72px] items-center gap-1.5"><span className="truncate technical-number text-[8px] text-[#8e8b8e]" title={`${stop.gradientType === "linear" ? "线性" : "径向"}渐变 #${stop.gradientId} · ${stop.offset}`}>{stop.gradientType === "linear" ? "线性" : "径向"} #{stop.gradientId} · {stop.offset}</span><input type="color" aria-label={`编辑渐变 ${stop.gradientId} 的 ${stop.offset} 色点`} value={stop.color} onChange={(event) => onEditGradientStop(stop.gradientId, stop.index, event.target.value)} className="h-5 w-6 border-0 bg-transparent p-0" /><span className="technical-number text-[8px] text-[#d7d2ca]">{stop.color}</span></div>)}</div></div>}
    <p className="mt-2 flex items-center gap-1 text-[8px] leading-relaxed text-[#88858a]"><Pipette size={10} /> “应用”只替换当前 SVG 内与选中色相同的 `fill`、`stroke` 和同色渐变停靠点；渐变列表可继续逐点调整。</p>
  </div>;
}
