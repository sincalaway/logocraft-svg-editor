/* Design system: "精密工作台" — cyan drafting references appear only as layout instrumentation. */
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ReferenceLine = { id: string; axis: "x" | "y"; position: number };

export default function CanvasReferenceOverlay() {
  const [lines, setLines] = useState<ReferenceLine[]>([]);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setStage(document.querySelector<HTMLElement>(".paper-canvas.canvas-grid"));
    const update = (event: Event) => setLines((event as CustomEvent<ReferenceLine[]>).detail);
    window.addEventListener("logocraft-reference-updated", update);
    window.dispatchEvent(new Event("logocraft-reference-request"));
    return () => window.removeEventListener("logocraft-reference-updated", update);
  }, []);
  if (!stage) return null;
  return createPortal(<>{lines.map((line) => <button key={line.id} className={`user-reference user-reference-${line.axis}`} style={line.axis === "x" ? { left: line.position } : { top: line.position }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent("logocraft-reference-begin", { detail: { id: line.id, axis: line.axis, pointerId: event.pointerId } })); }} onDoubleClick={() => window.dispatchEvent(new CustomEvent("logocraft-reference-delete", { detail: line.id }))} title="拖动调整；双击删除" />)}</>, stage);
}
