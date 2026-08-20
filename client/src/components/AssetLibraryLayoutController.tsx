/* Precision workbench asset-tray control: a compact graphite edge rail preserves canvas focus while remembering each desktop profile. */
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

const ASSET_TRAY_PREFERENCE_KEY = "logocraft-asset-tray-layout-v2";
type DesktopProfile = "wide" | "desktop" | "compact";
type TrayPreference = { width: number; collapsed: boolean };
type TrayPreferences = Partial<Record<DesktopProfile, TrayPreference>>;

const profileForWidth = (width: number): DesktopProfile => width >= 1280 ? "wide" : width >= 1024 ? "desktop" : "compact";
const widthOptions: Record<Exclude<DesktopProfile, "compact">, number[]> = { wide: [208, 244, 280, 320], desktop: [188, 216, 244, 272] };
const widthBounds: Record<Exclude<DesktopProfile, "compact">, readonly [number, number]> = { wide: [180, 360], desktop: [176, 288] };
const clamp = (value: number, [minimum, maximum]: readonly [number, number]) => Math.min(Math.max(value, minimum), maximum);
const snapWidth = (value: number, bounds: readonly [number, number]) => clamp(Math.round(value / 4) * 4, bounds);

function readPreferences(): TrayPreferences {
  try {
    const raw = JSON.parse(window.localStorage.getItem(ASSET_TRAY_PREFERENCE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw as TrayPreferences : {};
  } catch {
    return {};
  }
}

export default function AssetLibraryLayoutController() {
  const [profile, setProfile] = useState<DesktopProfile>("wide");
  const [collapsed, setCollapsed] = useState(false);
  const [trayWidth, setTrayWidth] = useState(244);
  const [isResizing, setIsResizing] = useState(false);
  const preferencesRef = useRef<TrayPreferences>({});
  const widths = useMemo(() => profile === "compact" ? [] : widthOptions[profile], [profile]);

  useEffect(() => {
    const syncProfile = () => {
      const nextProfile = profileForWidth(window.innerWidth);
      const saved = preferencesRef.current[nextProfile];
      const bounds = nextProfile === "compact" ? null : widthBounds[nextProfile];
      setProfile(nextProfile);
      setCollapsed(nextProfile === "compact" ? false : Boolean(saved?.collapsed));
      setTrayWidth(bounds && typeof saved?.width === "number" ? snapWidth(saved.width, bounds) : widthOptions[nextProfile as Exclude<DesktopProfile, "compact">]?.[1] ?? 244);
      setIsResizing(false);
    };
    preferencesRef.current = readPreferences();
    syncProfile();
    window.addEventListener("resize", syncProfile);
    return () => window.removeEventListener("resize", syncProfile);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.assetTrayDevice = profile;
    root.dataset.assetTrayCollapsed = String(profile !== "compact" && collapsed);
    root.dataset.assetTrayResizing = String(isResizing);
    root.style.setProperty("--asset-tray-width", `${trayWidth}px`);
    return () => {
      delete root.dataset.assetTrayDevice;
      delete root.dataset.assetTrayCollapsed;
      delete root.dataset.assetTrayResizing;
      root.style.removeProperty("--asset-tray-width");
    };
  }, [profile, collapsed, trayWidth, isResizing]);

  useEffect(() => {
    if (profile === "compact") return;
    const next = { ...preferencesRef.current, [profile]: { collapsed, width: trayWidth } };
    preferencesRef.current = next;
    try {
      window.localStorage.setItem(ASSET_TRAY_PREFERENCE_KEY, JSON.stringify(next));
    } catch {
      /* Local layout memory is optional and must never interrupt the editor. */
    }
  }, [profile, collapsed, trayWidth]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !event.altKey || event.key !== "[") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      setCollapsed((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyWidthDelta = (delta: number) => {
    if (profile === "compact") return;
    setTrayWidth((current) => snapWidth(current + delta, widthBounds[profile]));
  };
  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (profile === "compact" || collapsed) return;
    event.preventDefault();
    const bounds = widthBounds[profile];
    const tray = document.getElementById("logocraft-asset-tray");
    const leftEdge = tray?.getBoundingClientRect().left ?? 58;
    setIsResizing(true);
    const onMove = (move: PointerEvent) => setTrayWidth(snapWidth(move.clientX - leftEdge, bounds));
    const onEnd = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };
  const resizeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (profile === "compact") return;
    if (event.key === "ArrowLeft") { event.preventDefault(); applyWidthDelta(-12); }
    if (event.key === "ArrowRight") { event.preventDefault(); applyWidthDelta(12); }
    if (event.key === "Home") { event.preventDefault(); setTrayWidth(widthBounds[profile][0]); }
    if (event.key === "End") { event.preventDefault(); setTrayWidth(widthBounds[profile][1]); }
  };

  if (profile === "compact") return null;

  return <>
    {!collapsed && <button className="asset-tray-resize-handle" aria-label="拖拽调整左侧素材栏宽度" aria-orientation="vertical" aria-valuemin={widthBounds[profile][0]} aria-valuemax={widthBounds[profile][1]} aria-valuenow={trayWidth} role="separator" title="拖拽调整素材栏宽度；方向键微调" onPointerDown={beginResize} onKeyDown={resizeKeyDown} />}
    <div className="asset-tray-control-rail">
    <button
      className="asset-tray-rail-button"
      type="button"
      title={collapsed ? "展开左侧素材栏（Alt+[）" : "收起左侧素材栏（Alt+[）"}
      aria-controls="logocraft-asset-tray"
      aria-expanded={!collapsed}
      onClick={() => setCollapsed((value) => !value)}
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      <span>{collapsed ? "展开" : "收起"}</span>
    </button>
  </div>
  </>;
}
