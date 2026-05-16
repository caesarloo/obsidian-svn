# Vault SVN v1.1.12 发布说明

## Release Date
2025-05-17

## Changes

### Features
1. **i18n 多语言支持 (English/中文)** — 新增 `src/i18n.ts` 翻译模块，设置页增加语言切换选项，默认中文。切换后面板、差异视图、命令、状态标签、提示信息全部跟随切换。
2. **不再自动打开右侧面板** — 移除了启动时自动打开 SVN 面板的行为，改为仅通过点击 Ribbon 图标或执行命令打开。

### Fixes
1. **文件名过长截断** — 文件树中长文件名使用 `text-overflow: ellipsis` 截断，鼠标悬停显示完整路径气泡提示。
2. **操作按钮固定可见** — 暂存/还原等操作按钮不再因文件名过长而隐藏。
3. **面板最小宽度** — 右侧边栏增加 `min-width: 320px`，避免按钮图标被挤压。

## Version Update
- `manifest.json`: 1.1.11 → 1.1.12
- `package.json`: 1.1.11 → 1.1.12
- `versions.json`: Added 1.1.12

## Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles
