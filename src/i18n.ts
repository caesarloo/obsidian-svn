export type Lang = "zh" | "en";

const zh: Record<string, string> = {
  // Settings
  "settings.heading": "插件设置",
  "settings.language": "显示语言",
  "settings.language.desc": "选择插件界面的显示语言",
  "settings.svnBinaryPath": "Svn 可执行文件",
  "settings.svnBinaryPath.desc": "留空或填写 svn；如失败请填写 svn.exe 绝对路径",
  "settings.svnBinaryPath.placeholder": "例如：C:/Program Files/TortoiseSVN/bin/svn.exe 或 svn",
  "settings.svnBinaryPath.warning": "所选程序不是 svn 命令行工具，请填写 svn.exe。",
  "settings.info": "说明",
  "settings.info.desc": "本插件使用系统中的 svn 命令行工具执行版本管理操作。",
  "settings.debugLog": "调试日志",
  "settings.debugLog.desc": "关闭后将不再输出调试级别日志（console.debug）",
  "settings.autoRefresh": "自动刷新间隔",
  "settings.autoRefresh.desc": "设置自动刷新 svn 状态的间隔时间（秒），0 表示禁用自动刷新",
  "settings.autoOpenPanel": "启动时自动打开 svn 面板",
  "settings.autoOpenPanel.desc": "Obsidian 启动时自动打开 svn 面板",
  "settings.autoGenerateSummary": "提交时自动生成摘要",
  "settings.autoGenerateSummary.desc": "提交时自动生成提交摘要",
  "settings.diffTheme": "Svn 差异显示主题",
  "settings.diffTheme.desc": "设置文件差异显示的主题",
  "settings.diffTheme.light": "浅色",
  "settings.diffTheme.dark": "深色",
  "settings.defaultExpandFolders": "文件树默认展开状态",
  "settings.defaultExpandFolders.desc": "设置文件树的默认展开状态",

  // Panel
  "panel.title": "Vault SVN",
  "panel.quickActions": "快速操作",
  "panel.status": "刷新状态",
  "panel.update": "更新",
  "panel.generateSummary": "生成摘要",
  "panel.commit": "提交变更",
  "panel.commitPlaceholder": "填写提交备注，例如：更新需求文档与原型",
  "panel.commitHelper": "\"生成摘要\"仅填充文本框，不会自动提交；使用左侧\"提交变更\"图标执行提交。",
  "panel.changedFiles": "变动文件（文件树）",
  "panel.noChanges": "当前无变更",
  "panel.refreshing": "刷新状态中...",
  "panel.refreshSuccess": "状态已刷新，共 {count} 项变更",
  "panel.refreshFailed": "刷新失败：{msg}",
  "panel.updating": "更新工作副本中...",
  "panel.updateSuccess": "更新完成：共更新 {count} 个文件",
  "panel.updateFailed": "更新失败：{msg}",
  "panel.conflictDetected": "检测到冲突，请按冲突提示完成处理后再提交。",
  "panel.commitAfterConflict": "提交后检测到冲突，请先处理冲突。",
  "panel.summaryGenerating": "生成摘要中...",
  "panel.summaryFilled": "摘要已填充到提交框",
  "panel.summaryFailed": "摘要生成失败，请手动填写提交备注",
  "panel.commitNoFiles": "请先暂存至少一个文件",
  "panel.commitNoMessage": "请先填写提交备注",
  "panel.committing": "提交中...",
  "panel.commitSuccess": "提交成功",
  "panel.commitFailed": "提交失败：{msg}",
  "panel.stage": "暂存",
  "panel.unstage": "取消暂存",
  "panel.revert": "还原",
  "panel.reverting": "还原中...",
  "panel.revertSuccess": "已还原：{path}",
  "panel.revertFailed": "还原失败：{msg}",
  "panel.revertUntrackedDeleted": "已删除未跟踪文件：{path}",
  "panel.resolving": "标记冲突已解决中...",
  "panel.resolveSuccess": "冲突已解决",
  "panel.resolveFailed": "标记冲突失败：{msg}",
  "panel.fileAdded": "已执行 add：{path}",
  "panel.fileDeleted": "已执行 delete：{path}",
  "panel.fileReverted": "已执行 revert：{path}",
  "panel.cannotOpenDiff": "无法打开差异视图",
  "panel.commitAfterConflictTmp": "提交后检测到冲突，请先处理冲突。",

  // Status labels
  "status.added": "新增",
  "status.modified": "修改",
  "status.deleted": "删除",
  "status.conflict": "冲突",
  "status.untracked": "未跟踪",
  "status.missing": "缺失",
  "status.staged": "已暂存",

  // Diff view
  "diff.title": "Vault SVN 文件差异",
  "diff.header": "文件差异",
  "diff.headerWithMode": "文件差异（{mode}）- {path}",
  "diff.hint": "在 Vault SVN 侧边栏点击文件名查看差异。",
  "diff.noDiff": "无差异",
  "diff.prevPage": "上一页",
  "diff.nextPage": "下一页",
  "diff.pageInfo": "第 {current} / {total} 页",
  "diff.modePrevious": "历史对比",
  "diff.modeFileContent": "文件内容",
  "diff.modeLocal": "本地对比",

  // Diff view tab title
  "diff.tabTitle": "Vault SVN 差异 · {mode} · {file}",

  // Commands
  "cmd.openPanel": "打开 svn 面板",
  "cmd.refreshStatus": "刷新 svn 状态",
  "cmd.update": "更新工作副本",
  "cmd.generateSummary": "生成提交摘要",
  "cmd.commit": "提交已暂存变更",
  "cmd.addFile": "添加当前文件到 svn",
  "cmd.deleteFile": "从 svn 删除当前文件",
  "cmd.revertFile": "还原当前文件",

  // Ribbon
  "ribbon.openPanel": "打开 Vault SVN 面板",

  // Confirm modal
  "confirm.revertFolderTitle": "确认还原",
  "confirm.revertFolderDesc": "确认递归还原文件夹 {folder} 下的变更吗？",
  "confirm.revertFolderConfirm": "继续",
  "confirm.revertFolderSecondTitle": "二次确认",
  "confirm.revertFolderSecondDesc": "该操作不可撤销，请再次确认。",
  "confirm.revertFolderSecondConfirm": "确认还原",

  // Conflict panel
  "conflict.title": "冲突提示（仅在存在冲突时显示）",
  "conflict.step1": "1) 打开冲突文件，手动合并内容。",
  "conflict.step2": "2) 保存后选择\"标记已解决\"。",
  "conflict.step3": "3) 重新提交。",
  "conflict.resolveBtn": "标记已解决",

  // Update feedback
  "update.feedbackTitle": "更新反馈",
  "update.feedbackClose": "关闭",
  "update.feedbackDesc": "更新完成后显示更新文件列表",

  // Loading
  "loading.default": "加载中...",

  // Diff themes in settings
  "diffTheme.light": "浅色",
  "diffTheme.dark": "深色",
};

