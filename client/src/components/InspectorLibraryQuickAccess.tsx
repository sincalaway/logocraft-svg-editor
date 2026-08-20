/* Precision workbench inspector utility: restores the SVG catalog as a visible desktop inspection action without competing with object controls. */
import { LibraryBig } from "lucide-react";
import { useEffect, useState } from "react";

export default function InspectorLibraryQuickAccess() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.innerWidth >= 1024);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  if (!visible) return null;

  return <button
    type="button"
    className="action-button inspector-library-button inspector-library-quick-access"
    title="打开 SVG 图库"
    onClick={() => window.dispatchEvent(new Event("logocraft-svg-library-open"))}
  >
    <LibraryBig size={14} />
    <span>SVG 图库</span>
  </button>;
}
