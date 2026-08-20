/* Precision workbench asset-tray control: a compact graphite edge rail preserves canvas focus while remembering each desktop profile. */
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ASSET_TRAY_PREFERENCE_KEY = "logocraft-asset-tray-layout-v1";
type DesktopProfile = "wide" | "desktop" | "compact";
type TrayPreferences = Partial<Record<DesktopProfile, { collapsed: boolean }>>;

const profileForWidth = (width: number): DesktopProfile => width >= 1280 ? "wide" : width >= 1024 ? "desktop" : "compact";

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
  const preferencesRef = useRef<TrayPreferences>({});

  useEffect(() => {
    const syncProfile = () => {
      const nextProfile = profileForWidth(window.innerWidth);
      setProfile(nextProfile);
      setCollapsed(nextProfile === "compact" ? false : Boolean(preferencesRef.current[nextProfile]?.collapsed));
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
    return () => {
      delete root.dataset.assetTrayDevice;
      delete root.dataset.assetTrayCollapsed;
    };
  }, [profile, collapsed]);

  useEffect(() => {
    if (profile === "compact") return;
    const next = { ...preferencesRef.current, [profile]: { collapsed } };
    preferencesRef.current = next;
    try {
      window.localStorage.setItem(ASSET_TRAY_PREFERENCE_KEY, JSON.stringify(next));
    } catch {
      /* Local layout memory is optional and must never interrupt the editor. */
    }
  }, [profile, collapsed]);

  if (profile === "compact") return null;

  return <div className="asset-tray-control-rail">
    <button
      className="asset-tray-rail-button"
      type="button"
      title={collapsed ? "展开左侧素材栏" : "收起左侧素材栏"}
      aria-controls="logocraft-asset-tray"
      aria-expanded={!collapsed}
      onClick={() => setCollapsed((value) => !value)}
    >
      {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      <span>{collapsed ? "展开素材栏" : "收起素材栏"}</span>
    </button>
  </div>;
}
