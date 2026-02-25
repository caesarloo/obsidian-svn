import {
  App,
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  WorkspaceLeaf,
  setIcon
} from "obsidian";
import { SvnClient } from "./services/svnClient";
import { generateSummaryWithFallback } from "./services/summaryService";
import type { GroupedStatus, ObsidianSvnSettings, SvnCredentials, SvnStatusEntry, SvnStatusKind, SvnDiff, UpdateResult } from "./types";

const VIEW_TYPE_SVN_PANEL = "obsidian-svn-panel";

const STATUS_LABELS: Record<SvnStatusKind, string> = {
  added: "新增",
  modified: "修改",
  deleted: "删除",
  conflict: "冲突",
  untracked: "未跟踪",
  missing: "缺失"
};

const DEFAULT_SETTINGS: ObsidianSvnSettings = {
  svnBinaryPath: "svn",
  workingCopyPath: "",
  username: "",
  persistPassword: false,
  savedPassword: "",
  enableDebugLog: false,
  debugLogMigratedToDefaultOff: false
};

export default class ObsidianSvnPlugin extends Plugin {
  settings: ObsidianSvnSettings = DEFAULT_SETTINGS;
  private sessionPassword = "";

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_SVN_PANEL, (leaf) => new SvnPanelView(leaf, this));

    this.addRibbonIcon("git-pull-request-arrow", "Open Obsidian SVN", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-panel",
      name: "打开 SVN 面板",
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "refresh-status",
      name: "刷新 SVN 状态",
      callback: () => void this.withView((view) => view.refreshStatus(true))
    });

    this.addCommand({
      id: "update-working-copy",
      name: "更新工作副本",
      callback: () => void this.withView((view) => view.updateWorkingCopy())
    });

    this.addCommand({
      id: "generate-summary",
      name: "生成提交摘要",
      callback: () => void this.withView((view) => view.generateSummary())
    });

    this.addCommand({
      id: "commit-staged",
      name: "提交已暂存变更",
      callback: () => void this.withView((view) => view.submitCommit())
    });

    this.addCommand({
      id: "open-repo-config",
      name: "打开仓库配置",
      callback: () => new RepositoryConfigModal(this.app, this).open()
    });

    this.addCommand({
      id: "add-active-file",
      name: "添加当前文件到 SVN",
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("add", path))
    });

    this.addCommand({
      id: "delete-active-file",
      name: "从 SVN 删除当前文件",
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("delete", path))
    });

    this.addCommand({
      id: "revert-active-file",
      name: "还原当前文件",
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("revert", path))
    });

    this.addSettingTab(new ObsidianSvnSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      void this.activateView();
    });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SVN_PANEL);
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<ObsidianSvnSettings> | null;
    const basePath = (this.app.vault.adapter as { basePath?: string }).basePath ?? "";

    const hasMigrationFlag = loaded?.debugLogMigratedToDefaultOff === true;
    const enableDebugLog = hasMigrationFlag ? loaded?.enableDebugLog === true : false;

    this.settings = {
      ...DEFAULT_SETTINGS,
      workingCopyPath: basePath,
      ...loaded,
      enableDebugLog,
      debugLogMigratedToDefaultOff: true
    };

    if (!hasMigrationFlag) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  getSvnClient(): SvnClient {
    const credentials = this.getCredentials();
    return new SvnClient(this.settings.svnBinaryPath, this.settings.workingCopyPath, credentials, this.settings.enableDebugLog);
  }

  debugLog(message: string, details?: unknown): void {
    if (!this.settings.enableDebugLog) {
      return;
    }
    if (details === undefined) {
      console.debug(message);
      return;
    }
    console.debug(message, details);
  }

  setSessionPassword(password: string): void {
    this.sessionPassword = password;
  }

  getSessionPassword(): string {
    return this.sessionPassword;
  }

  private getCredentials(): SvnCredentials | undefined {
    const password = this.settings.persistPassword ? this.settings.savedPassword : this.sessionPassword;
    if (!this.settings.username.trim() || !password.trim()) {
      return undefined;
    }
    return {
      username: this.settings.username,
      password
    };
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SVN_PANEL)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      return;
    }

    await leaf.setViewState({ type: VIEW_TYPE_SVN_PANEL, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private async withView(task: (view: SvnPanelView) => Promise<void> | void): Promise<void> {
    await this.activateView();
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SVN_PANEL)[0];
    const view = leaf?.view;
    if (!(view instanceof SvnPanelView)) {
      return;
    }
    await task(view);
  }

  private withActiveFile(checking: boolean, callback: (path: string) => Promise<void>): boolean {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) {
      return false;
    }
    if (checking) {
      return true;
    }
    void callback(file.path);
    return true;
  }

  private async runSingleFileAction(action: "add" | "delete" | "revert", path: string): Promise<void> {
    try {
      const client = this.getSvnClient();
      await client.ensureAvailable();
      if (action === "add") {
        await client.add([path]);
      } else if (action === "delete") {
        await client.delete([path]);
      } else {
        await client.revert([path]);
      }
      new Notice(`已执行 ${action}：${path}`);
      await this.withView((view) => view.refreshStatus(false));
    } catch (error) {
      new Notice((error as Error).message);
    }
  }
}

