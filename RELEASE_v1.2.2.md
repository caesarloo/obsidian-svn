# Vault SVN v1.2.2

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-11-10

### Fixes

1. **Settings search on Obsidian 1.13+** — The plugin's settings now appear in Obsidian's global settings search. The settings tab implements the declarative settings API (`getSettingDefinitions()`), which is required for search indexing on 1.13.0 and later.

2. **Backward-compatible settings rendering** — The legacy imperative `display()` rendering is kept as a fallback for Obsidian versions older than 1.13.0, so the plugin still works on all versions down to the declared `minAppVersion` (1.7.2).

### Improvements

1. **Settings unit tests** — Added tests covering the declarative definitions (all configurable keys present, localized names), control value read/write, `svnBinaryPath` normalization and validation, auto-refresh interval side effects, and language-switch re-rendering.

2. **Type definitions updated** — `obsidian` dev dependency raised to `^1.14.4` so the declarative settings types are checked at compile time.

### Version Update
- `manifest.json`: 1.2.1 → 1.2.2
- `package.json`: 1.2.1 → 1.2.2
- `versions.json`: Added 1.2.2

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-11-10

### 修复

1. **Obsidian 1.13+ 设置搜索** — 插件设置现在会出现在 Obsidian 的全局"设置搜索"里。设置页改为实现声明式设置 API（`getSettingDefinitions()`），这是 1.13.0 及以上版本建立搜索索引所必需的。

2. **兼容旧版本的设置渲染** — 保留原有的命令式 `display()` 渲染作为 1.13.0 以下版本的兜底，插件在声明的最低版本（1.7.2）到最新版本上都能正常使用。

### 改进

1. **设置页单元测试** — 新增测试覆盖声明式定义（全部可配置项齐全、名称随语言变化）、控件值读写、`svnBinaryPath` 归一化与校验、自动刷新间隔副作用、切换语言后重新求值定义。

2. **类型定义升级** — `obsidian` 开发依赖升级到 `^1.14.4`，声明式设置相关类型在编译期得到校验。

### 版本更新
- `manifest.json`: 1.2.1 → 1.2.2
- `package.json`: 1.2.1 → 1.2.2
- `versions.json`: 新增 1.2.2

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
