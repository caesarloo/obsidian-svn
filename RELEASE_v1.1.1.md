# Vault SVN 插件 v1.1.1 发布说明

## 发布日期
2026-03-02

## 主要更改

### 社区插件提交流程适配
1. **更新插件 ID 为社区规范兼容值**：
   - 从 `obsidian-svn` 调整为 `vault-svn`（社区目录要求 `id` 不包含 `obsidian`）
2. **补充版本映射文件**：
   - 新增 `versions.json`，用于社区目录更新机制
3. **完善元数据**：
   - 更新 manifest 的 `author` 与 `description`，提升社区目录展示一致性

### 继承 v1.1.0 的功能修复
- 修复差异视图不显示问题
- 修复 diff 中文乱码问题
- 增强差异解析稳定性

## 版本更新
- 更新版本号到 `v1.1.1`

## Release 附件

本次发布的附件包含以下文件：
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式

## 说明

此版本主要用于满足 Obsidian 社区插件提交流程的元数据与结构要求。