class SvnPanelView extends ItemView {
  private entries: SvnStatusEntry[] = [];
  private staged = new Set<string>();
  private collapsedFolders = new Set<string>();
  private commitMessage = "";
  private currentDiff: SvnDiff | null = null;
  private updateResult: UpdateResult | null = null;

  private statusTreeEl: HTMLDivElement | null = null;
  private commitInputEl: HTMLTextAreaElement | null = null;
  private conflictPanelEl: HTMLDivElement | null = null;
  private diffPanelEl: HTMLDivElement | null = null;
  private updateFeedbackEl: HTMLDivElement | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: ObsidianSvnPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_SVN_PANEL;
  }

  getDisplayText(): string {
    return "Obsidian SVN";
  }

  async onOpen(): Promise<void> {
    this.renderLayout();
    await this.refreshStatus(false);
  }

  async refreshStatus(showNotice: boolean): Promise<void> {
    try {
      this.plugin.debugLog("[Obsidian SVN] 开始刷新状态", { showNotice });
      const client = this.plugin.getSvnClient();
      await client.ensureAvailable();
      const entries = await client.status();
      this.entries = entries;
      this.staged.forEach((path) => {
        if (!entries.find((item) => item.path === path)) {
          this.staged.delete(path);
        }
      });
      this.renderStatusTree();
      this.renderConflicts();
      this.plugin.debugLog("[Obsidian SVN] 刷新状态成功", { entryCount: entries.length });
      if (showNotice) {
        new Notice(`状态已刷新，共 ${entries.length} 项变更`);
      }
    } catch (error) {
      const err = error as Error;
      console.error("[Obsidian SVN] 刷新状态失败", {
        message: err.message,
        stack: err.stack,
        error
      });
      new Notice(`刷新失败：${(error as Error).message}`);
    }
  }

  async updateWorkingCopy(): Promise<void> {
    try {
      this.plugin.debugLog("[Obsidian SVN] 开始更新工作副本");
      const client = this.plugin.getSvnClient();
      const result = await client.update();
      this.updateResult = result;
      this.plugin.debugLog("[Obsidian SVN] 更新工作副本成功", {
        entryCount: result.entries.length,
        summary: result.summary
      });
      new Notice(`更新完成：共更新 ${result.summary.total} 个文件`);
      this.renderUpdateFeedback();
      await this.refreshStatus(false);
    } catch (error) {
      const err = error as Error;
      console.error("[Obsidian SVN] 更新工作副本失败", {
        message: err.message,
        stack: err.stack,
        error
      });
      new Notice(`更新失败：${(error as Error).message}`);
    }
  }

  async generateSummary(): Promise<void> {
    try {
      const selected = this.entries.filter((entry) => this.staged.has(entry.path));
      const source = selected.length ? selected : this.entries;
      const summary = await generateSummaryWithFallback(source);
      this.commitMessage = summary;
      if (this.commitInputEl) {
        this.commitInputEl.value = summary;
      }
      new Notice("摘要已填充到提交框");
    } catch {
      new Notice("摘要生成失败，请手动填写提交备注");
    }
  }

  async submitCommit(): Promise<void> {
    const stagedPaths = [...this.staged];
    if (!stagedPaths.length) {
      new Notice("请先暂存至少一个文件");
      return;
    }

    const message = this.commitInputEl?.value.trim() || this.commitMessage.trim();
    if (!message) {
      new Notice("请先填写提交备注");
      return;
    }

    try {
      const client = this.plugin.getSvnClient();
      const map = new Map(this.entries.map((entry) => [entry.path, entry]));

      const untracked = stagedPaths.filter((path) => map.get(path)?.status === "untracked");
      if (untracked.length) {
        await client.add(untracked);
      }

      const missing = stagedPaths.filter((path) => map.get(path)?.status === "missing");
      if (missing.length) {
        await client.delete(missing);
      }

      await client.commit(stagedPaths, message);
      this.staged.clear();
      this.commitMessage = "";
      if (this.commitInputEl) {
        this.commitInputEl.value = "";
      }
      new Notice("提交成功");
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`提交失败：${(error as Error).message}`);
    }
  }

  private renderLayout(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("svn-plugin-root");

    const appGrid = root.createDiv({ cls: "svn-app-grid" });

    const sidePanel = appGrid.createDiv({ cls: "svn-panel" });
    sidePanel.createDiv({ cls: "svn-brand", text: "OBSIDIAN SVN" });
    sidePanel.createDiv({ cls: "svn-section-title", text: "快速操作" });
    const actionGrid = sidePanel.createDiv({ cls: "svn-actions-grid" });

    this.createIconButton(actionGrid, "arrow-down-to-line", "更新", () => void this.updateWorkingCopy());
    this.createIconButton(actionGrid, "refresh-cw", "刷新", () => void this.refreshStatus(true));
    this.createIconButton(actionGrid, "sparkles", "生成摘要", () => void this.generateSummary());
    this.createIconButton(actionGrid, "upload", "提交变更", () => void this.submitCommit());
    this.createIconButton(actionGrid, "settings", "设置", () => new RepositoryConfigModal(this.app, this.plugin).open());

    const contentPanel = appGrid.createDiv({ cls: "svn-panel" });
    contentPanel.createDiv({ cls: "svn-section-title", text: "提交" });
    const commitBox = contentPanel.createDiv({ cls: "svn-commit-box" });
    this.commitInputEl = commitBox.createEl("textarea", {
      attr: { placeholder: "填写提交备注，例如：更新需求文档与原型" }
    });
    this.commitInputEl.addEventListener("input", () => {
      this.commitMessage = this.commitInputEl?.value ?? "";
    });
    commitBox.createDiv({
      cls: "svn-helper-text",
      text: "“生成摘要”仅填充文本框，不会自动提交；使用左侧“提交变更”图标执行提交。"
    });

    contentPanel.createDiv({ cls: "svn-section-title", text: "变动文件（文件树）" });
    this.statusTreeEl = contentPanel.createDiv({ cls: "svn-status-tree" });

    this.conflictPanelEl = appGrid.createDiv({ cls: "svn-panel svn-conflict-panel" });
    this.renderConflicts();

    // 差异面板
    this.diffPanelEl = appGrid.createDiv({ cls: "svn-panel svn-diff-panel" });
    this.diffPanelEl.createDiv({ cls: "svn-section-title", text: "文件差异" });
    const diffContent = this.diffPanelEl.createDiv({ cls: "svn-diff-content" });
    diffContent.createDiv({ cls: "svn-helper-text", text: "点击文件右侧的差异按钮查看文件差异" });

    // 更新反馈面板
    this.updateFeedbackEl = appGrid.createDiv({ cls: "svn-panel svn-update-feedback" });
    this.updateFeedbackEl.createDiv({ cls: "svn-section-title", text: "更新反馈" });
    const updateContent = this.updateFeedbackEl.createDiv({ cls: "svn-update-content" });
    updateContent.createDiv({ cls: "svn-helper-text", text: "更新完成后显示更新的文件列表" });
  }

  private renderStatusTree(): void {
    if (!this.statusTreeEl) {
      return;
    }

    this.statusTreeEl.empty();
    const grouped = this.groupEntries(this.entries);

    grouped.folders.forEach((items, folder) => {
      const folderRow = this.statusTreeEl!.createDiv({ cls: "svn-folder-block" });
      const folderHeader = folderRow.createDiv({ cls: "svn-tree-row svn-tree-folder" });

      const toggle = folderHeader.createEl("button", { cls: "svn-mini-btn", attr: { "aria-label": "折叠切换" } });
      const collapsed = this.collapsedFolders.has(folder);
      toggle.setText(collapsed ? "+" : "-");
      toggle.addEventListener("click", () => {
        if (this.collapsedFolders.has(folder)) {
          this.collapsedFolders.delete(folder);
        } else {
          this.collapsedFolders.add(folder);
        }
        this.renderStatusTree();
      });

      folderHeader.createDiv({ cls: "svn-tree-label", text: folder });
      const folderActions = folderHeader.createDiv({ cls: "svn-tree-actions" });
      this.createMiniIcon(folderActions, this.areAllStaged(items) ? "minus" : "plus", this.areAllStaged(items) ? "取消暂存" : "暂存", () => {
        const shouldStage = !this.areAllStaged(items);
        items.forEach((item) => this.toggleStage(item.path, shouldStage));
        this.renderStatusTree();
      });
      this.createMiniIcon(folderActions, "refresh-ccw", "还原", () => void this.revertFolder(folder, items));

      if (!this.collapsedFolders.has(folder)) {
        const children = folderRow.createDiv({ cls: "svn-tree-children" });
        items.forEach((entry) => this.renderFileRow(children, entry));
      }
    });

    grouped.rootFiles.forEach((entry) => this.renderFileRow(this.statusTreeEl!, entry));

    if (!grouped.folders.size && !grouped.rootFiles.length) {
      this.statusTreeEl.createDiv({ cls: "svn-helper-text", text: "当前无变更" });
    }
  }

  private renderFileRow(container: HTMLElement, entry: SvnStatusEntry): void {
    const row = container.createDiv({ cls: "svn-tree-row svn-tree-file" });
    row.createDiv({ cls: "svn-tree-label", text: entry.fileName });

    row.createSpan({ cls: `svn-tag svn-tag-${entry.status}`, text: STATUS_LABELS[entry.status] });
    if (this.staged.has(entry.path)) {
      row.createSpan({ cls: "svn-tag svn-tag-staged", text: "已暂存" });
    }

    const actions = row.createDiv({ cls: "svn-tree-actions" });
    const isStaged = this.staged.has(entry.path);
    this.createMiniIcon(actions, "git-compare", "查看差异", () => void this.showFileDiff(entry.path));
    this.createMiniIcon(actions, isStaged ? "minus" : "plus", isStaged ? "取消暂存" : "暂存", () => {
      this.toggleStage(entry.path, !isStaged);
      this.renderStatusTree();
    });
    this.createMiniIcon(actions, "refresh-ccw", "还原", () => void this.revertFile(entry.path));
  }

  private renderConflicts(): void {
    if (!this.conflictPanelEl) {
      return;
    }

    this.conflictPanelEl.empty();
    const conflicts = this.entries.filter((entry) => entry.status === "conflict");
    if (!conflicts.length) {
      this.conflictPanelEl.removeClass("is-visible");
      return;
    }

    this.conflictPanelEl.addClass("is-visible");
    this.conflictPanelEl.createDiv({ cls: "svn-section-title", text: "冲突提示（仅在存在冲突时显示）" });

    const steps = this.conflictPanelEl.createDiv({ cls: "svn-conflict-steps" });
    steps.createDiv({ text: "1) 打开冲突文件，手动合并内容。" });
    steps.createDiv({ text: "2) 保存后选择“标记已解决”。" });
    steps.createDiv({ text: "3) 重新提交。" });

    const list = this.conflictPanelEl.createDiv({ cls: "svn-conflict-list" });
    conflicts.forEach((item) => {
      list.createDiv({ text: `• ${item.path}` });
    });

    const resolveBtn = this.conflictPanelEl.createEl("button", { cls: "svn-btn", text: "标记已解决" });
    resolveBtn.addEventListener("click", () => void this.resolveConflicts(conflicts.map((item) => item.path)));
  }

  private groupEntries(entries: SvnStatusEntry[]): GroupedStatus {
    const rootFiles: SvnStatusEntry[] = [];
    const folders = new Map<string, SvnStatusEntry[]>();

    for (const entry of entries) {
      if (!entry.folderPath) {
        rootFiles.push(entry);
        continue;
      }

      const current = folders.get(entry.folderPath) ?? [];
      current.push(entry);
      folders.set(entry.folderPath, current);
    }

    folders.forEach((value) => {
      value.sort((a, b) => a.fileName.localeCompare(b.fileName));
    });

    rootFiles.sort((a, b) => a.fileName.localeCompare(b.fileName));
    return { rootFiles, folders: new Map([...folders.entries()].sort(([a], [b]) => a.localeCompare(b))) };
  }

  private toggleStage(path: string, staged: boolean): void {
    if (staged) {
      this.staged.add(path);
      return;
    }
    this.staged.delete(path);
  }

  private areAllStaged(entries: SvnStatusEntry[]): boolean {
    return entries.length > 0 && entries.every((entry) => this.staged.has(entry.path));
  }

  private async revertFolder(folder: string, entries: SvnStatusEntry[]): Promise<void> {
    if (!confirm(`确认递归还原文件夹 ${folder} 下的变更吗？`)) {
      return;
    }

    try {
      const client = this.plugin.getSvnClient();
      await client.revert([folder], true);
      entries.forEach((entry) => this.staged.delete(entry.path));
      new Notice(`已还原：${folder}`);
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`还原失败：${(error as Error).message}`);
    }
  }

  private async revertFile(path: string): Promise<void> {
    try {
      const client = this.plugin.getSvnClient();
      await client.revert([path]);
      this.staged.delete(path);
      new Notice(`已还原：${path}`);
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`还原失败：${(error as Error).message}`);
    }
  }

  private async resolveConflicts(paths: string[]): Promise<void> {
    try {
      const client = this.plugin.getSvnClient();
      await client.resolve(paths);
      new Notice("冲突已标记为解决");
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`标记失败：${(error as Error).message}`);
    }
  }

  private async showFileDiff(path: string): Promise<void> {
    try {
      const client = this.plugin.getSvnClient();
      const diff = await client.diff(path);
      this.currentDiff = diff;
      this.renderDiff();
    } catch (error) {
      new Notice(`获取差异失败：${(error as Error).message}`);
    }
  }

  private renderDiff(): void {
    if (!this.diffPanelEl || !this.currentDiff) {
      return;
    }

    const diffContent = this.diffPanelEl.querySelector(".svn-diff-content");
    if (!diffContent) {
      return;
    }

    diffContent.empty();

    const filePathEl = diffContent.createDiv({ cls: "svn-diff-file-path", text: this.currentDiff.filePath });

    const diffLinesEl = diffContent.createDiv({ cls: "svn-diff-lines" });
    this.currentDiff.lines.forEach((line) => {
      const lineEl = diffLinesEl.createDiv({ cls: `svn-diff-line svn-diff-${line.type}` });
      lineEl.createSpan({ cls: "svn-diff-line-number", text: line.lineNumber.toString() });
      lineEl.createSpan({ cls: "svn-diff-line-content", text: line.content });
    });

    if (this.currentDiff.lines.length === 0) {
      diffContent.createDiv({ cls: "svn-helper-text", text: "无差异" });
    }
  }

  private renderUpdateFeedback(): void {
    if (!this.updateFeedbackEl || !this.updateResult) {
      return;
    }

    const updateContent = this.updateFeedbackEl.querySelector(".svn-update-content");
    if (!updateContent) {
      return;
    }

    updateContent.empty();

    const summaryEl = updateContent.createDiv({ cls: "svn-update-summary" });
    summaryEl.createDiv({ text: `更新完成：共更新 ${this.updateResult.summary.total} 个文件` });
    summaryEl.createDiv({ text: `新增：${this.updateResult.summary.added}，修改：${this.updateResult.summary.modified}，删除：${this.updateResult.summary.deleted}` });

    const listEl = updateContent.createDiv({ cls: "svn-update-list" });
    this.updateResult.entries.forEach((entry) => {
      const entryEl = listEl.createDiv({ cls: "svn-update-entry" });
      entryEl.createSpan({ text: entry.path });
      entryEl.createSpan({ cls: `svn-tag svn-tag-${entry.status}`, text: STATUS_LABELS[entry.status as SvnStatusKind] || entry.status });
    });
  }

  private createIconButton(container: HTMLElement, icon: string, title: string, onClick: () => void, primary = false): void {
    const button = container.createEl("button", { cls: `svn-icon-btn${primary ? " is-primary" : ""}`, attr: { title } });
    setIcon(button, icon);
    button.addEventListener("click", onClick);
  }

  private createMiniIcon(container: HTMLElement, icon: string, title: string, onClick: () => void): void {
    const button = container.createEl("button", { cls: "svn-mini-btn", attr: { title } });
    // 使用文本代替图标，确保显示正常
    if (icon === "plus") {
      button.setText("+");
    } else if (icon === "minus") {
      button.setText("-");
    } else if (icon === "refresh-ccw") {
      button.setText("↺");
    } else {
      setIcon(button, icon);
    }
    button.addEventListener("click", onClick);
  }
}

