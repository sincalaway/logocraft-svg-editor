/* Design system: "精密工作台" — ruler annotations follow the active measurement unit. */
import { useEffect, useState } from "react";

type Unit = "px" | "mm" | "in";
type Artboard = { width: number; height: number; bleed: number };

const format = (value: number, unit: Unit) => unit === "mm" ? `${(value / 3.779527559).toFixed(1)}` : unit === "in" ? `${(value / 96).toFixed(2)}` : `${Math.round(value)}`;

export default function MeasurementUnitController() {
  const [unit, setUnit] = useState<Unit>("px");
  const [artboard, setArtboard] = useState<Artboard>({ width: 720, height: 520, bleed: 0 });
  useEffect(() => {
    const updateUnit = (event: Event) => setUnit((event as CustomEvent<Unit>).detail);
    const updateArtboard = (event: Event) => setArtboard((event as CustomEvent<Artboard>).detail);
    window.addEventListener("logocraft-unit-updated", updateUnit); window.addEventListener("logocraft-artboard-updated", updateArtboard);
    window.dispatchEvent(new Event("logocraft-unit-request")); window.dispatchEvent(new Event("logocraft-artboard-request"));
    return () => { window.removeEventListener("logocraft-unit-updated", updateUnit); window.removeEventListener("logocraft-artboard-updated", updateArtboard); };
  }, []);
  useEffect(() => {
    const horizontal = [0, artboard.width * .25, artboard.width * .5, artboard.width * .75, artboard.width]; const vertical = [0, artboard.height * .5, artboard.height];
    document.querySelectorAll<HTMLElement>(".drafting-ruler-top span").forEach((node, index) => { node.textContent = format(horizontal[index] ?? 0, unit); });
    document.querySelectorAll<HTMLElement>(".drafting-ruler-left span").forEach((node, index) => { node.textContent = format(vertical[index] ?? 0, unit); });
    document.querySelectorAll<HTMLElement>(".canvas-registration").forEach((node) => { node.textContent = `X 000 · Y 000 · ${unit.toUpperCase()} · ARTBOARD A`; });
  }, [unit, artboard]);
  return null;
}
