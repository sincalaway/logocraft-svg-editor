# LogoCraft SVG Editor

LogoCraft 是一个浏览器端 SVG 标志编辑器，围绕**精密工作台**的编辑体验构建。它将多画板、智能参考线、图层与版本控制、可复用模板及专业导出组合在一个本地优先的界面中。

## 核心能力

| 模块 | 已实现能力 |
| --- | --- |
| 画布与编辑 | 框选、多选、八向调整、旋转吸附、整体缩放、滚轮缩放、智能吸附、对齐与分布。 |
| 画板 | 可创建、重命名、切换和删除多个画板；支持自定义尺寸、出血和 px/mm/in 单位。 |
| 图层 | 拖拽排序、分组、锁定、隐藏和多选批量属性编辑。 |
| 参考线 | 创建、拖拽、锁定、着色、显示切换、命名预设及参考线对齐。 |
| 历史 | 撤销/重做、命名快照、收藏快照、缩略图、像素叠加差异与区域标注。 |
| 模板与交付 | 共享画板模板保存、JSON 导入/导出、命名规则、SVG/PNG 批量导出及 ZIP 打包。 |

## 快速开始

安装依赖并启动本地开发环境：

```bash
pnpm install
pnpm dev
```

进行发布前检查：

```bash
pnpm check
pnpm build
```

## 部署与开源

项目可部署到 Cloudflare Pages、Cloudflare 的直接部署流程，或任意 Nginx 静态服务器。仓库根目录的 [DEPLOYMENT.md](./DEPLOYMENT.md) 提供 Cloudflare Pages、Wrangler、Nginx 和 HTTPS 的完整步骤。

LogoCraft 采用 [MIT License](./LICENSE) 发布。你可以自由使用、修改和分发项目，但应保留许可证与版权声明。

## 批量导出命名规则

批量交付面板支持以下占位符：

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `{project}` | 工程名称 | `brand-system` |
| `{index}` | 画板序号 | `01` |
| `{artboard}` | 画板名称 | `cover` |
| `{date}` | 导出日期 | `2026-08-15` |

默认规则为 `{project}_{index}_{artboard}`。启用 ZIP 后，全部 SVG 或 PNG 会下载为单一归档文件。

## 数据与隐私

工程、画板、参考线、模板和偏好默认保存在当前浏览器的本地存储中。工程 JSON 与共享模板 JSON 可用于备份、迁移或团队传递；模板文件不包含任何远程凭据。

## 项目结构

```text
client/src/pages/Home.tsx           # 编辑器状态与画布交互
client/src/components/              # 参考线、效率工具和交付工具盘
client/src/index.css                # 精密工作台设计令牌与组件样式
DEPLOYMENT.md                       # 发布和部署说明
```

## 贡献建议

提交功能前请运行 `pnpm check` 与 `pnpm build`。涉及编辑器交互的改动应同时验证桌面端和窄屏画板可读性，并保持琥珀色仅用于当前选择、精准锚点和主要执行动作。
