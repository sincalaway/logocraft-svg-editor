/* Precision workbench module: linked construction-color controls, reset, and calibrated palettes for the built-in LogoCraft mark. */
import { CircleDot, Link2, Palette, RotateCcw, SwatchBook, Unlink2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type MarkColors = { primary: string; accent: string };
type PalettePreset = MarkColors & { id: string; name: string; note: string };

type Props = {
  primary: string;
  accent: string;
  onApplyColors: (colors: MarkColors, label: string) => void;
};

const DEFAULT_MARK_COLORS: MarkColors = { primary: "#1C1A18", accent: "#FF6B35" };
const PALETTE_PRESETS: PalettePreset[] = [
  { id: "brand", name: "品牌基准", note: "石墨 / 琥珀", ...DEFAULT_MARK_COLORS },
  { id: "slate", name: "石墨雾蓝", note: "冷静 / 制图", primary: "#25394A", accent: "#7DB0C6" },
  { id: "ocean", name: "深海信号", note: "深青 / 信号蓝", primary: "#123447", accent: "#00A3B4" },
  { id: "forest", name: "森林铜绿", note: "松绿 / 苔藓", primary: "#1D3A2B", accent: "#7EA46B" },
  { id: "archive", name: "砖红档案", note: "棕红 / 珊瑚", primary: "#4B2422", accent: "#D77A61" },
  { id: "dusk", name: "暮紫火花", note: "深紫 / 淡紫", primary: "#2B2133", accent: "#C989E8" },
  { id: "mono", name: "黑白校准", note: "墨黑 / 纸白", primary: "#111111", accent: "#F8F5ED" },
  { id: "brass", name: "黄铜书档", note: "深褐 / 黄铜", primary: "#342617", accent: "#C79B58" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeHex = (color: string) => color.toUpperCase();
const hexToHsl = (hex: string) => {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { h: hue, s: saturation, l: lightness };
};
const hslToHex = ({ h, s, l }: { h: number; s: number; l: number }) => {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, secondary, 0] : segment < 2 ? [secondary, chroma, 0] : segment < 3 ? [0, chroma, secondary] : segment < 4 ? [0, secondary, chroma] : segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  const match = l - chroma / 2;
  return `#${[red, green, blue].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
};
const linkCompanionColor = (sourceAnchor: string, sourceCompanion: string, nextAnchor: string) => {
  const anchor = hexToHsl(sourceAnchor); const companion = hexToHsl(sourceCompanion); const next = hexToHsl(nextAnchor);
  return hslToHex({ h: next.h + companion.h - anchor.h, s: clamp(next.s + companion.s - anchor.s, 0.18, 0.92), l: clamp(next.l + companion.l - anchor.l, 0.18, 0.9) });
};

export default function CompositeMarkColorInspector({ primary, accent, onApplyColors }: Props) {
  const [linked, setLinked] = useState(false);
  const current = { primary: normalizeHex(primary), accent: normalizeHex(accent) };
  const apply = (colors: MarkColors, label: string) => onApplyColors({ primary: normalizeHex(colors.primary), accent: normalizeHex(colors.accent) }, label);
  const updatePrimary = (nextPrimary: string) => apply({ primary: nextPrimary, accent: linked ? linkCompanionColor(current.primary, current.accent, nextPrimary) : current.accent }, linked ? "联动调整标记构件色" : "更新主构件颜色");
  const updateAccent = (nextAccent: string) => apply({ primary: linked ? linkCompanionColor(current.accent, current.primary, nextAccent) : current.primary, accent: nextAccent }, linked ? "联动调整标记构件色" : "更新定位点颜色");
  const restoreDefaults = () => { apply(DEFAULT_MARK_COLORS, "恢复 LogoCraft 默认色"); toast.success("已恢复 LogoCraft 品牌默认色。 "); };
  const applyPreset = (preset: PalettePreset) => { apply(preset, `应用「${preset.name}」标记色板`); toast.success(`已应用「${preset.name}」色板。`); };
  const isActivePreset = (preset: PalettePreset) => preset.primary === current.primary && preset.accent === current.accent;

  return <section className="border-t border-white/10 px-4 py-4">
    <div className="flex items-center justify-between gap-2"><div><p className="section-label">标记构件色板</p><p className="mt-1 text-[9px] leading-relaxed text-[#8e8b8f]">LogoCraft 标记由主构件和定位点组成，可独立提取、编辑与导出。</p></div><span className="technical-number shrink-0 text-[8px] text-[#8d8a8d]">2 构件</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><label className="inspector-field"><span className="flex items-center gap-1"><Palette size={10} /> 主构件</span><div className="flex h-8 items-center gap-2 border border-white/10 bg-[#252529] px-2"><input aria-label="编辑 LogoCraft 标记主构件颜色" type="color" value={current.primary} onChange={(event) => updatePrimary(event.target.value)} className="h-4 w-4 border-0 bg-transparent p-0" /><span className="technical-number text-[9px] font-bold text-[#ded8d1]">{current.primary}</span></div></label><label className="inspector-field"><span className="flex items-center gap-1"><CircleDot size={10} className="text-[#ff6b35]" /> 定位点</span><div className="flex h-8 items-center gap-2 border border-white/10 bg-[#252529] px-2"><input aria-label="编辑 LogoCraft 标记定位点颜色" type="color" value={current.accent} onChange={(event) => updateAccent(event.target.value)} className="h-4 w-4 border-0 bg-transparent p-0" /><span className="technical-number text-[9px] font-bold text-[#ded8d1]">{current.accent}</span></div></label></div>
    <div className="mt-3 grid grid-cols-[1fr_auto] gap-1.5"><button type="button" aria-pressed={linked} title={linked ? "关闭构件颜色联动" : "开启构件颜色联动"} onClick={() => { setLinked((value) => !value); toast.message(linked ? "已关闭构件颜色联动。" : "已开启构件颜色联动：将保留双色的色相与明度关系。 "); }} className={`action-button h-8 justify-start px-2 text-[9px] ${linked ? "border-[#ff6b35]/80 bg-[#ff6b35]/10 text-[#ffd2c2]" : ""}`}>{linked ? <Link2 size={13} /> : <Unlink2 size={13} />}{linked ? "构件颜色已联动" : "构件颜色独立"}</button><button type="button" title="恢复 LogoCraft 默认色：石墨主构件与琥珀定位点" onClick={restoreDefaults} className="action-button h-8 px-2 text-[9px]"><RotateCcw size={13} /> 默认色</button></div>
    <div className="mt-3 border-t border-white/[.07] pt-3"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[9px] font-bold text-[#d6d1ca]"><SwatchBook size={12} className="text-[#ff6b35]" /> 内置色板预设</span><span className="technical-number text-[8px] text-[#8e8b8e]">{PALETTE_PRESETS.length} 组</span></div><div className="mt-2 grid grid-cols-2 gap-1.5">{PALETTE_PRESETS.map((preset) => <button key={preset.id} type="button" aria-label={`应用${preset.name}色板：主构件${preset.primary}，定位点${preset.accent}`} title={`${preset.name} · ${preset.note}`} onClick={() => applyPreset(preset)} className={`group flex min-w-0 items-center gap-1.5 border px-1.5 py-1.5 text-left transition ${isActivePreset(preset) ? "border-[#ff6b35] bg-[#ff6b35]/10 ring-1 ring-[#ff6b35]/30" : "border-white/10 bg-[#222225] hover:border-white/35 hover:bg-[#29292d]"}`}><span className="flex shrink-0 overflow-hidden border border-white/15"><i className="h-4 w-4" style={{ backgroundColor: preset.primary }} /><i className="h-4 w-4" style={{ backgroundColor: preset.accent }} /></span><span className="min-w-0"><strong className="block truncate text-[8px] font-bold text-[#ded8d1]">{preset.name}</strong><small className="block truncate text-[7px] text-[#89868b]">{preset.note}</small></span></button>)}</div><p className="mt-2 text-[8px] leading-relaxed text-[#88858a]">点击预设会同时应用主构件与定位点配色；开启联动后，手动调色会保持两构件的综合色相关系。</p></div>
  </section>;
}
