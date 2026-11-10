# Vault SVN v1.2.3

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-11-10

### Fixes

1. **`minAppVersion` aligned with the declarative settings API** — `minAppVersion` raised from 1.7.2 to **1.13.0**, because the settings tab uses Obsidian APIs introduced in 1.13.0 (`getSettingDefinitions()`, `getControlValue()`, `setControlValue()`, `SettingTab#update()`). This resolves the reviewer error *"Uses Obsidian APIs newer than the declared minAppVersion"*.

2. **Deprecated `display()` removed** — The imperative settings rendering was dropped; the settings tab is rendered declaratively only, as recommended since the API was deprecated in 1.13.0.

### Version Update
- `manifest.json`: 1.2.2 → 1.2.3, `minAppVersion`: 1.7.2 → 1.13.0
- `package.json`: 1.2.2 → 1.2.3
- `versions.json`: Added 1.2.3

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-11-10

### 修复

1. **`minAppVersion` 与声明式设置 API 对齐** — 把 `minAppVersion` 从 1.7.2 提升到 **1.13.0**，因为设置页使用了 1.13.0 才引入的 Obsidian API（`getSettingDefinitions()`、`getControlValue()`、`setControlValue()`、`SettingTab#update()`）。这消除了审核报错 *"Uses Obsidian APIs newer than the declared minAppVersion"*。

2. **移除已废弃的 `display()`** — 删除命令式设置渲染，设置页只走声明式渲染（`display()` 自 1.13.0 起废弃，官方建议改用 `getSettingDefinitions()`）。

### 版本更新
- `manifest.json`: 1.2.2 → 1.2.3，`minAppVersion`: 1.7.2 → 1.13.0
- `package.json`: 1.2.2 → 1.2.3
- `versions.json`: 新增 1.2.3

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
