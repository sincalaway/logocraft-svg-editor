/* Precision workbench color inspection: extracts visible SVG paints, per-property usage, and safely scoped color replacement. */
export type SvgColorPalette = { primaryColor: string; colors: string[] };
export type SvgGradientStop = { gradientId: string; gradientType: "linear" | "radial"; index: number; offset: string; color: string };
export type SvgColorUsage = { fill: number; stroke: number; gradient: number; total: number };
export type SvgColorInspection = SvgColorPalette & { gradients: SvgGradientStop[]; usage: Record<string, SvgColorUsage> };
export type SvgPaintReplaceScope = "all" | "fill" | "stroke";

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

const stylePaint = (style: string, property: "fill" | "stroke" | "color" | "stop-color") => style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i"))?.[1] ?? null;
const usageShape = (): SvgColorUsage => ({ fill: 0, stroke: 0, gradient: 0, total: 0 });

export function extractSvgColorPalette(markup: string): SvgColorPalette {
  if (!markup || typeof DOMParser === "undefined") return { primaryColor: FALLBACK_COLOR, colors: [] };
  try {
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
    const counts = new Map<string, number>();
    const add = (candidate: string | null) => { if (!candidate) return; const color = normalizeColor(candidate); if (color) counts.set(color, (counts.get(color) ?? 0) + 1); };
    parsed.querySelectorAll("[fill], [stroke], [color], [stop-color], [style]").forEach((node) => {
      add(node.getAttribute("fill")); add(node.getAttribute("stroke")); add(node.getAttribute("color")); add(node.getAttribute("stop-color"));
      const style = node.getAttribute("style") ?? "";
      (["fill", "stroke", "color", "stop-color"] as const).forEach((property) => add(stylePaint(style, property)));
    });
    const colors = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([color]) => color);
    return { primaryColor: colors[0] ?? FALLBACK_COLOR, colors };
  } catch {
    return { primaryColor: FALLBACK_COLOR, colors: [] };
  }
}

export function inspectSvgColors(markup: string): SvgColorInspection {
  const palette = extractSvgColorPalette(markup);
  if (!markup || typeof DOMParser === "undefined") return { ...palette, gradients: [], usage: {} };
  try {
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
    const usage: Record<string, SvgColorUsage> = {};
    const countUsage = (candidate: string | null, property: "fill" | "stroke" | "gradient") => {
      if (!candidate) return;
      const color = normalizeColor(candidate); if (!color) return;
      const current = usage[color] ?? usageShape(); current[property] += 1; current.total += 1; usage[color] = current;
    };
    parsed.querySelectorAll("[fill], [stroke], [style]").forEach((node) => {
      const style = node.getAttribute("style") ?? "";
      countUsage(stylePaint(style, "fill") ?? node.getAttribute("fill"), "fill");
      countUsage(stylePaint(style, "stroke") ?? node.getAttribute("stroke"), "stroke");
    });
    const gradients: SvgGradientStop[] = [];
    parsed.querySelectorAll("linearGradient, radialGradient").forEach((gradient) => {
      const gradientId = gradient.getAttribute("id") ?? "未命名渐变";
      const gradientType = gradient.tagName.toLowerCase() === "radialgradient" ? "radial" : "linear";
      gradient.querySelectorAll("stop").forEach((stop, index) => {
        const color = normalizeColor(stop.getAttribute("stop-color") ?? stylePaint(stop.getAttribute("style") ?? "", "stop-color") ?? "");
        if (!color) return;
        countUsage(color, "gradient");
        gradients.push({ gradientId, gradientType, index, offset: stop.getAttribute("offset") ?? `${index}`, color });
      });
    });
    return { ...palette, gradients, usage };
  } catch {
    return { ...palette, gradients: [], usage: {} };
  }
}

export function replaceSvgPaintColor(markup: string, fromColor: string, nextColor: string, scope: SvgPaintReplaceScope = "all") {
  const target = normalizeColor(fromColor); const replacement = normalizeColor(nextColor);
  if (!target || !replacement) return markup;
  const allows = (property: string) => scope === "all" || property.toLowerCase() === scope;
  const replaceCandidate = (value: string) => normalizeColor(value) === target ? replacement : value;
  const withAttributes = markup.replace(/\b(fill|stroke|color|stop-color)(\s*=\s*["'])([^"']*)(["'])/gi, (full, property, separator, value, quote) => allows(property) ? `${property}${separator}${replaceCandidate(value)}${quote}` : full);
  return withAttributes.replace(/\bstyle=(['"])(.*?)\1/gi, (full, quote, style) => `style=${quote}${style.replace(/((?:^|;)\s*(?:fill|stroke|color|stop-color)\s*:\s*)([^;]+)/gi, (declaration: string, prefix: string, value: string) => { const property = prefix.match(/(fill|stroke|color|stop-color)\s*:/i)?.[1] ?? ""; return allows(property) ? `${prefix}${replaceCandidate(value)}` : declaration; })}${quote}`);
}

export function replaceSvgGradientStop(markup: string, gradientId: string, stopIndex: number, nextColor: string) {
  const replacement = normalizeColor(nextColor);
  if (!replacement || typeof DOMParser === "undefined") return markup;
  try {
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
    const gradient = Array.from(parsed.querySelectorAll("linearGradient, radialGradient")).find((node) => node.getAttribute("id") === gradientId);
    const stop = gradient?.querySelectorAll("stop")[stopIndex]; if (!stop) return markup;
    const style = stop.getAttribute("style");
    if (style && /(?:^|;)\s*stop-color\s*:/i.test(style)) stop.setAttribute("style", style.replace(/((?:^|;)\s*stop-color\s*:\s*)([^;]+)/i, `$1${replacement}`));
    else stop.setAttribute("stop-color", replacement);
    return parsed.documentElement.innerHTML;
  } catch {
    return markup;
  }
}
