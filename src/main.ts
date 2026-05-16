import {
  addIcon,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import { SvnClient } from "./services/svnClient";
import { SvnPanelView } from "./views/SvnPanelView";
import { SvnDiffView } from "./views/SvnDiffView";
import { ObsidianSvnSettingTab } from "./views/ObsidianSvnSettingTab";
import { t } from "./i18n";
import type { ObsidianSvnSettings, SvnDiff } from "./types";

const VIEW_TYPE_SVN_PANEL = "obsidian-svn-panel";
const VIEW_TYPE_SVN_DIFF = "obsidian-svn-diff-view";
const ICON_VAULT_SVN = "vault-svn";
const ICON_VAULT_SVN_SVG = '<path d="M15 59C15 49.1 23.1 41 33 41C36.5 41 39.8 42 42.6 43.7C46.4 36.7 53.8 32 62.2 32C74.3 32 84.1 41.8 84.1 53.9C92.4 54.2 99 61 99 69.3C99 77.8 92.1 84.7 83.6 84.7H33.8C23.4 84.7 15 76.3 15 65.9V59Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></path>';

const DEFAULT_SETTINGS: ObsidianSvnSettings = {
  svnBinaryPath: "svn",
  workingCopyPath: "",
  enableDebugLog: false,
  debugLogMigratedToDefaultOff: false,
  autoRefreshInterval: 0, // 0 表示禁用自动刷新
  autoOpenPanel: false, // 启动时自动打开 SVN 面板
  autoGenerateSummary: true, // 提交时自动生成摘要
  diffTheme: 'light', // 差异显示主题
  defaultExpandFolders: false, // 文件树默认展开状态
  language: "zh", // 显示语言
};

export default class ObsidianSvnPlugin extends Plugin {
  settings: ObsidianSvnSettings = DEFAULT_SETTINGS;
  private diffLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    addIcon(ICON_VAULT_SVN, ICON_VAULT_SVN_SVG);
    this.registerView(VIEW_TYPE_SVN_PANEL, (leaf) => new SvnPanelView(leaf, this));
    this.registerView(VIEW_TYPE_SVN_DIFF, (leaf) => new SvnDiffView(leaf, this.settings.language));

    this.addRibbonIcon(ICON_VAULT_SVN, t("ribbon.openPanel", this.settings.language), () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-panel",
      name: t("cmd.openPanel", this.settings.language),
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "refresh-status",
      name: t("cmd.refreshStatus", this.settings.language),
      callback: () => void this.withView((view) => view.refreshStatus(true))
    });

    this.addCommand({
      id: "update-working-copy",
      name: t("cmd.update", this.settings.language),
      callback: () => void this.withView((view) => view.updateWorkingCopy())
    });

    this.addCommand({
      id: "generate-summary",
      name: t("cmd.generateSummary", this.settings.language),
      callback: () => void this.withView((view) => view.generateSummary())
    });

    this.addCommand({
      id: "commit-staged",
      name: t("cmd.commit", this.settings.language),
      callback: () => void this.withView((view) => view.submitCommit())
    });

    this.addCommand({
      id: "add-active-file",
      name: t("cmd.addFile", this.settings.language),
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("add", path))
    });

    this.addCommand({
      id: "delete-active-file",
      name: t("cmd.deleteFile", this.settings.language),
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("delete", path))
    });

    this.addCommand({
      id: "revert-active-file",
      name: t("cmd.revertFile", this.settings.language),
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("revert", path))
    });

    this.addSettingTab(new ObsidianSvnSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoOpenPanel) {
        void this.activateView();
      }
    });
  }

  onunload(): void {
    this.diffLeaf = null;
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
    return new SvnClient(this.settings.svnBinaryPath, this.settings.workingCopyPath, this.settings.enableDebugLog);
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

  async openDiffInEditor(diff: SvnDiff): Promise<void> {
    const diffLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SVN_DIFF);
    const trackedLeaf = this.diffLeaf;
    const trackedValid = trackedLeaf ? diffLeaves.includes(trackedLeaf) : false;

    this.debugLog("[Vault SVN] openDiffInEditor 开始", {
      filePath: diff.filePath,
      trackedLeafExists: Boolean(trackedLeaf),
      trackedValid,
      diffLeavesCount: diffLeaves.length
    });

    if (!trackedValid) {
      this.diffLeaf = diffLeaves[0] ?? null;
      this.debugLog("[Vault SVN] 重置 diffLeaf 引用", {
        hasReusableLeaf: Boolean(this.diffLeaf)
      });
    }

    const leaf = this.diffLeaf ?? this.app.workspace.getLeaf("tab");
    if (!leaf) {
      this.debugLog("[Vault SVN] 无法获取可用 leaf", { filePath: diff.filePath });
      new Notice("无法打开差异视图");
      return;
    }

    this.diffLeaf = leaf;
    this.debugLog("[Vault SVN] 选定 diff leaf", {
      reusedLeaf: trackedValid || diffLeaves.length > 0
    });

    if (diffLeaves.length > 1) {
      diffLeaves.slice(1).forEach((extraLeaf) => {
        if (extraLeaf !== this.diffLeaf) {
          extraLeaf.detach();
        }
      });
    }

    await leaf.setViewState({ type: VIEW_TYPE_SVN_DIFF, active: true });
    this.debugLog("[Vault SVN] leaf.setViewState 完成", {
      filePath: diff.filePath,
      viewType: leaf.view?.getViewType?.()
    });
    await this.app.workspace.revealLeaf(leaf);
    this.debugLog("[Vault SVN] revealLeaf 完成", { filePath: diff.filePath });

    const view = leaf.view;
    if (view instanceof SvnDiffView) {
      await view.setDiff(diff);
      this.debugLog("[Vault SVN] 差异视图 setDiff 完成", {
        filePath: diff.filePath,
        lineCount: diff.lines.length,
        compareMode: diff.compareMode
      });
      return;
    }

    this.debugLog("[Vault SVN] leaf.view 不是 SvnDiffView", {
      filePath: diff.filePath,
      runtimeViewType: view?.getViewType?.() ?? "unknown"
    });
  }

  async syncAutoRefreshInterval(): Promise<void> {
    const view = this.getPanelView();
    if (!view) {
      return;
    }
    view.updateAutoRefreshTimer();
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
    const view = this.getPanelView();
    if (!(view instanceof SvnPanelView)) {
      return;
    }
    await task(view);
  }

  private getPanelView(): SvnPanelView | null {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_SVN_PANEL)[0];
    const view = leaf?.view;
    if (!(view instanceof SvnPanelView)) {
      return null;
    }
    return view;
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
