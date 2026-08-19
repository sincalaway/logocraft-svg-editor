# 分类 SVG 图库：GitHub 与 Cloudflare Pages 部署记录

用户提供的 RAR 归档共列出 **5,268** 个 SVG，覆盖 **45** 个英文分类。归档内另有 Python 与批处理辅助脚本；这些不可信脚本没有被执行、提取或加入仓库。导入流程仅处理 `.svg` 文件，并移除脚本、位图、外部引用、动画与事件属性。

| 项目 | 验收结果 |
|---|---:|
| 已导入的分类 SVG | 5,145 |
| 安全跳过的空白 SVG | 123 |
| 分类目录 | 45 |
| 发布产物总文件数 | 5,198 |
| 发布目录大小 | 47 MB |
| 单个发布 SVG 最大值 | 约 998 KB |
| 危险 SVG 标签或事件属性 | 0 |

分类索引采用按需加载：应用只先请求 `svg-library/index.json`，用户选择分类后才请求对应的 `catalog/<分类>.json` 与缩略图；仅在用户主动搜索或打开“我的收藏”时，才汇总各个小型分类清单。这样避免首次打开图库下载数千个 SVG 或生成超出静态项目限制的全量搜索索引。资产保留在 `client/public/svg-library/assets/`，会随 `dist/public` 直接进入 Cloudflare Pages 发布物。

浏览器验收已完成：分类图库能显示 45 个类别与 5,145 个可用资产；从 `Abstract` 分类插入 `Abstract_01` 后，编辑器创建了独立图层并成功导出优化 SVG。生产静态预览中，`/svg-library/index.json` 与 `/svg-library/assets/Abstract/Abstract_01.svg` 均返回 `200`。

检查点预检识别出 3 个大于 1 MB 的 SVG。前两个经多轮优化已降至 1 MB 以下；摄影分类中最大的 `Photography_031.svg` 经路径精度优化后从约 1.58 MB 降至约 262 KB。原版本与候选版本均已进行视觉复核，核心胶片、相机与彩色背景构图保持可识别，因此采用压缩版本以满足静态项目检查点限制。

Cloudflare Pages 免费计划的站点可包含最多 20,000 个文件，单个静态资产上限为 25 MiB；本次构建的 5,198 个文件及最大的约 998 KB SVG 均处于范围内。[1]

## 维护方式

以后需要重建分类图库时，仅需准备包含“分类目录/文件.svg”结构的源目录，再运行：

```bash
node scripts/import-classified-svg.mjs /path/to/classified-svg-source
pnpm check && pnpm build
```

导入器会重建 `client/public/svg-library/` 下的资源与索引；不要手动修改该目录中的生成内容。

## References

[1]: https://developers.cloudflare.com/pages/platform/limits/ "Cloudflare Pages Limits"
