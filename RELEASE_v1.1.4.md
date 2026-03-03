# Vault SVN 插件 v1.1.4 发布说明

## 发布日期
2026-03-03

## 主要更改

### 修复
1. **扫描项 required 问题修复**
   - 修复 `onunload` 中不应 `detachLeaves` 的问题。
   - 替换废弃编码接口（`escape/unescape`）为 `TextEncoder/TextDecoder`。
   - 替换浏览器 `confirm` 流程为 Obsidian `Modal` 二次确认。
2. **UI 与规则合规修复**
   - settings 页面标题改为 `Setting().setHeading()`。
   - 移除/替换内联样式赋值，改为 class 驱动样式。
   - 清理 `any`、`prefer-const`、`async` 无 `await` 等 lint 问题。
3. **SVN 解析稳定性改进**
   - 强化控制字符校验与编码处理稳定性。
   - 使用 `Buffer.subarray` 代替 `slice` 相关风险路径。

### 工程与工具链
1. **新增 ESLint flat config**
   - 新增 `eslint.config.mjs`，启用 `eslint-plugin-obsidianmd` 推荐规则。
2. **版本对齐官方推荐**
   - ESLint 生态对齐到 README 推荐组合（ESLint 9）。
3. **构建校验通过**
   - `npm run lint` 与 `npm run typecheck` 通过。

### 版本更新
1. 版本号更新到 `1.1.4`（`package.json` / `manifest.json` / `versions.json` / `README.md`）。

## Release 附件

本次发布的附件包含以下文件：
- `dist/main.js`
- `dist/manifest.json`
- `dist/styles.css`
