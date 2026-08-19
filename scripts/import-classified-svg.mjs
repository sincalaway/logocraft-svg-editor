import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[2];
const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "client", "public", "svg-library");
const assetsRoot = path.join(outputRoot, "assets");
const catalogRoot = path.join(outputRoot, "catalog");
const maxSvgBytes = 2 * 1024 * 1024;

if (!sourceRoot) throw new Error("Usage: node scripts/import-classified-svg.mjs <source-svg-directory>");

const listSvgFiles = async (directory, files = []) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await listSvgFiles(fullPath, files);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) files.push(fullPath);
  }
  return files;
};

const sanitizeSvg = (source) => source
  .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<(?:script|foreignObject|iframe|object|embed|style|image|a|animate|animateTransform|set)\b[^>]*>[\s\S]*?<\/(?:script|foreignObject|iframe|object|embed|style|image|a|animate|animateTransform|set)>/gi, "")
  .replace(/<\/?(?:script|foreignObject|iframe|object|embed|style|image|a|animate|animateTransform|set)\b[^>]*>/gi, "")
  .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
  .replace(/\s+(?:xlink:)?href\s*=\s*(?:"(?!#)[^"]*"|'(?!#)[^']*'|(?!#)[^\s>]+)/gi, "")
  .replace(/\s+(?:fill|stroke|filter|clip-path|mask)\s*=\s*(?:"\s*url\((?!#)[^"]*\)"|'\s*url\((?!#)[^']*\)'|url\((?!#)[^\s>]*\))/gi, "");

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "uncategorized";
const publicUrl = (relativePath) => `/svg-library/assets/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;

await rm(outputRoot, { recursive: true, force: true });
await mkdir(assetsRoot, { recursive: true });
await mkdir(catalogRoot, { recursive: true });

const sourceFiles = await listSvgFiles(sourceRoot);
const categories = new Map();
let skipped = 0;
let totalBytes = 0;

for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(sourceRoot, sourceFile);
  const parts = relativePath.split(path.sep);
  if (parts.length !== 2 || parts.some((part) => !part || part === "." || part === "..")) { skipped += 1; continue; }
  const fileInfo = await stat(sourceFile);
  if (fileInfo.size > maxSvgBytes) { skipped += 1; continue; }
  const original = await readFile(sourceFile, "utf8");
  const sanitized = sanitizeSvg(original).replace(/^\uFEFF/, "").replace(/^\s*<\?xml[^>]*\?>/i, "").trim();
  if (!/^<svg\b/i.test(sanitized)) { skipped += 1; continue; }
  const destination = path.join(assetsRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, sanitized, "utf8");
  const categoryName = parts[0];
  const entries = categories.get(categoryName) ?? [];
  entries.push({ id: slug(`${categoryName}-${path.basename(parts[1], ".svg")}`), name: path.basename(parts[1], ".svg"), path: publicUrl(relativePath) });
  categories.set(categoryName, entries);
  totalBytes += Buffer.byteLength(sanitized);
}

const categoryIndex = [];
for (const [name, entries] of [...categories.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const id = slug(name);
  entries.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  await writeFile(path.join(catalogRoot, `${id}.json`), JSON.stringify({ id, name, assets: entries }), "utf8");
  categoryIndex.push({ id, name, count: entries.length, manifest: `/svg-library/catalog/${id}.json` });
}

await writeFile(path.join(outputRoot, "index.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), total: categoryIndex.reduce((sum, category) => sum + category.count, 0), categories: categoryIndex }, null, 2), "utf8");
await writeFile(path.join(outputRoot, "README.md"), `# LogoCraft 分类 SVG 资源\n\n该目录由 \`scripts/import-classified-svg.mjs\` 生成。只包含清理后的 SVG 与分类索引；请勿手工修改生成的 \`assets/\` 和 \`catalog/\` 内容。\n\n导入命令：\n\n\`node scripts/import-classified-svg.mjs /path/to/classified-svg-source\`\n`, "utf8");

console.log(JSON.stringify({ imported: categoryIndex.reduce((sum, category) => sum + category.count, 0), categories: categoryIndex.length, skipped, totalBytes, outputRoot }, null, 2));
