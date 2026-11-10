# Vault SVN v1.3.0

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-11-10

### New Features

1. **Declarative settings API (`getSettingDefinitions()`)** — The settings tab now implements Obsidian's declarative settings API, so the plugin's settings appear in Obsidian's global settings search on version 1.13.0 and later.

2. **Backward-compatible settings rendering** — The legacy imperative `display()` rendering is kept as a fallback for Obsidian versions older than 1.13.0, so the plugin still works on all versions down to the declared `minAppVersion` (1.7.2).

### Improvements

1. **Settings unit tests** — Added tests covering the declarative definitions (all configurable keys present, localized names), control value read/write, `svnBinaryPath` normalization and validation, auto-refresh interval side effects, and language-switch re-rendering.

2. **Type definitions updated** — `obsidian` dev dependency raised to `^1.14.4` so the declarative settings types are checked at compile time.

### Version Update
- `manifest.json`: 1.2.1 → 1.3.0
- `package.json`: 1.2.1 → 1.3.0
- `versions.json`: Added 1.3.0

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-11-10

### 新增

1. **声明式设置 API（`getSettingDefinitions()`）** — 设置页改为实现 Obsidian 的声明式设置 API，在 1.13.0 及以上版本中，插件设置会出现在全局"设置搜索"里。

2. **兼容旧版本的设置渲染** — 保留原有的命令式 `display()` 渲染作为 1.13.0 以下版本的兜底，插件在声明的最低版本（1.7.2）到最新版本上都能正常使用。

### 改进

1. **设置页单元测试** — 新增测试覆盖声明式定义（全部可配置项齐全、名称随语言变化）、控件值读写、`svnBinaryPath` 归一化与校验、自动刷新间隔副作用、切换语言后重新求值定义。

2. **类型定义升级** — `obsidian` 开发依赖升级到 `^1.14.4`，声明式设置相关类型在编译期得到校验。

### 版本更新
- `manifest.json`: 1.2.1 → 1.3.0
- `package.json`: 1.2.1 → 1.3.0
- `versions.json`: 新增 1.3.0

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
