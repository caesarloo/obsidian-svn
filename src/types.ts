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
  username: string;
  persistPassword: boolean;
  savedPassword: string;
  enableDebugLog: boolean;
  debugLogMigratedToDefaultOff: boolean;
}

export interface SvnCredentials {
  username: string;
  password: string;
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
