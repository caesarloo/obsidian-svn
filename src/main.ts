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
import type { ObsidianSvnSettings, SvnDiff } from "./types";

const VIEW_TYPE_SVN_PANEL = "obsidian-svn-panel";
const VIEW_TYPE_SVN_DIFF = "obsidian-svn-diff-view";
const ICON_VAULT_SVN = "vault-svn";
const ICON_VAULT_SVN_SVG = '<path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M8 14l2 2 4-4"></path><path d="M16 14v5"></path><path d="M16 19h3"></path>';

const DEFAULT_SETTINGS: ObsidianSvnSettings = {
  svnBinaryPath: "svn",
  workingCopyPath: "",
  enableDebugLog: false,
  debugLogMigratedToDefaultOff: false,
  autoRefreshInterval: 0, // 0 表示禁用自动刷新
  autoOpenPanel: true, // 启动时自动打开 SVN 面板
  autoGenerateSummary: true, // 提交时自动生成摘要
  diffTheme: 'light', // 差异显示主题
  defaultExpandFolders: false // 文件树默认展开状态
};

export default class ObsidianSvnPlugin extends Plugin {
  settings: ObsidianSvnSettings = DEFAULT_SETTINGS;
  private diffLeaf: WorkspaceLeaf | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    addIcon(ICON_VAULT_SVN, ICON_VAULT_SVN_SVG);
    this.registerView(VIEW_TYPE_SVN_PANEL, (leaf) => new SvnPanelView(leaf, this));
    this.registerView(VIEW_TYPE_SVN_DIFF, (leaf) => new SvnDiffView(leaf));

    this.addRibbonIcon(ICON_VAULT_SVN, "打开 vault svn 面板", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-panel",
      name: "打开 svn 面板",
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "refresh-status",
      name: "刷新 svn 状态",
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
      id: "add-active-file",
      name: "添加当前文件到 svn",
      checkCallback: (checking) => this.withActiveFile(checking, (path) => this.runSingleFileAction("add", path))
    });

    this.addCommand({
      id: "delete-active-file",
      name: "从 svn 删除当前文件",
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

    if (!trackedValid && diffLeaves.length > 0) {
      this.diffLeaf = diffLeaves[0];
    }

    const leaf = this.diffLeaf ?? this.app.workspace.getLeaf("tab");
    if (!leaf) {
      new Notice("无法打开差异视图");
      return;
    }

    this.diffLeaf = leaf;

    if (diffLeaves.length > 1) {
      diffLeaves.slice(1).forEach((extraLeaf) => {
        if (extraLeaf !== this.diffLeaf) {
          extraLeaf.detach();
        }
      });
    }

    await leaf.setViewState({ type: VIEW_TYPE_SVN_DIFF, active: true });
    await this.app.workspace.revealLeaf(leaf);

    const view = leaf.view;
    if (view instanceof SvnDiffView) {
      await view.setDiff(diff);
    }
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
