import type { Plugin } from "obsidian";
import type { SvnClient, SvnStatusEntry, SvnDiff } from "@caesarloo/simple-svn-client";

export type {
  SvnStatusKind,
  SvnStatusEntry,
  DiffLine,
  SvnDiff,
  UpdateEntry,
  UpdateResult
} from "@caesarloo/simple-svn-client";

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
