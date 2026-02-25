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
}

export interface SvnCredentials {
  username: string;
  password: string;
}