const en: Record<string, string> = {
  "settings.heading": "Plugin Settings",
  "settings.language": "Display Language",
  "settings.language.desc": "Select the display language of the plugin",
  "settings.svnBinaryPath": "SVN Executable",
  "settings.svnBinaryPath.desc": "Leave empty or \"svn\"; if it fails, enter the absolute path of svn.exe",
  "settings.svnBinaryPath.placeholder": "e.g. C:/Program Files/TortoiseSVN/bin/svn.exe or svn",
  "settings.svnBinaryPath.warning": "The selected program is not an svn CLI tool. Please select svn.exe.",
  "settings.info": "Info",
  "settings.info.desc": "This plugin uses the system svn CLI tool to perform version control operations.",
  "settings.debugLog": "Debug Log",
  "settings.debugLog.desc": "When disabled, debug-level console.log will no longer be output",
  "settings.autoRefresh": "Auto Refresh Interval",
  "settings.autoRefresh.desc": "Set the interval (seconds) for auto-refreshing svn status. 0 disables auto-refresh.",
  "settings.autoOpenPanel": "Auto-open SVN Panel on Startup",
  "settings.autoOpenPanel.desc": "Automatically open the SVN panel when Obsidian starts",
  "settings.autoGenerateSummary": "Auto-generate Commit Summary",
  "settings.autoGenerateSummary.desc": "Automatically generate a summary when committing",
  "settings.diffTheme": "Diff Display Theme",
  "settings.diffTheme.desc": "Set the theme for file diff display",
  "settings.diffTheme.light": "Light",
  "settings.diffTheme.dark": "Dark",
  "settings.defaultExpandFolders": "Default Folder Expand State",
  "settings.defaultExpandFolders.desc": "Set the default expand state of the file tree",

  "panel.title": "Vault SVN",
  "panel.quickActions": "Quick Actions",
  "panel.status": "Refresh",
  "panel.update": "Update",
  "panel.generateSummary": "Generate Summary",
  "panel.commit": "Commit",
  "panel.commitPlaceholder": "Enter commit message, e.g. Update docs and prototypes",
  "panel.commitHelper": "\"Generate Summary\" only fills the text box, does not auto-commit; use the \"Commit\" icon to execute.",
  "panel.changedFiles": "Changed Files",
  "panel.noChanges": "No changes",
  "panel.refreshing": "Refreshing status...",
  "panel.refreshSuccess": "Status refreshed, {count} changes found",
  "panel.refreshFailed": "Refresh failed: {msg}",
  "panel.updating": "Updating working copy...",
  "panel.updateSuccess": "Update complete: {count} files updated",
  "panel.updateFailed": "Update failed: {msg}",
  "panel.conflictDetected": "Conflicts detected. Please resolve them before committing.",
  "panel.commitAfterConflict": "Conflicts detected after commit. Please resolve them first.",
  "panel.summaryGenerating": "Generating summary...",
  "panel.summaryFilled": "Summary filled in commit box",
  "panel.summaryFailed": "Summary generation failed. Please enter commit message manually.",
  "panel.commitNoFiles": "Please stage at least one file",
  "panel.commitNoMessage": "Please enter a commit message",
  "panel.committing": "Committing...",
  "panel.commitSuccess": "Commit successful",
  "panel.commitFailed": "Commit failed: {msg}",
  "panel.stage": "Stage",
  "panel.unstage": "Unstage",
  "panel.revert": "Revert",
  "panel.reverting": "Reverting...",
  "panel.revertSuccess": "Reverted: {path}",
  "panel.revertFailed": "Revert failed: {msg}",
  "panel.revertUntrackedDeleted": "Deleted untracked file: {path}",
  "panel.resolving": "Marking conflicts as resolved...",
  "panel.resolveSuccess": "Conflicts resolved",
  "panel.resolveFailed": "Resolve failed: {msg}",
  "panel.fileAdded": "Added: {path}",
  "panel.fileDeleted": "Deleted: {path}",
  "panel.fileReverted": "Reverted: {path}",
  "panel.cannotOpenDiff": "Cannot open diff view",

  "status.added": "Added",
  "status.modified": "Modified",
  "status.deleted": "Deleted",
  "status.conflict": "Conflict",
  "status.untracked": "Untracked",
  "status.missing": "Missing",
  "status.staged": "Staged",

  "diff.title": "Vault SVN File Diff",
  "diff.header": "File Diff",
  "diff.headerWithMode": "File Diff ({mode}) - {path}",
  "diff.hint": "Click a file name in the Vault SVN sidebar to view its diff.",
  "diff.noDiff": "No differences",
  "diff.prevPage": "Previous",
  "diff.nextPage": "Next",
  "diff.pageInfo": "Page {current} / {total}",
  "diff.modePrevious": "History",
  "diff.modeFileContent": "File Content",
  "diff.modeLocal": "Local",

  "diff.tabTitle": "Vault SVN Diff · {mode} · {file}",

  "cmd.openPanel": "Open SVN Panel",
  "cmd.refreshStatus": "Refresh SVN Status",
  "cmd.update": "Update Working Copy",
  "cmd.generateSummary": "Generate Commit Summary",
  "cmd.commit": "Commit Staged Changes",
  "cmd.addFile": "Add Current File to SVN",
  "cmd.deleteFile": "Delete Current File from SVN",
  "cmd.revertFile": "Revert Current File",

  "ribbon.openPanel": "Open Vault SVN Panel",

  "confirm.revertFolderTitle": "Confirm Revert",
  "confirm.revertFolderDesc": "Recursively revert all changes in folder {folder}?",
  "confirm.revertFolderConfirm": "Continue",
  "confirm.revertFolderSecondTitle": "Confirm Again",
  "confirm.revertFolderSecondDesc": "This action cannot be undone. Please confirm again.",
  "confirm.revertFolderSecondConfirm": "Confirm Revert",

  "conflict.title": "Conflict Resolution",
  "conflict.step1": "1) Open conflicted file and manually merge changes.",
  "conflict.step2": "2) After saving, select \"Mark as Resolved\".",
  "conflict.step3": "3) Commit again.",
  "conflict.resolveBtn": "Mark as Resolved",

  "update.feedbackTitle": "Update Feedback",
  "update.feedbackClose": "Close",
  "update.feedbackDesc": "Update file list shown after update completes",

  "loading.default": "Loading...",

  "diffTheme.light": "Light",
  "diffTheme.dark": "Dark",
};

export function t(key: string, lang: Lang, params?: Record<string, string | number>): string {
  const dict = lang === "en" ? en : zh;
  let text = dict[key];
  if (text === undefined) {
    text = zh[key] ?? key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
