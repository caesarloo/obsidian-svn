import { ItemView, Modal, Notice, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import { generateSummaryWithFallback } from "../services/summaryService";
import type { GroupedStatus, ObsidianSvnPlugin, SvnStatusEntry, SvnStatusKind, UpdateResult } from "../types";

const STATUS_LABELS: Record<SvnStatusKind, string> = {
  added: "新增",
  modified: "修改",
  deleted: "删除",
  conflict: "冲突",
  untracked: "未跟踪",
  missing: "缺失"
};

export class SvnPanelView extends ItemView {
  private entries: SvnStatusEntry[] = [];
  private staged = new Set<string>();
  private collapsedFolders = new Set<string>();
  private commitMessage = "";
  private updateResult: UpdateResult | null = null;
  private autoRefreshTimer: number | null = null;
  private autoRefreshInProgress = false;

  private statusTreeEl: HTMLDivElement | null = null;
  private commitInputEl: HTMLTextAreaElement | null = null;
  private conflictPanelEl: HTMLDivElement | null = null;
  private updateFeedbackEl: HTMLDivElement | null = null;
  private updateContentEl: HTMLDivElement | null = null;
  private loadingEl: HTMLDivElement | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: ObsidianSvnPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return "obsidian-svn-panel";
  }

  getDisplayText(): string {
    return "Vault svn";
  }

  getIcon(): string {
    return "vault-svn";
  }

  async onOpen(): Promise<void> {
    this.renderLayout();
    this.configureAutoRefresh();
    await this.refreshStatus(false);
  }

  async onClose(): Promise<void> {
    this.clearAutoRefreshTimer();
  }

  updateAutoRefreshTimer(): void {
    this.configureAutoRefresh();
  }

  async refreshStatus(showNotice: boolean): Promise<void> {
    try {
      this.showLoading("刷新状态中...");
      this.plugin.debugLog("[Vault SVN] 开始刷新状态", { showNotice });
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
      this.plugin.debugLog("[Vault SVN] 刷新状态成功", { entryCount: entries.length });
      if (showNotice) {
        new Notice(`状态已刷新，共 ${entries.length} 项变更`);
      }
    } catch (error) {
      const err = error as Error;
      console.error("[Vault SVN] 刷新状态失败", {
        message: err.message,
        stack: err.stack,
        error
      });
      new Notice(`刷新失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  async updateWorkingCopy(): Promise<void> {
    try {
      this.showLoading("更新工作副本中...");
      this.plugin.debugLog("[Vault SVN] 开始更新工作副本");
      const client = this.plugin.getSvnClient();
      const result = await client.update();
      this.updateResult = result;
      this.plugin.debugLog("[Vault SVN] 更新工作副本成功", {
        entryCount: result.entries.length,
        summary: result.summary
      });
      new Notice(`更新完成：共更新 ${result.summary.total} 个文件`);
      this.renderUpdateFeedback();
      this.showUpdateFeedback();
      await this.refreshStatus(false);
      if (this.entries.some((entry) => entry.status === "conflict")) {
        new Notice("检测到冲突，请按冲突提示完成处理后再提交。");
      }
    } catch (error) {
      const err = error as Error;
      console.error("[Vault SVN] 更新工作副本失败", {
        message: err.message,
        stack: err.stack,
        error
      });
      new Notice(`更新失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  async generateSummary(): Promise<void> {
    try {
      this.showLoading("生成摘要中...");
      const selected = this.entries.filter((entry) => this.staged.has(entry.path));
      const source = selected.length ? selected : this.entries;
      const client = this.plugin.getSvnClient();
      const summary = await generateSummaryWithFallback(source, async (entry) => {
        const diffStatus = entry.status === "added" || entry.status === "modified" || entry.status === "deleted" ? entry.status : undefined;
        const diff = await client.diff(entry.path, false, diffStatus);
        return diff.lines.map((line) => ({ content: line.content, type: line.type }));
      });
      this.commitMessage = summary;
      if (this.commitInputEl) {
        this.commitInputEl.value = summary;
      }
      new Notice("摘要已填充到提交框");
    } catch {
      new Notice("摘要生成失败，请手动填写提交备注");
    } finally {
      this.hideLoading();
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
      this.showLoading("提交中...");
      const client = this.plugin.getSvnClient();
      const map = new Map(this.entries.map((entry) => [entry.path, entry]));
      this.plugin.debugLog("[Vault SVN] 开始提交", {
        stagedCount: stagedPaths.length,
        stagedPaths,
        messageLength: message.length,
        messagePreview: message.slice(0, 200)
      });

      const untracked = stagedPaths.filter((path) => map.get(path)?.status === "untracked");
      if (untracked.length) {
        this.plugin.debugLog("[Vault SVN] 提交前自动 add", { untracked });
        await client.add(untracked);
      }

      const missing = stagedPaths.filter((path) => map.get(path)?.status === "missing");
      if (missing.length) {
        this.plugin.debugLog("[Vault SVN] 提交前自动 delete", { missing });
        await client.delete(missing);
      }

      const commitOutput = await client.commit(stagedPaths, message);
      this.plugin.debugLog("[Vault SVN] 提交成功", {
        stagedCount: stagedPaths.length,
        outputSample: commitOutput.slice(0, 500)
      });
      this.staged.clear();
      this.commitMessage = "";
      if (this.commitInputEl) {
        this.commitInputEl.value = "";
      }
      new Notice("提交成功");
      await this.refreshStatus(false);
      if (this.entries.some((entry) => entry.status === "conflict")) {
        new Notice("提交后检测到冲突，请先处理冲突。");
      }
    } catch (error) {
      this.plugin.debugLog("[Vault SVN] 提交失败", {
        message: (error as Error).message,
        stagedCount: stagedPaths.length,
        stagedPaths
      });
      new Notice(`提交失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  private renderLayout(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("svn-plugin-root");

    // 加载状态指示器
    this.loadingEl = root.createDiv({ cls: "svn-loading-overlay is-hidden" });

    this.loadingEl.createDiv({ cls: "svn-loading-spinner" });
    this.loadingEl.createDiv({ cls: "svn-loading-text", text: "加载中..." });

    const appGrid = root.createDiv({ cls: "svn-app-grid" });

    const sidePanel = appGrid.createDiv({ cls: "svn-panel" });
    sidePanel.createDiv({ cls: "svn-brand", text: "Vault SVN" });
    sidePanel.createDiv({ cls: "svn-section-title", text: "快速操作" });
    const actionGrid = sidePanel.createDiv({ cls: "svn-actions-grid" });

    this.createIconButton(actionGrid, "arrow-down-to-line", "更新", () => void this.updateWorkingCopy());
    this.createIconButton(actionGrid, "refresh-cw", "刷新", () => void this.refreshStatus(true));
    this.createIconButton(actionGrid, "sparkles", "生成摘要", () => void this.generateSummary());
    this.createIconButton(actionGrid, "upload", "提交变更", () => void this.submitCommit());

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
      text: "\"生成摘要\"仅填充文本框，不会自动提交；使用左侧\"提交变更\"图标执行提交。"
    });

    contentPanel.createDiv({ cls: "svn-section-title", text: "变动文件（文件树）" });
    this.statusTreeEl = contentPanel.createDiv({ cls: "svn-status-tree" });

    this.conflictPanelEl = appGrid.createDiv({ cls: "svn-panel svn-conflict-panel" });
    this.renderConflicts();

    this.updateFeedbackEl = appGrid.createDiv({ cls: "svn-panel svn-update-feedback is-hidden" });
    const updateHeader = this.updateFeedbackEl.createDiv({ cls: "svn-panel-header" });
    updateHeader.createDiv({ cls: "svn-panel-title", text: "更新反馈" });
    const updateClose = updateHeader.createEl("button", { cls: "svn-btn", text: "关闭", attr: { "aria-label": "关闭更新反馈" } });
    updateClose.addEventListener("click", () => this.hideUpdateFeedback());
    this.updateContentEl = this.updateFeedbackEl.createDiv({ cls: "svn-update-content" });
    this.updateContentEl.createDiv({ cls: "svn-helper-text", text: "更新完成后显示更新文件列表" });
  }

  private configureAutoRefresh(): void {
    this.clearAutoRefreshTimer();

    const intervalSeconds = this.plugin.settings.autoRefreshInterval;
    if (!intervalSeconds || intervalSeconds <= 0) {
      return;
    }

    this.autoRefreshTimer = window.setInterval(() => {
      if (this.autoRefreshInProgress) {
        return;
      }

      this.autoRefreshInProgress = true;
      void this.refreshStatus(false).finally(() => {
        this.autoRefreshInProgress = false;
      });
    }, intervalSeconds * 1000);
  }

  private clearAutoRefreshTimer(): void {
    if (this.autoRefreshTimer === null) {
      return;
    }
    window.clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }

  private renderStatusTree(): void {
    if (!this.statusTreeEl) {
      return;
    }

    this.statusTreeEl.empty();
    this.statusTreeEl.addClass("svn-status-tree-scroll");

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
    const labelBtn = row.createEl("button", {
      cls: "svn-tree-label svn-tree-link-btn",
      text: entry.fileName,
      attr: {
        title: entry.path,
        "aria-label": `查看差异：${entry.path}`
      }
    });
    labelBtn.addEventListener("click", () => void this.showFileDiff(entry.path, false, false, entry.status));

    row.createSpan({ cls: `svn-tag svn-tag-${entry.status}`, text: STATUS_LABELS[entry.status] });
    if (this.staged.has(entry.path)) {
      row.createSpan({ cls: "svn-tag svn-tag-staged", text: "已暂存" });
    }

    const actions = row.createDiv({ cls: "svn-tree-actions" });
    const isStaged = this.staged.has(entry.path);
    this.createMiniIcon(actions, isStaged ? "minus" : "plus", isStaged ? "取消暂存" : "暂存", () => {
      this.toggleStage(entry.path, !isStaged);
      this.renderStatusTree();
    });
    this.createMiniIcon(actions, "refresh-ccw", "还原", () => void this.revertFile(entry.path, entry.status));
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
    steps.createDiv({ text: "2) 保存后选择\"标记已解决\"。" });
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
    const confirmed = await this.openConfirmModal(
      "确认还原",
      `确认递归还原文件夹 ${folder} 下的变更吗？`,
      "继续"
    );
    if (!confirmed) {
      return;
    }

    const finalConfirmed = await this.openConfirmModal(
      "二次确认",
      "该操作不可撤销，请再次确认。",
      "确认还原"
    );
    if (!finalConfirmed) {
      return;
    }

    try {
      this.showLoading("还原中...");
      const client = this.plugin.getSvnClient();
      await client.revert([folder], true);
      entries.forEach((entry) => this.staged.delete(entry.path));
      new Notice(`已还原：${folder}`);
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`还原失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  private async revertFile(path: string, status?: SvnStatusKind): Promise<void> {
    try {
      this.showLoading("还原中...");

      if (status === "untracked") {
        const stat = await this.app.vault.adapter.stat(path);
        if (!stat) {
          new Notice(`文件不存在：${path}`);
          await this.refreshStatus(false);
          return;
        }

        if (stat.type === "folder") {
          await this.app.vault.adapter.rmdir(path, true);
        } else {
          await this.app.vault.adapter.remove(path);
        }

        this.staged.delete(path);
        new Notice(`已删除未跟踪文件：${path}`);
        await this.refreshStatus(false);
        return;
      }

      const client = this.plugin.getSvnClient();
      await client.revert([path]);
      this.staged.delete(path);
      new Notice(`已还原：${path}`);
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`还原失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  private async resolveConflicts(paths: string[]): Promise<void> {
    try {
      this.showLoading("标记冲突已解决中...");
      const client = this.plugin.getSvnClient();
      await client.resolve(paths);
      new Notice("冲突已标记为解决");
      await this.refreshStatus(false);
    } catch (error) {
      new Notice(`标记失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  private async showFileDiff(
    path: string,
    keepUpdatePanel = false,
    compareWithPrevious = false,
    updateStatus?: SvnStatusKind | "unchanged"
  ): Promise<void> {
    if (updateStatus === "deleted") {
      new Notice("文件已删除");
      return;
    }

    const diffStatus =
      updateStatus === "added" || updateStatus === "modified" || updateStatus === "unchanged"
        ? updateStatus
        : undefined;

    try {
      this.plugin.debugLog("[Vault SVN] 准备显示文件差异", {
        path,
        keepUpdatePanel,
        compareWithPrevious,
        updateStatus
      });
      this.showLoading("获取文件差异中...");
      const client = this.plugin.getSvnClient();
      const diff = await client.diff(path, compareWithPrevious, diffStatus);
      this.plugin.debugLog("[Vault SVN] 文件差异获取成功", {
        path,
        compareMode: diff.compareMode,
        lineCount: diff.lines.length
      });
      await this.plugin.openDiffInEditor(diff);
      this.plugin.debugLog("[Vault SVN] 文件差异已请求打开", { path });
      if (!keepUpdatePanel) {
        this.hideUpdateFeedback();
      }
    } catch (error) {
      this.plugin.debugLog("[Vault SVN] 文件差异打开失败", {
        path,
        error: (error as Error).message
      });
      new Notice(`获取差异失败：${(error as Error).message}`);
    } finally {
      this.hideLoading();
    }
  }

  private async openFileInEditor(path: string): Promise<void> {
    const normalizedPath = path.replace(/^\//, "");
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);
    if (file instanceof TFile) {
      const leaf = this.app.workspace.getLeaf("tab");
      if (leaf) {
        await leaf.openFile(file);
        await this.app.workspace.revealLeaf(leaf);
      }
    } else {
      new Notice(`文件不存在：${path}`);
    }
  }

  private renderUpdateFeedback(): void {
    if (!this.updateFeedbackEl || !this.updateResult || !this.updateContentEl) {
      return;
    }

    this.updateContentEl.empty();

    const summaryEl = this.updateContentEl.createDiv({ cls: "svn-update-summary" });
    summaryEl.createDiv({ text: `更新完成：共更新 ${this.updateResult.summary.total} 个文件` });
    summaryEl.createDiv({ text: `新增：${this.updateResult.summary.added}，修改：${this.updateResult.summary.modified}，删除：${this.updateResult.summary.deleted}` });

    const listEl = this.updateContentEl.createDiv({ cls: "svn-update-list svn-virtual-scroll" });

    this.updateResult.entries.forEach((entry) => {
      const entryEl = listEl.createDiv({ cls: "svn-update-entry" });
      const fileLabel = entryEl.createEl("button", {
        cls: "svn-update-link-btn",
        text: entry.path,
        attr: { "aria-label": `查看差异：${entry.path}` }
      });
      if (entry.status === "added") {
        fileLabel.addEventListener("click", () => void this.openFileInEditor(entry.path));
      } else {
        fileLabel.addEventListener("click", () => void this.showFileDiff(entry.path, true, true, entry.status));
      }
      entryEl.createSpan({ cls: `svn-tag svn-tag-${entry.status}`, text: STATUS_LABELS[entry.status as SvnStatusKind] || entry.status });
    });

    if (!this.updateResult.entries.length) {
      listEl.createDiv({ cls: "svn-helper-text", text: "本次更新没有文件变更。" });
    }
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

  private showUpdateFeedback(): void {
    this.updateFeedbackEl?.removeClass("is-hidden");
  }

  private hideUpdateFeedback(): void {
    this.updateFeedbackEl?.addClass("is-hidden");
  }

  private showLoading(text = "加载中..."): void {
    if (this.loadingEl) {
      const loadingText = this.loadingEl.querySelector(".svn-loading-text");
      if (loadingText) {
        loadingText.textContent = text;
      }
      this.loadingEl.removeClass("is-hidden");
    }
  }

  private hideLoading(): void {
    if (this.loadingEl) {
      this.loadingEl.addClass("is-hidden");
    }
  }

  private async openConfirmModal(title: string, message: string, confirmText: string): Promise<boolean> {
    return await new Promise((resolve) => {
      const modal = new Modal(this.app);
      let resolved = false;

      modal.titleEl.setText(title);
      modal.contentEl.createDiv({ cls: "svn-helper-text", text: message });

      const actionRow = modal.contentEl.createDiv({ cls: "svn-modal-actions" });
      const cancelBtn = actionRow.createEl("button", { cls: "svn-btn", text: "取消" });
      cancelBtn.addEventListener("click", () => {
        resolved = true;
        resolve(false);
        modal.close();
      });

      const confirmBtn = actionRow.createEl("button", { cls: "svn-btn is-primary", text: confirmText });
      confirmBtn.addEventListener("click", () => {
        resolved = true;
        resolve(true);
        modal.close();
      });

      modal.onClose = () => {
        if (!resolved) {
          resolve(false);
        }
      };

      modal.open();
    });
  }
}