class RepositoryConfigModal extends Modal {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("svn-modal");

    contentEl.createEl("h3", { text: "仓库配置" });

    const binaryInput = this.createBinaryField(contentEl, this.plugin.settings.svnBinaryPath);
    const userInput = this.createField(contentEl, "用户名", this.plugin.settings.username);

    const passwordInput = this.createField(contentEl, "密码", this.plugin.getSessionPassword() || this.plugin.settings.savedPassword, "password");

    new Setting(contentEl)
      .setName("持久化保存密码")
      .setDesc("关闭时仅在当前会话保留密码（更安全）")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.persistPassword);
        toggle.onChange((value) => {
          this.plugin.settings.persistPassword = value;
        });
      });

    const actionRow = contentEl.createDiv({ cls: "svn-modal-actions" });
    const cancelBtn = actionRow.createEl("button", { cls: "svn-btn", text: "取消" });
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = actionRow.createEl("button", { cls: "svn-btn is-primary", text: "保存" });
    saveBtn.addEventListener("click", async () => {
      const binaryValue = binaryInput.value.trim() || "svn";
      if (/tortoiseproc\.exe$/i.test(binaryValue.replace(/\\/g, "/"))) {
        new Notice("TortoiseProc.exe 不是 svn 命令行工具，请选择 svn.exe。若安装 TortoiseSVN，请勾选“Command line client tools”组件。");
        return;
      }

      this.plugin.settings.svnBinaryPath = binaryValue;
      this.plugin.settings.username = userInput.value.trim();

      const password = passwordInput.value;
      if (this.plugin.settings.persistPassword) {
        this.plugin.settings.savedPassword = password;
        this.plugin.setSessionPassword("");
      } else {
        this.plugin.settings.savedPassword = "";
        this.plugin.setSessionPassword(password);
      }

      await this.plugin.saveSettings();
      new Notice("仓库配置已保存");
      this.close();
    });
  }

  private createField(parent: HTMLElement, label: string, value: string, type = "text"): HTMLInputElement {
    const wrapper = parent.createDiv({ cls: "svn-field" });
    wrapper.createEl("label", { text: label });
    return wrapper.createEl("input", {
      attr: {
        type,
        value
      }
    });
  }

  private createBinaryField(parent: HTMLElement, value: string): HTMLInputElement {
    const wrapper = parent.createDiv({ cls: "svn-field" });
    wrapper.createEl("label", { text: "SVN 可执行文件" });

    const row = wrapper.createDiv({ cls: "svn-field-row" });
    const input = row.createEl("input", {
      attr: {
        type: "text",
        value,
        placeholder: "留空或填写 svn；如失败请填写 svn.exe 绝对路径"
      }
    });

    const picker = row.createEl("input", {
      attr: {
        type: "file",
        accept: ".exe"
      }
    });
    picker.style.display = "none";

    const pickBtn = row.createEl("button", { cls: "svn-btn", text: "选择文件" });
    pickBtn.addEventListener("click", async () => {
      const selected = await this.pickExecutablePathWithElectron();
      if (selected) {
        input.value = selected;
        return;
      }
      picker.click();
    });

    picker.addEventListener("change", () => {
      const file = picker.files?.[0] as File & { path?: string };
      if (file?.path) {
        input.value = file.path;
        return;
      }

      if (picker.value) {
        input.value = picker.value;
        new Notice("当前环境无法读取真实文件路径，请手动粘贴 svn.exe 的绝对路径。", 5000);
      }
    });

    wrapper.createDiv({
      cls: "svn-helper-text",
      text: "示例：C:/Program Files/TortoiseSVN/bin/svn.exe。若安装 TortoiseSVN，请勾选“Command line client tools”组件；若 PATH 已配置可直接填 svn。"
    });

    return input;
  }

  private async pickExecutablePathWithElectron(): Promise<string | null> {
    try {
      const electron = (window as Window & { require?: (id: string) => unknown }).require?.("electron") as {
        dialog?: {
          showOpenDialog: (options: {
            title?: string;
            properties?: string[];
            filters?: Array<{ name: string; extensions: string[] }>;
          }) => Promise<{ canceled: boolean; filePaths: string[] }>;
        };
        remote?: {
          dialog?: {
            showOpenDialog: (options: {
              title?: string;
              properties?: string[];
              filters?: Array<{ name: string; extensions: string[] }>;
            }) => Promise<{ canceled: boolean; filePaths: string[] }>;
          };
        };
      };

      const dialog = electron?.dialog ?? electron?.remote?.dialog;
      if (!dialog?.showOpenDialog) {
        return null;
      }

      const result = await dialog.showOpenDialog({
        title: "选择 svn.exe",
        properties: ["openFile"],
        filters: [{ name: "Executable", extensions: ["exe"] }]
      });

      if (result.canceled || !result.filePaths.length) {
        return null;
      }

      return result.filePaths[0];
    } catch {
      return null;
    }
  }
}

class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian SVN" });

    new Setting(containerEl)
      .setName("打开仓库配置弹窗")
      .setDesc("配置 SVN 可执行文件与凭据")
      .addButton((button) => {
        button.setButtonText("打开");
        button.onClick(() => {
          new RepositoryConfigModal(this.app, this.plugin).open();
        });
      });

    new Setting(containerEl)
      .setName("说明")
      .setDesc("若关闭“持久化保存密码”，插件会仅在当前会话保存密码，不写入配置文件。")
      .addExtraButton((button) => {
        button.setIcon("info");
      });

    new Setting(containerEl)
      .setName("调试日志")
      .setDesc("关闭后将不再输出调试级别日志（console.debug）")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableDebugLog);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableDebugLog = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
