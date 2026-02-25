import {
  App,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf
} from "obsidian";
import { SvnClient } from "./services/svnClient";
import { generateSummaryWithFallback } from "./services/summaryService";
import { encryptPassword, decryptPassword } from "./services/cryptoService";
import { SvnPanelView } from "./views/SvnPanelView";
import { RepositoryConfigModal } from "./views/RepositoryConfigModal";
import { ObsidianSvnSettingTab } from "./views/ObsidianSvnSettingTab";
import type { ObsidianSvnSettings, SvnCredentials } from "./types";

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
  debugLogMigratedToDefaultOff: false,
  autoRefreshInterval: 0, // 0 表示禁用自动刷新
  autoOpenPanel: true, // 启动时自动打开 SVN 面板
  autoGenerateSummary: true, // 提交时自动生成摘要
  diffTheme: 'light', // 差异显示主题
  defaultExpandFolders: false // 文件树默认展开状态
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
    const password = this.settings.persistPassword ? decryptPassword(this.settings.savedPassword) : this.sessionPassword;
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
