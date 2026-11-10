# Vault SVN v1.2.1

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-11-10

### Fixes

1. **Working copy path no longer restored from `data.json`** — After moving a vault to a new location (or syncing it across devices through cloud storage), the plugin kept using the stale absolute `workingCopyPath` saved in `data.json`. SVN commands were then executed in a directory that no longer existed or was not a working copy. Settings loading now always uses the current vault root directory.

2. **`workingCopyPath` is no longer persisted** — Saving settings strips this machine-specific absolute path, so a stale path can never travel with the vault again.

### Improvements

1. **Settings unit tests** — Added tests covering load (stale path ignored, fallback to the current vault root) and save (no `workingCopyPath` written to `data.json`).

### Version Update
- `manifest.json`: 1.2.0 → 1.2.1
- `package.json`: 1.2.0 → 1.2.1
- `versions.json`: Added 1.2.1

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-11-10

### 修复

1. **不再从 `data.json` 恢复工作副本路径** — 当 vault 被移动位置（或经云盘在多台设备间同步）后，插件仍会使用 `data.json` 里保存的旧绝对路径 `workingCopyPath`，导致 SVN 命令在已不存在、或不是工作副本的目录里执行。现在加载设置时一律以当前 vault 根目录为准。

2. **`workingCopyPath` 不再写入 `data.json`** — 保存设置时剔除这一机器相关的绝对路径，旧路径不会再随 vault 在设备/目录之间传播。

### 改进

1. **设置相关单元测试** — 新增测试覆盖加载（忽略旧路径、回落到当前 vault 根目录）与保存（不写入 `workingCopyPath`）行为。

### 版本更新
- `manifest.json`: 1.2.0 → 1.2.1
- `package.json`: 1.2.0 → 1.2.1
- `versions.json`: 新增 1.2.1

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
