import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SvnCredentials, SvnStatusEntry, SvnStatusKind } from "../types";

const execFileAsync = promisify(execFile);

export class SvnClient {
  constructor(
    private readonly svnBinaryPath: string,
    private readonly workingCopyPath: string,
    private readonly credentials?: SvnCredentials
  ) {}

  async ensureAvailable(): Promise<void> {
    await this.run(["--version"]);
  }

  async status(): Promise<SvnStatusEntry[]> {
    const output = await this.run(["status"]);
    const entries = output
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => this.parseStatusLine(line))
      .filter((entry): entry is SvnStatusEntry => entry !== null);

    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }

  async update(): Promise<string> {
    return await this.run(["update"]);
  }

  async add(paths: string[]): Promise<string> {
    if (!paths.length) {
      return "";
    }
    return await this.run(["add", "--force", ...paths]);
  }

  async delete(paths: string[]): Promise<string> {
    if (!paths.length) {
      return "";
    }
    return await this.run(["delete", ...paths]);
  }

  async revert(paths: string[], recursive = false): Promise<string> {
    if (!paths.length) {
      return "";
    }
    const args = ["revert"];
    if (recursive) {
      args.push("-R");
    }
    args.push(...paths);
    return await this.run(args);
  }

  async resolve(paths: string[]): Promise<string> {
    if (!paths.length) {
      return "";
    }
    return await this.run(["resolve", "--accept", "working", ...paths]);
  }

  async commit(paths: string[], message: string): Promise<string> {
    if (!paths.length) {
      throw new Error("未选择任何暂存文件，无法提交。");
    }
    if (!message.trim()) {
      throw new Error("提交备注不能为空。");
    }
    return await this.run(["commit", "-m", message, ...paths]);
  }

  private parseStatusLine(line: string): SvnStatusEntry | null {
    if (line.length < 9) {
      return null;
    }
    const code = line[0];
    const pathPart = line.slice(8).trim();
    if (!pathPart) {
      return null;
    }

    const normalizedPath = pathPart.replace(/\\/g, "/");
    const splitIndex = normalizedPath.lastIndexOf("/");
    const fileName = splitIndex >= 0 ? normalizedPath.slice(splitIndex + 1) : normalizedPath;
    const folderPath = splitIndex >= 0 ? normalizedPath.slice(0, splitIndex) : "";

    const status = this.mapStatus(code);
    if (!status) {
      return null;
    }

    return { path: normalizedPath, fileName, folderPath, status };
  }

  private mapStatus(code: string): SvnStatusKind | null {
    switch (code) {
      case "A":
        return "added";
      case "M":
        return "modified";
      case "D":
        return "deleted";
      case "C":
        return "conflict";
      case "?":
        return "untracked";
      case "!":
        return "missing";
      default:
        return null;
    }
  }

  private async run(args: string[]): Promise<string> {
    const finalArgs = [...args];

    if (this.credentials?.username?.trim()) {
      finalArgs.push("--username", this.credentials.username.trim());
    }
    if (this.credentials?.password?.trim()) {
      finalArgs.push("--password", this.credentials.password.trim());
      finalArgs.push("--non-interactive");
      finalArgs.push("--trust-server-cert-failures", "unknown-ca,cn-mismatch,expired,not-yet-valid,other");
    }

    try {
      const { stdout } = await execFileAsync(this.svnBinaryPath || "svn", finalArgs, {
        cwd: this.workingCopyPath,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      });
      return stdout ?? "";
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string; code?: string | number };
      const message = err.stderr?.trim() || err.message || "SVN 命令执行失败";
      throw new Error(message);
    }
  }
}
