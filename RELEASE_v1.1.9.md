# Vault SVN 插件 v1.1.9 发布说明

## 发布日期
2026-04-21

## 主要更改

### 改进
1. 优化更新反馈面板中新建文件的交互体验：点击新建文件直接打开该文件，而非显示空差异。

## 版本更新
- 更新版本号到 `v1.1.9`

## Release 附件

本次发布的附件包含以下文件：
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式

## 发布前检查清单

- [ ] `manifest.json` 中 `version` 已更新
- [ ] `package.json` 中 `version` 已更新
- [ ] 执行 `npm run build` 成功
- [ ] 执行 `npm run typecheck` 成功
- [ ] `dist/` 目录为最新产物
- [ ] 已创建 `RELEASE_v1.1.9.md`

## gh 发布命令（可直接替换版本号执行）

推荐一键发布（自动 build/typecheck/创建 release/设为 latest）：

```bash
npm run release:publish -- 1.1.9
```

先做预检查（不创建 release）：

```bash
npm run release:dry-run -- 1.1.9
```

手动命令：

```bash
gh release create v1.1.9 dist/main.js dist/manifest.json dist/styles.css \
  --title "Vault SVN v1.1.9" \
  --notes-file RELEASE_v1.1.9.md
```

## 发布后检查清单

- [ ] `gh release list` 显示新版本
- [ ] Release 页面附件可下载
- [ ] 需要时执行 `gh release edit v1.1.9 --latest`
- [ ] README 中"当前稳定版本"与"最新发布页"已同步