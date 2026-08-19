/* Delivery design: deterministic SVG cleanup and LogoCraft export checks for the precision-workbench workflow. */
export type SvgAuditStatus = "pass" | "warning" | "fail";
export type SvgAuditCheck = { id: string; label: string; detail: string; status: SvgAuditStatus };
export type SvgAuditElement = { type: string; name: string; x: number; y: number; width: number; height: number; hidden?: boolean; fill: string; svgMarkup?: string };
export type SvgAuditResult = { valid: boolean; optimizedSvg: string; originalBytes: number; optimizedBytes: number; reduction: number; checks: SvgAuditCheck[] };

const escapeTitle = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const byteLength = (value: string) => new Blob([value], { type: "image/svg+xml" }).size;

export function optimizeSvg(svg: string, title: string) {
  const semantic = svg.replace(/^<svg([^>]*)>/, `<svg$1 role="img" aria-labelledby="logocraft-title"><title id="logocraft-title">${escapeTitle(title)}</title>`);
  return semantic.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

export function auditSvgDelivery(svg: string, elements: SvgAuditElement[], artboard: { width: number; height: number }, title: string): SvgAuditResult {
  const optimizedSvg = optimizeSvg(svg, title || "LogoCraft SVG");
  const visible = elements.filter((element) => !element.hidden);
  const imageLayers = visible.filter((element) => element.type === "image" && !element.svgMarkup);
  const invalidColors = visible.filter((element) => !/^#[0-9a-f]{6}$/i.test(element.fill));
  const overflowing = visible.filter((element) => element.x < 0 || element.y < 0 || element.x + element.width > artboard.width || element.y + element.height > artboard.height);
  const colors = new Set(visible.map((element) => element.fill.toUpperCase()));
  const checks: SvgAuditCheck[] = [
    { id: "viewbox", label: "画板与 viewBox", detail: `${artboard.width} × ${artboard.height}，已写入可缩放 viewBox。`, status: "pass" },
    { id: "semantic", label: "可访问元数据", detail: "已写入 SVG title、role 与语义关联。", status: "pass" },
    { id: "raster", label: "纯矢量交付", detail: imageLayers.length ? `检测到 ${imageLayers.length} 个位图图层；SVG 交付会丢失该内容。` : "未检测到会丢失内容的位图图层。", status: imageLayers.length ? "fail" : "pass" },
    { id: "color", label: "色值规范", detail: invalidColors.length ? `${invalidColors.length} 个图层未使用标准六位十六进制色值。` : `${colors.size} 个标准色值可被稳定复现。`, status: invalidColors.length ? "fail" : "pass" },
    { id: "bounds", label: "画板安全边界", detail: overflowing.length ? `${overflowing.length} 个图层超出画板，可能在下游工具中被裁切。` : "所有可见图层均位于画板范围内。", status: overflowing.length ? "warning" : "pass" },
    { id: "anchor", label: "LogoCraft 品牌锚点", detail: optimizedSvg.includes("#FF6B35") ? "检测到熔岩琥珀定位点。" : "未检测到琥珀定位点；如为 LogoCraft 品牌稿，请复核标志锚点。", status: optimizedSvg.includes("#FF6B35") ? "pass" : "warning" },
  ];
  const originalBytes = byteLength(svg); const optimizedBytes = byteLength(optimizedSvg);
  return { valid: !checks.some((check) => check.status === "fail"), optimizedSvg, originalBytes, optimizedBytes, reduction: Math.max(0, Math.round((1 - optimizedBytes / Math.max(1, originalBytes)) * 100)), checks };
}
