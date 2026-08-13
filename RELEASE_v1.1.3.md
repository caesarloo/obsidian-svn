# Vault SVN 插件 v1.1.3 发布说明

## 发布日期
2026-03-02

## 主要更改

### 修复
1. **差异视图误报修复**
   - 修复仅因空格、换行等纯格式变化导致整段内容被标记为差异的问题。
2. **差异归一化策略调整**
   - 当归一化后无实质内容变更时，不再回退到原始 diff，避免“看起来全部变更”的误导展示。

### 版本更新
1. 版本号更新到 `1.1.3`（`package.json` / `manifest.json` / `versions.json`）。

## Release 附件

本次发布的附件包含以下文件：
- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`
