# Vault SVN 插件 v1.1.10 发布说明

## 发布日期
2025-05-17

## 主要更改

### 修复
1. **修正 minAppVersion** — `manifest.json` 中 `minAppVersion` 从 1.0.0 更新为 1.7.2，以匹配实际使用的 `Workspace.revealLeaf` API 要求
2. **清理不必要的转义字符** — 修复 summaryService.ts 中正则表达式的冗余转义
3. **清理不必要的类型断言** — 移除 svnClient.ts 中两处冗余的 `as Buffer` 断言

### 新增
1. **GitHub Actions CI 发布流程** — 新增 `.github/workflows/release.yml`，支持推送 tag 后自动构建并生成 **artifact attestation**（GitHub 签名证明）
2. **发布脚本新增 `--ci` 模式** — `npm run release:publish -- --ci X.Y.Z` 推 tag 触发 CI 自动签名并发布

### 改进
1. 全部改动通过 eslint 与 tsc 类型检查

## 版本更新
- 更新版本号到 `v1.1.10`
- `manifest.json`：version 1.1.8 → 1.1.10，minAppVersion 1.0.0 → 1.7.2
- `package.json`：version 1.1.9 → 1.1.10

## Release 附件

本次发布的附件包含以下文件：
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式

所有附件均包含 GitHub Artifact Attestation 签名证明。
