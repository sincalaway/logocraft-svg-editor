/* Precision workbench inspector control: graphite rail, amber only for the active inspection state, and device-local spatial memory. */
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const INSPECTOR_PREFERENCE_KEY = "logocraft-inspector-layout-v1";
type DeviceProfile = "wide" | "desktop" | "tablet" | "compact";
type InspectorPreference = { width: number; collapsed?: boolean };
type InspectorPreferences = Partial<Record<DeviceProfile, InspectorPreference>>;

const profileForWidth = (width: number): DeviceProfile => width >= 1280 ? "wide" : width >= 1024 ? "desktop" : width >= 768 ? "tablet" : "compact";
const widthOptions: Record<Exclude<DeviceProfile, "compact">, number[]> = { wide: [280, 306, 344, 372], desktop: [250, 264, 278], tablet: [320, 352, 392, 428] };

function readPreferences(): InspectorPreferences {
  try { const raw = JSON.parse(window.localStorage.getItem(INSPECTOR_PREFERENCE_KEY) || "{}"); return raw && typeof raw === "object" ? raw as InspectorPreferences : {}; }
  catch { return {}; }
}

export default function InspectorLayoutController() {
  const [profile, setProfile] = useState<DeviceProfile>("wide");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(306);
  const preferencesRef = useRef<InspectorPreferences>({});

  const widths = useMemo(() => profile === "compact" ? [] : widthOptions[profile], [profile]);
  const syncProfile = () => {
    const nextProfile = profileForWidth(window.innerWidth); const saved = preferencesRef.current[nextProfile]; const nextWidths = nextProfile === "compact" ? [] : widthOptions[nextProfile];
    setProfile(nextProfile); setPanelWidth(nextWidths.includes(saved?.width ?? -1) ? saved!.width : nextWidths[1] ?? 306); setCollapsed(Boolean(saved?.collapsed)); setDrawerOpen(false);
  };

  useEffect(() => {
    preferencesRef.current = readPreferences(); syncProfile(); window.addEventListener("resize", syncProfile);
    return () => window.removeEventListener("resize", syncProfile);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.inspectorDevice = profile; root.dataset.inspectorCollapsed = profile === "tablet" ? "false" : String(collapsed); root.dataset.inspectorDrawer = String(drawerOpen);
    root.style.setProperty("--inspector-panel-width", `${panelWidth}px`);
    return () => { delete root.dataset.inspectorDevice; delete root.dataset.inspectorCollapsed; delete root.dataset.inspectorDrawer; root.style.removeProperty("--inspector-panel-width"); };
  }, [profile, collapsed, drawerOpen, panelWidth]);
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
  if (profile === "compact") return null;

  return <>
    {profile === "tablet" && drawerOpen && <button className="inspector-drawer-scrim" aria-label="关闭检查器抽屉" onClick={() => setDrawerOpen(false)} />}
    <div className={`inspector-control-rail ${profile === "tablet" ? "inspector-control-rail-tablet" : ""}`}>
      <button className="inspector-rail-button" title={profile === "tablet" ? (drawerOpen ? "关闭检查器抽屉" : "打开检查器抽屉") : (collapsed ? "展开右侧检查器" : "折叠右侧检查器")} aria-expanded={profile === "tablet" ? drawerOpen : !collapsed} aria-controls="logocraft-inspector" onClick={() => profile === "tablet" ? setDrawerOpen((open) => !open) : setCollapsed((value) => !value)}>{profile === "tablet" ? drawerOpen ? <X size={15} /> : <SlidersHorizontal size={15} /> : collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}<span>{profile === "tablet" ? "检查器" : collapsed ? "展开" : "收起"}</span></button>
      {(profile === "tablet" ? drawerOpen : !collapsed) && <button className="inspector-rail-button inspector-width-button" title="切换此设备的检查器宽度" onClick={cycleWidth}><SlidersHorizontal size={14} /><span className="technical-number">{panelWidth}</span></button>}
    </div>
  </>;
}
