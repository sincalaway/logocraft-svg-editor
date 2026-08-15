/* Design system: "精密工作台" — cyan drafting references appear only as layout instrumentation. */
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ReferenceLine = { id: string; axis: "x" | "y"; position: number; color?: string; locked?: boolean };

export default function CanvasReferenceOverlay() {
  const [lines, setLines] = useState<ReferenceLine[]>([]);
  const [visible, setVisible] = useState(true);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setStage(document.querySelector<HTMLElement>(".paper-canvas.canvas-grid"));
    const update = (event: Event) => { const detail = (event as CustomEvent<{ lines: ReferenceLine[]; visible: boolean }>).detail; setLines(detail.lines); setVisible(detail.visible); };
    window.addEventListener("logocraft-reference-updated", update);
    window.dispatchEvent(new Event("logocraft-reference-request"));
    return () => window.removeEventListener("logocraft-reference-updated", update);
  }, []);
  if (!stage || !visible) return null;
  return createPortal(<>{lines.map((line) => <button key={line.id} className={`user-reference user-reference-${line.axis} ${line.locked ? "user-reference-locked" : ""}`} style={{ ...(line.axis === "x" ? { left: line.position } : { top: line.position }), background: line.color ?? "#367D97" }} onPointerDown={(event) => { if (line.locked) return; event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-reference-begin", { detail: { id: line.id, axis: line.axis, pointerId: event.pointerId } })); }} onDoubleClick={() => { if (!line.locked) window.dispatchEvent(new CustomEvent("logocraft-reference-delete", { detail: line.id })); }} title={line.locked ? "参考线已锁定" : "拖动调整；双击删除"} />)}</>, stage);
}
