/* Precision workbench color module: per-color usage counters and scoped fill/stroke replacement for SVG assets. */
import { Check, Pipette, Replace, SwatchBook } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SvgColorInspection, SvgPaintReplaceScope } from "@/lib/svg-colors";

type Props = { inspection: SvgColorInspection; onReplaceColor: (from: string, to: string, scope: SvgPaintReplaceScope) => void; onEditGradientStop: (gradientId: string, index: number, color: string) => void };

const SCOPE_OPTIONS: Array<{ value: SvgPaintReplaceScope; label: string }> = [{ value: "all", label: "全部" }, { value: "fill", label: "仅填充" }, { value: "stroke", label: "仅描边" }];
const usageFallback = { fill: 0, stroke: 0, gradient: 0, total: 0 };

export default function SvgColorInspector({ inspection, onReplaceColor, onEditGradientStop }: Props) {
  const paletteKey = useMemo(() => inspection.colors.join("|"), [inspection.colors]);
  const [selectedColor, setSelectedColor] = useState(inspection.colors[0] ?? "#1C1A18");
  const [editedColor, setEditedColor] = useState(selectedColor);
  const [scope, setScope] = useState<SvgPaintReplaceScope>("all");
  useEffect(() => { setSelectedColor((current) => inspection.colors.includes(current) ? current : inspection.colors[0] ?? "#1C1A18"); }, [paletteKey]);
  useEffect(() => setEditedColor(selectedColor), [selectedColor]);
  const selectedUsage = inspection.usage[selectedColor] ?? usageFallback;
  const scopeCount = scope === "all" ? selectedUsage.total : selectedUsage[scope];
  const scopeLabel = SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? "全部";
  const applySelectedColor = () => { if (selectedColor === editedColor || scopeCount === 0) return; onReplaceColor(selectedColor, editedColor, scope); setSelectedColor(editedColor.toUpperCase()); };

  return <div className="col-span-2 mt-1 border-t border-white/[.07] pt-3">
    <div className="flex items-center justify-between gap-2"><span className="section-label">SVG 提取色彩</span><span className="technical-number text-[8px] text-[#8f8c8e]">{inspection.colors.length} 色 / {inspection.gradients.length} 渐变点</span></div>
    <p className="mt-1 text-[8px] leading-relaxed text-[#88858a]">点击色板仅选中要编辑的颜色；每张色卡显示当前 SVG 中的有效填充、描边和渐变停靠点用量。</p>
    <div className="mt-2 grid grid-cols-2 gap-1.5">{inspection.colors.map((color) => { const usage = inspection.usage[color] ?? usageFallback; return <button key={color} type="button" aria-pressed={color === selectedColor} title={`选中颜色：${color}；填充 ${usage.fill}、描边 ${usage.stroke}、渐变 ${usage.gradient}`} onClick={() => setSelectedColor(color)} className={`flex min-w-0 items-center gap-1.5 border px-1.5 py-1.5 text-left transition ${color === selectedColor ? "border-[#ff6b35] bg-[#ff6b35]/10 ring-1 ring-[#ff6b35]/30" : "border-white/10 bg-[#222225] hover:border-white/35 hover:bg-[#29292d]"}`}><span className="relative h-5 w-5 shrink-0 border border-white/20" style={{ backgroundColor: color }}>{color === selectedColor && <Check size={10} className={`absolute inset-0 m-auto ${color === "#F8F5ED" || color === "#FFFFFF" ? "text-[#1c1a18]" : "text-white"} drop-shadow-[0_1px_1px_rgba(0,0,0,.65)]`} />}</span><span className="min-w-0"><strong className="block truncate technical-number text-[8px] text-[#e4ded6]">{color}</strong><small className="block truncate text-[7px] text-[#918e92]">填 {usage.fill} · 描 {usage.stroke} · 渐 {usage.gradient}</small></span></button>; })}</div>
    <div className="mt-3 border-t border-white/[.07] pt-3"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold text-[#d6d1ca]">替换范围</span><span className="technical-number text-[8px] text-[#8e8b8e]">当前命中 {scopeCount}</span></div><div className="mt-1.5 grid grid-cols-3 gap-1" role="group" aria-label="SVG 颜色替换范围">{SCOPE_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={scope === option.value} onClick={() => setScope(option.value)} className={`h-7 border px-1 text-[8px] font-bold transition ${scope === option.value ? "border-[#ff6b35] bg-[#ff6b35]/15 text-[#ffd4c5]" : "border-white/10 bg-[#222225] text-[#9b989c] hover:border-white/30 hover:text-[#ded8d1]"}`}>{option.label}</button>)}</div></div>
    <div className="mt-3 grid grid-cols-[1fr_34px_auto] items-end gap-1.5"><label className="inspector-field"><span>当前选中色</span><input type="text" readOnly value={selectedColor.toUpperCase()} /></label><label className="flex h-8 items-center justify-center border border-white/10 bg-[#252529]" title="选择当前色的新颜色"><input type="color" aria-label="编辑当前选中的 SVG 颜色" value={editedColor} onChange={(event) => setEditedColor(event.target.value)} className="h-5 w-5 border-0 bg-transparent p-0" /></label><button type="button" disabled={selectedColor === editedColor || scopeCount === 0} className="action-button h-8 px-2 text-[9px] disabled:cursor-not-allowed disabled:opacity-45" title={`将选中的 ${selectedColor} 在${scopeLabel}范围内定向修改为 ${editedColor}`} onClick={applySelectedColor}><Replace size={13} /> 应用</button></div>
    {inspection.gradients.length > 0 && <div className="mt-3 border-t border-white/[.07] pt-3"><div className="flex items-center gap-1.5 text-[9px] font-bold text-[#d6d1ca]"><SwatchBook size={12} className="text-[#ff6b35]" /> 渐变色列表</div><div className="mt-2 space-y-1.5">{inspection.gradients.map((stop) => <div key={`${stop.gradientId}-${stop.index}`} className="grid grid-cols-[1fr_30px_72px] items-center gap-1.5"><span className="truncate technical-number text-[8px] text-[#8e8b8e]" title={`${stop.gradientType === "linear" ? "线性" : "径向"}渐变 #${stop.gradientId} · ${stop.offset}`}>{stop.gradientType === "linear" ? "线性" : "径向"} #{stop.gradientId} · {stop.offset}</span><input type="color" aria-label={`编辑渐变 ${stop.gradientId} 的 ${stop.offset} 色点`} value={stop.color} onChange={(event) => onEditGradientStop(stop.gradientId, stop.index, event.target.value)} className="h-5 w-6 border-0 bg-transparent p-0" /><span className="technical-number text-[8px] text-[#d7d2ca]">{stop.color}</span></div>)}</div></div>}
    <p className="mt-2 flex items-center gap-1 text-[8px] leading-relaxed text-[#88858a]"><Pipette size={10} /> “全部”会处理同色填充、描边和渐变点；“仅填充”和“仅描边”严格限定属性范围，渐变点始终可逐点独立编辑。</p>
  </div>;
}
