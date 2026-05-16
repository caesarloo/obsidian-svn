import type { Plugin } from "obsidian";
import type { SvnClient } from "./services/svnClient";

export type SvnStatusKind = "added" | "modified" | "deleted" | "conflict" | "untracked" | "missing";

export interface SvnStatusEntry {
  path: string;
  fileName: string;
  folderPath: string;
  status: SvnStatusKind;
}

export interface GroupedStatus {
  rootFiles: SvnStatusEntry[];
  folders: Map<string, SvnStatusEntry[]>;
}

export interface ObsidianSvnSettings {
  svnBinaryPath: string;
  workingCopyPath: string;
  enableDebugLog: boolean;
  debugLogMigratedToDefaultOff: boolean;
  autoRefreshInterval: number; // 自动刷新间隔（秒）
  autoOpenPanel: boolean; // 启动时自动打开 SVN 面板
  autoGenerateSummary: boolean; // 提交时自动生成摘要
  diffTheme: 'light' | 'dark'; // 差异显示主题
  defaultExpandFolders: boolean; // 文件树默认展开状态
  language: 'zh' | 'en'; // 显示语言
}

// 插件类型定义
export interface ObsidianSvnPlugin extends Plugin {
  settings: ObsidianSvnSettings;
  getSvnClient(): SvnClient;
  debugLog(message: string, details?: unknown): void;
  openDiffInEditor(diff: SvnDiff): Promise<void>;
  syncAutoRefreshInterval(): Promise<void>;
  saveSettings(): Promise<void>;
}

// 文件差异相关类型
export interface DiffLine {
  lineNumber: number;
  content: string;
  type: "added" | "deleted" | "unchanged";
}

export interface SvnDiff {
  filePath: string;
  lines: DiffLine[];
  compareMode?: "working-copy" | "previous-revision" | "file-content";
}

// 更新反馈相关类型
export interface UpdateEntry {
  path: string;
  status: "added" | "modified" | "deleted" | "unchanged";
  size?: number;
}

export interface UpdateResult {
  entries: UpdateEntry[];
  summary: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    totalSize?: number;
  };
}
