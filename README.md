# Vault SVN

[English](#english) | [中文](#chinese)

---

## English

**Vault SVN** is a desktop-only Obsidian plugin for managing SVN working copies directly inside your vault. It provides a visual SVN client panel with status tree, staging, commit, conflict resolution, and more.

> ⚠️ **Permissions**: This plugin invokes the system `svn` CLI via Node.js `child_process.execFile` and accesses SVN working copies on the local filesystem via `fs`. It only operates on paths you configure in settings. These permissions are required for SVN version control functionality and cannot be replaced by the Obsidian vault API.

**Current stable version**: `1.1.13`

**Latest release**: https://github.com/caesarloo/obsidian-svn/releases/tag/1.1.13

### Installation

1. Go to the [latest release page](https://github.com/caesarloo/obsidian-svn/releases/tag/1.1.13) and download these 3 files:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Create the plugin directory inside your vault: `<Vault>/.obsidian/plugins/vault-svn/`
3. Copy the 3 downloaded files into that directory.
4. Restart Obsidian, or reload Community Plugins in Settings.

### Prerequisites

- **Desktop Obsidian only** (not available on mobile).
- **SVN CLI** must be installed and available on your system. Verify with `svn --version` in your terminal.
- You need a local SVN working copy path.

### Usage

#### Open the SVN Panel

- **Command Palette**: Run `Open Vault SVN Panel`
- **Ribbon Icon**: Click the `Open Vault SVN` icon in the left ribbon

#### Settings

Configure these in the plugin settings tab:

| Setting | Description |
|---------|-------------|
| SVN Executable Path | Optional; leave empty to use system PATH |
| Auto-refresh Interval | How often to poll for status changes |
| Auto-open Panel on Startup | Open the panel automatically when Obsidian starts |

#### Daily Workflow

1. **Update** — pull latest changes from the repository (`svn update`)
2. **Refresh Status** — view the current change list (`svn status`)
3. **Stage** — select files/directories in the file tree to stage
4. **Enter Commit Message** — type a message (summary generation is available as a helper)
5. **Commit** — commit only the staged changes

#### Conflict Resolution

When conflicts are detected, the plugin shows a conflict indicator. To resolve:

1. Fix the conflict in your external editor or merge tool
2. Run **Mark as Resolved** in the plugin
3. Refresh status and commit as usual

### Features

- Update working copy (`svn update`)
- Refresh status (`svn status`)
- Change tree: added, modified, deleted, conflicted, untracked, missing
- File and folder-level staging / un-staging
- File restore and recursive folder restore
- Commit staged changes
- Automatic commit summary generation (non-blocking on failure)
- Conflict detection and marking resolved
- Selectable file path in diff view for easy copy/paste

### FAQ

**Q: No changes are shown.**

A: Verify the working copy path in settings. Check that `svn status` runs correctly in that directory from your terminal.

**Q: Plugin says "svn command not found".**

A: Run `svn --version` in your terminal to verify installation. If installed but still failing, set the absolute path to the svn executable in plugin settings.

**Q: Commit fails.**

A: Check for unresolved conflicts or file permission issues.

### Development

```bash
# Build the plugin
npm run build

# Type-check
npm run typecheck
```

---

## Chinese / 中文

# Vault SVN 插件使用说明

Vault SVN 是一个 Obsidian **桌面端**插件，用于在库内管理 SVN 工作副本。

> ⚠️ **权限说明**：本插件通过 Node.js `child_process.execFile` 调用系统已安装的 `svn` CLI 命令，并使用 `fs` 模块直接访问文件系统上的 SVN 工作副本。插件仅在用户配置的工作副本路径下执行 SVN 操作，不会主动访问其他目录。这些权限是 SVN 版本管理功能所必需的，无法通过 Obsidian vault API 替代。

当前稳定版本：`1.1.13`

最新发布页：https://github.com/caesarloo/obsidian-svn/releases/tag/1.1.13



### 1. 安装插件

1. 打开发布页下载以下 3 个文件：
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. 在你的库目录下创建插件目录：`<Vault>/.obsidian/plugins/vault-svn/`
3. 将上述 3 个文件放入该目录。
4. 重启 Obsidian，或在"社区插件"中重新加载插件。

### 2. 前置条件

- 仅支持桌面端 Obsidian。
- 系统中必须已安装可执行的 `svn` 命令行工具。
- 你需要有可访问的 SVN 工作副本本地路径。

### 3. 打开插件面板

- 方式一：命令面板执行 `打开 SVN 面板`
- 方式二：点击左侧 Ribbon 图标 `Open Vault SVN`

### 4. 首次配置

在插件设置中填写以下信息：

- svn 可执行文件路径（可选，未填时使用系统 PATH）
- 自动刷新间隔
- 启动自动打开面板等行为选项

### 5. 日常使用流程

建议按以下顺序操作：

1. 点击"更新"拉取最新变更（`svn update`）
2. 点击"刷新状态"查看变更列表（`svn status`）
3. 在文件树中选择需要提交的文件/目录进行"暂存"
4. 输入提交信息（可使用摘要生成功能辅助）
5. 点击"提交变更"（仅提交已暂存集合）

### 6. 冲突处理

检测到冲突时，插件会给出冲突提示。可按以下流程处理：

1. 在外部工具或编辑器中解决冲突
2. 回到插件中执行"标记已解决"
3. 再次刷新状态并继续提交

### 7. 功能清单

- 更新工作副本（`svn update`）
- 刷新状态（`svn status`）
- 变更树展示：新增/修改/删除/冲突/未跟踪/缺失
- 文件与文件夹级暂存/取消暂存
- 文件还原与文件夹递归还原
- 提交已暂存变更
- 提交摘要自动生成（失败不阻断手动提交）
- 冲突提示与标记已解决
- 差异视图文件路径可选中复制

### 8. 常见问题

#### 看不到任何变更

- 先确认"工作副本路径"是否正确。
- 确认该目录可正常执行 `svn status`。

#### 提示找不到 svn 命令

- 在系统终端执行 `svn --version` 验证安装。
- 若已安装但仍失败，请在设置中填写 svn 可执行文件绝对路径。

#### 提交失败

- 检查是否存在冲突或权限问题。
