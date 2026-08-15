# LogoCraft 版本发布指南

本指南适用于发布新的 LogoCraft 版本。发布前应保证 `main` 已包含完成的功能、文档和变更说明。

## 发布前检查

| 检查项 | 命令或操作 |
| --- | --- |
| 依赖一致性 | `pnpm install --frozen-lockfile` |
| 类型检查 | `pnpm check` |
| 生产构建 | `pnpm build` |
| 变更记录 | 更新 `CHANGELOG.md` 的目标版本日期和条目 |
| 浏览器验收 | 验证画板导出、模板导入及本地工程恢复 |

## 版本号规则

| 变更类型 | 版本号示例 | 使用场景 |
| --- | --- | --- |
| 破坏性修改 | `2.0.0` | 工程格式或公共行为不再兼容 |
| 新功能 | `1.1.0` | 新增编辑、导出或协作能力 |
| 修复 | `1.0.1` | 修复既有功能且不改变公开行为 |

## GitHub 发布步骤

完成检查后，在本地创建带注释的标签并推送：

```bash
git checkout main
git pull --ff-only
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

随后在 GitHub 仓库的 **Releases** 页面选择 **Draft a new release**，选择对应标签，复制该版本在 `CHANGELOG.md` 中的内容，并发布版本。Cloudflare Pages 若已连接 `main`，会使用该分支的最新提交生成生产部署。

> 发布不应包含用户本地工程、模板或导出的设计文件。这些内容应由用户通过工程 JSON 或模板 JSON 自行管理。
