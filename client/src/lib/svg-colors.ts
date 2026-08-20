/* Precision workbench color inspection: extracts visible SVG paint values without executing SVG content. */
export type SvgColorPalette = { primaryColor: string; colors: string[] };

const FALLBACK_COLOR = "#1C1A18";
const ignored = new Set(["none", "transparent", "currentcolor", "inherit", "initial", "unset"]);

function normalizeColor(value: string) {
  const source = value.trim().toLowerCase();
  if (!source || ignored.has(source) || source.startsWith("url(") || source.startsWith("var(")) return null;
  const hex = source.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const raw = hex[1];
    const rgb = raw.length <= 4 ? raw.slice(0, 3).split("").map((part) => `${part}${part}`).join("") : raw.slice(0, 6);
    return `#${rgb.toUpperCase()}`;
  }
  const rgb = source.match(/^rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)/);
  if (rgb) return `#${rgb.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  if (typeof document === "undefined") return null;
  const probe = document.createElement("span");
  probe.style.color = source;
  if (!probe.style.color) return null;
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe).color;
  probe.remove();
  return normalizeColor(computed);
}

export function extractSvgColorPalette(markup: string): SvgColorPalette {
  if (!markup || typeof DOMParser === "undefined") return { primaryColor: FALLBACK_COLOR, colors: [] };
  try {
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
    const counts = new Map<string, number>();
    const add = (candidate: string | null) => {
      if (!candidate) return;
      const color = normalizeColor(candidate);
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    };
    parsed.querySelectorAll("[fill], [stroke], [color], [stop-color], [style]").forEach((node) => {
      add(node.getAttribute("fill"));
      add(node.getAttribute("stroke"));
      add(node.getAttribute("color"));
      add(node.getAttribute("stop-color"));
      const style = node.getAttribute("style") ?? "";
      style.matchAll(/(?:^|;)\s*(?:fill|stroke|color|stop-color)\s*:\s*([^;]+)/gi).forEach((match) => add(match[1]));
    });
    const colors = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([color]) => color);
    return { primaryColor: colors[0] ?? FALLBACK_COLOR, colors: colors.slice(0, 8) };
  } catch {
    return { primaryColor: FALLBACK_COLOR, colors: [] };
  }
}
