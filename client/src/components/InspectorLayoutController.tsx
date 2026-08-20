/* Precision workbench inspector control: graphite rail, amber only for the active inspection state, and device-local spatial memory. */
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, X } from "lucide-react";
import { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

const INSPECTOR_PREFERENCE_KEY = "logocraft-inspector-layout-v2";
type DeviceProfile = "wide" | "desktop" | "tablet" | "compact";
type InspectorPreference = { width: number; collapsed?: boolean };
type InspectorPreferences = Partial<Record<DeviceProfile, InspectorPreference>>;

const profileForWidth = (width: number): DeviceProfile => width >= 1280 ? "wide" : width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "compact";
const widthOptions: Record<Exclude<DeviceProfile, "compact">, number[]> = { wide: [280, 306, 344, 372], desktop: [250, 264, 278], tablet: [320, 352, 392, 428] };
const widthBounds: Record<Exclude<DeviceProfile, "compact">, readonly [number, number]> = { wide: [260, 440], desktop: [236, 320], tablet: [300, 460] };
const clamp = (value: number, [minimum, maximum]: readonly [number, number]) => Math.min(Math.max(value, minimum), maximum);
const snapWidth = (value: number, bounds: readonly [number, number]) => clamp(Math.round(value / 4) * 4, bounds);

function readPreferences(): InspectorPreferences {
  try { const raw = JSON.parse(window.localStorage.getItem(INSPECTOR_PREFERENCE_KEY) || "{}"); return raw && typeof raw === "object" ? raw as InspectorPreferences : {}; }
  catch { return {}; }
}

export default function InspectorLayoutController() {
  const [profile, setProfile] = useState<DeviceProfile>("wide");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(306);
  const [isResizing, setIsResizing] = useState(false);
  const preferencesRef = useRef<InspectorPreferences>({});

  const widths = useMemo(() => profile === "compact" ? [] : widthOptions[profile], [profile]);
  const syncProfile = () => {
    const nextProfile = profileForWidth(window.innerWidth); const saved = preferencesRef.current[nextProfile]; const nextWidths = nextProfile === "compact" ? [] : widthOptions[nextProfile]; const bounds = nextProfile === "compact" ? null : widthBounds[nextProfile];
    setProfile(nextProfile); setPanelWidth(bounds && typeof saved?.width === "number" ? snapWidth(saved.width, bounds) : nextWidths[1] ?? 306); setCollapsed(Boolean(saved?.collapsed)); setDrawerOpen(false); setIsResizing(false);
  };

  useEffect(() => {
    preferencesRef.current = readPreferences(); syncProfile(); window.addEventListener("resize", syncProfile);
    return () => window.removeEventListener("resize", syncProfile);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.inspectorDevice = profile; root.dataset.inspectorCollapsed = profile === "tablet" ? "false" : String(collapsed); root.dataset.inspectorDrawer = String(drawerOpen); root.dataset.inspectorResizing = String(isResizing);
    root.style.setProperty("--inspector-panel-width", `${panelWidth}px`);
    return () => { delete root.dataset.inspectorDevice; delete root.dataset.inspectorCollapsed; delete root.dataset.inspectorDrawer; delete root.dataset.inspectorResizing; root.style.removeProperty("--inspector-panel-width"); };
  }, [profile, collapsed, drawerOpen, panelWidth, isResizing]);
  useEffect(() => {
    if (profile === "compact") return;
    const next = { ...preferencesRef.current, [profile]: { width: panelWidth, collapsed: profile === "tablet" ? false : collapsed } };
    preferencesRef.current = next;
    try { window.localStorage.setItem(INSPECTOR_PREFERENCE_KEY, JSON.stringify(next)); } catch { /* Layout preference is optional and should never interrupt editing. */ }
  }, [profile, panelWidth, collapsed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && drawerOpen) setDrawerOpen(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const cycleWidth = () => { if (!widths.length) return; const current = widths.indexOf(panelWidth); setPanelWidth(widths[(current + 1) % widths.length]); };
  const applyWidthDelta = (delta: number) => { if (profile === "compact") return; setPanelWidth((current) => snapWidth(current + delta, widthBounds[profile])); };
  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (profile === "tablet" || profile === "compact" || collapsed) return;
    event.preventDefault(); const bounds = widthBounds[profile]; setIsResizing(true);
    const onMove = (move: PointerEvent) => setPanelWidth(snapWidth(window.innerWidth - move.clientX, bounds));
    const onEnd = () => { setIsResizing(false); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onEnd); window.removeEventListener("pointercancel", onEnd); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onEnd); window.addEventListener("pointercancel", onEnd);
  };
  const resizeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); applyWidthDelta(12); }
    if (event.key === "ArrowRight") { event.preventDefault(); applyWidthDelta(-12); }
    if (event.key === "Home" && profile !== "compact") { event.preventDefault(); setPanelWidth(widthBounds[profile][0]); }
    if (event.key === "End" && profile !== "compact") { event.preventDefault(); setPanelWidth(widthBounds[profile][1]); }
  };
  if (profile === "compact") return null;

  return <>
    {profile === "tablet" && drawerOpen && <button className="inspector-drawer-scrim" aria-label="关闭检查器抽屉" onClick={() => setDrawerOpen(false)} />}
    {profile !== "tablet" && !collapsed && <button className="inspector-resize-handle" aria-label="拖拽调整右侧检查器宽度" aria-orientation="vertical" aria-valuemin={widthBounds[profile][0]} aria-valuemax={widthBounds[profile][1]} aria-valuenow={panelWidth} role="separator" title="拖拽调整检查器宽度；方向键微调" onPointerDown={beginResize} onKeyDown={resizeKeyDown} />}
    <div className={`inspector-control-rail ${profile === "tablet" ? "inspector-control-rail-tablet" : ""}`}>
      <button className="inspector-rail-button" title={profile === "tablet" ? (drawerOpen ? "关闭检查器抽屉" : "打开检查器抽屉") : (collapsed ? "展开右侧检查器" : "折叠右侧检查器")} aria-expanded={profile === "tablet" ? drawerOpen : !collapsed} aria-controls="logocraft-inspector" onClick={() => profile === "tablet" ? setDrawerOpen((open) => !open) : setCollapsed((value) => !value)}>{profile === "tablet" ? drawerOpen ? <X size={15} /> : <SlidersHorizontal size={15} /> : collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}<span>{profile === "tablet" ? "检查器" : collapsed ? "展开" : "收起"}</span></button>
      {(profile === "tablet" ? drawerOpen : !collapsed) && <button className="inspector-rail-button inspector-width-button" title="切换此设备的检查器宽度" onClick={cycleWidth}><SlidersHorizontal size={14} /><span className="technical-number">{panelWidth}</span></button>}
    </div>
  </>;
}
