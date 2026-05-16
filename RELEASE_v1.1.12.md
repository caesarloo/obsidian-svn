# Vault SVN v1.1.12

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2025-05-17

### Features

1. **i18n Multi-language Support (English / 中文)** — Added `src/i18n.ts` translation module. A language switch option in Settings (中文/English). The panel, diff view, commands, status labels, and notifications all follow the selected language. Default: Chinese.

2. **No More Auto-open on Startup** — Removed the auto-open behavior when Obsidian starts. The SVN panel now only opens when you click the ribbon icon or run a command.

### Fixes

1. **Truncated Long Filenames** — Long filenames in the file tree use `text-overflow: ellipsis`. Hover shows the full path in a tooltip.

2. **Always-Visible Action Buttons** — Stage/unstage/revert buttons no longer get hidden when filenames are long.

3. **Panel Minimum Width** — Right sidebar now has `min-width: 320px` to prevent squished buttons and icons.

### Version Update
- `manifest.json`: 1.1.11 → 1.1.12
- `package.json`: 1.1.11 → 1.1.12
- `versions.json`: Added 1.1.12

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2025-05-17

### 功能

1. **i18n 多语言支持 (English/中文)** — 新增 `src/i18n.ts` 翻译模块，设置页增加语言切换选项，默认中文。切换后面板、差异视图、命令、状态标签、提示信息全部跟随切换。

2. **不再自动打开右侧面板** — 移除了启动时自动打开 SVN 面板的行为，改为仅通过点击 Ribbon 图标或执行命令打开。

### 修复

1. **文件名过长截断** — 文件树中长文件名使用 `text-overflow: ellipsis` 截断，鼠标悬停显示完整路径气泡提示。

2. **操作按钮固定可见** — 暂存/还原等操作按钮不再因文件名过长而隐藏。

3. **面板最小宽度** — 右侧边栏增加 `min-width: 320px`，避免按钮图标被挤压。

### 版本更新
- `manifest.json`: 1.1.11 → 1.1.12
- `package.json`: 1.1.11 → 1.1.12
- `versions.json`: Added 1.1.12

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
