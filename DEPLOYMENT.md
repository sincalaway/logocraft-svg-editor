# LogoCraft 部署指南

## 本地验证

在任何部署前，先安装依赖并完成静态检查与构建：

```bash
pnpm install
pnpm check
pnpm build
```

构建产物位于 `dist/public`。应用为前端优先的编辑器，工程数据、画板、模板和历史记录由浏览器本地存储保存，因此无需数据库迁移。

## Manus 托管发布

本项目已配置为静态前端项目。完成检查点后，请在项目管理界面中执行以下步骤：

1. 打开最新检查点对应的预览卡片。
2. 在页面顶部选择 **Publish**。
3. 在设置中配置站点名称、可见性和自定义域名（如需要）。
4. 发布后在生产域名再次验证画板导出、模板 JSON 导入和本地工程恢复。

> 生产环境的本地草稿仅与用户当前浏览器相关。用户如需迁移编辑内容，应使用工程 JSON 导出或模板 JSON 导出功能。

## Cloudflare Pages（推荐）

Cloudflare Pages 可直接连接独立仓库 `sincalaway/logocraft-svg-editor`。在 Cloudflare 控制台依次选择 **Workers & Pages**、**Create application**、**Pages** 和 **Import an existing Git repository**，然后选择该仓库。官方 React（Vite）预设通常使用 `npm run build` 和 `dist`；LogoCraft 的构建脚本额外生成可托管的静态目录，因此应使用下表中的项目实际配置。[1]

| Cloudflare Pages 配置项 | LogoCraft 值 |
| --- | --- |
| Production branch | `main` |
| Root directory | 留空（仓库根目录） |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Build output directory | `dist/public` |
| Node.js version | `22` |

保存并部署后，Cloudflare 会为生产环境创建 `*.pages.dev` 地址。后续推送到 `main` 会触发新的生产构建；可为其他分支或拉取请求启用预览部署。[2]

如需从命令行直接上传已构建产物，可先完成 `pnpm build`，再执行：

```bash
npx wrangler pages deploy dist/public --project-name logocraft-svg-editor
```

首次命令会要求 Cloudflare 登录并创建或选择 Pages 项目。使用 Cloudflare DNS 时，可在 Pages 项目的 **Custom domains** 中绑定域名；DNS 生效后再检查 HTTPS 和下载行为。

## 自托管服务器（Nginx）

以下示例适用于 Ubuntu/Debian 服务器。先在本地或服务器的项目目录中构建，再将静态产物复制到站点目录：

```bash
pnpm install --frozen-lockfile
pnpm build
sudo mkdir -p /var/www/logocraft
sudo rsync -a --delete dist/public/ /var/www/logocraft/
```

创建 `/etc/nginx/sites-available/logocraft`，将 `example.com` 替换为实际域名：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    root /var/www/logocraft;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
        try_files $uri =404;
    }
}
```

启用站点并验证配置：

```bash
sudo ln -s /etc/nginx/sites-available/logocraft /etc/nginx/sites-enabled/logocraft
sudo nginx -t
sudo systemctl reload nginx
```

在域名已解析到服务器后，可使用 Certbot 获取 HTTPS 证书：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot 会配置证书并可选择将 HTTP 重定向到 HTTPS。证书续期由系统定时器处理，但应通过 `sudo certbot renew --dry-run` 验证一次。

## 任意静态平台

对于支持 Node.js 构建的静态托管平台，使用以下命令：

| 设置 | 值 |
| --- | --- |
| 安装命令 | `pnpm install --frozen-lockfile` |
| 构建命令 | `pnpm build` |
| 发布目录 | `dist/public` |
| Node.js | 22 或更高版本 |

该应用依赖浏览器端下载、画布与本地存储能力。部署平台应允许静态资源的标准加载，并避免对 SVG 的 MIME 类型进行覆盖。

## 发布后验收

完成部署后，应至少检查：

- 新建、切换和删除多画板后仍能恢复本地工程。
- SVG、PNG 及 ZIP 批量导出能正常下载。
- 模板 JSON 可导入、导出与应用。
- 历史快照差异图可显示叠加效果和区域标注。
- 在窄屏设备上，画板初始缩放保持完整可见。

## 参考资料

[1]: https://developers.cloudflare.com/pages/configuration/build-configuration/ "Cloudflare Pages：构建配置"
[2]: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ "Cloudflare Pages：Vite 部署"
