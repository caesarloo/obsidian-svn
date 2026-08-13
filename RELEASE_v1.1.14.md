# Vault SVN v1.1.14

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-08-13

### Fixes

1. **Responsive Changed-Files List Height** — The changed-files area previously had a fixed `max-height` of 460px, leaving most of the panel empty on large screens (e.g. 2560×1440). The list now grows with the viewport (`calc(100vh - 380px)` with a 200px minimum), so large displays show far more entries at once.

2. **Root-Level File Names No Longer Truncated** — When the status tree exceeded its scroll height, the flex container compressed its direct children, squashing root-level file rows (which have `overflow: hidden`) so their names were cut off. Files inside folder blocks were unaffected, making root files look shorter than subfolder files. Child rows are now protected with `flex-shrink: 0`, so scrolling replaces compression and every file name keeps its full height.

### Housekeeping
- Normalized line endings (CRLF → LF) across tracked files and added `.gitattributes` (`* text=auto`, `eol=lf` for json/md/css) to keep the repository LF-only.

### Version Update
- `manifest.json`: 1.1.13 → 1.1.14
- `package.json`: 1.1.13 → 1.1.14
- `versions.json`: Added 1.1.14

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-08-13

### 修复

1. **变动文件区域高度自适应** — 变动文件列表此前固定 `max-height: 460px`，在大屏（如 2560×1440）上只占面板一半高度。现改为随视口自适应（`calc(100vh - 380px)`，最小 200px），大屏可一次显示更多条目。

2. **根目录文件名不再被截断** — 当状态树内容超出滚动高度时，flex 容器会压缩其直接子项：根目录文件行带 `overflow: hidden`，被压扁后文件名显示不全；而子目录文件在文件夹块内部（block 布局）不受影响，导致根目录文件看起来比子目录文件矮。现为子项添加 `flex-shrink: 0`，超出时走滚动而非压缩，所有文件名保持完整高度。

### 工程整理
- 全仓库 tracked 文件行尾统一为 LF（CRLF → LF），新增 `.gitattributes`（`* text=auto`，json/md/css 显式 `eol=lf`），保证仓库保持纯 LF。

### 版本更新
- `manifest.json`: 1.1.13 → 1.1.14
- `package.json`: 1.1.13 → 1.1.14
- `versions.json`: Added 1.1.14

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
