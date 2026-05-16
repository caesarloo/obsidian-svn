# Vault SVN 插件 vX.Y.Z 发布说明

## 发布日期
YYYY-MM-DD

## 主要更改

### 新增
1. [新增点 1]
2. [新增点 2]

### 修复
1. [修复点 1]
2. [修复点 2]

### 改进
1. [改进点 1]
2. [改进点 2]

## 版本更新
- 更新版本号到 `vX.Y.Z`

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
- [ ] 已创建 `RELEASE_vX.Y.Z.md`

## gh 发布命令（可直接替换版本号执行）

推荐一键发布（自动 build/typecheck/签名/发布）：

```bash
# CI 发布（推荐）— 推送 tag 后由 GitHub Actions 自动构建并签名
npm run release:publish -- --ci X.Y.Z

# 本地发布（传统方式，无 artifact attestation）
npm run release:publish -- X.Y.Z
```

先做预检查（不创建 release）：

```bash
npm run release:dry-run -- X.Y.Z
```

手动命令：

```bash
gh release create vX.Y.Z dist/main.js dist/manifest.json dist/styles.css \
  --title "Vault SVN vX.Y.Z" \
  --notes-file RELEASE_vX.Y.Z.md
```

## 发布后检查清单

- [ ] `gh release list` 显示新版本
- [ ] Release 页面附件可下载
- [ ] 需要时执行 `gh release edit vX.Y.Z --latest`
- [ ] README 中“当前稳定版本”与“最新发布页”已同步
