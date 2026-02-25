import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import iconv from "iconv-lite";
import type { SvnCredentials, SvnStatusEntry, SvnStatusKind, SvnDiff, UpdateResult, UpdateEntry } from "../types";

const execFileAsync = promisify(execFile);

export class SvnClient {
  constructor(
    private readonly svnBinaryPath: string,
    private readonly workingCopyPath: string,
    private readonly credentials?: SvnCredentials,
    private readonly enableDebugLog = true
  ) {}

  private debugLog(message: string, details?: unknown): void {
    if (!this.enableDebugLog) {
      return;
    }
    if (details === undefined) {
      console.debug(message);
      return;
    }
    console.debug(message, details);
  }

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

  async update(): Promise<UpdateResult> {
    const output = await this.run(["update"]);
    return this.parseUpdateOutput(output);
  }

  async diff(path: string): Promise<SvnDiff> {
    this.validateInput(path, `文件路径 "${path}"`);
    const output = await this.run(["diff", path]);
    return this.parseDiffOutput(path, output);
  }

  private parseUpdateOutput(output: string): UpdateResult {
    const lines = output.split(/\r?\n/).filter(Boolean);
    const entries: UpdateEntry[] = [];
    let summary = {
      total: 0,
      added: 0,
      modified: 0,
      deleted: 0,
      totalSize: 0
    };

    for (const line of lines) {
      const match = line.match(/^(A|U|D)\s+(.+)$/);
      if (match) {
        const [, status, path] = match;
        let statusType: UpdateEntry['status'] = 'unchanged';
        
        switch (status) {
          case 'A':
            statusType = 'added';
            summary.added++;
            break;
          case 'U':
            statusType = 'modified';
            summary.modified++;
            break;
          case 'D':
            statusType = 'deleted';
            summary.deleted++;
            break;
        }

        entries.push({
          path: path.replace(/\\/g, "/"),
          status: statusType
        });
      }
    }

    summary.total = entries.length;
    return { entries, summary };
  }

  private parseDiffOutput(filePath: string, output: string): SvnDiff {
    const lines = output.split(/\r?\n/);
    const diffLines: DiffLine[] = [];
    let currentLineNumber = 1;

    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        continue;
      }

      if (line.startsWith('+')) {
        diffLines.push({
          lineNumber: currentLineNumber,
          content: line.substring(1),
          type: 'added'
        });
        currentLineNumber++;
      } else if (line.startsWith('-')) {
        diffLines.push({
          lineNumber: currentLineNumber,
          content: line.substring(1),
          type: 'deleted'
        });
      } else if (line.startsWith(' ')) {
        diffLines.push({
          lineNumber: currentLineNumber,
          content: line.substring(1),
          type: 'unchanged'
        });
        currentLineNumber++;
      }
    }

    return {
      filePath,
      lines: diffLines
    };
  }

  async add(paths: string[]): Promise<string> {
    if (!paths.length) {
      return "";
    }
    this.validatePaths(paths);
    return await this.run(["add", "--force", ...paths]);
  }

  async delete(paths: string[]): Promise<string> {
    if (!paths.length) {
      return "";
    }
    this.validatePaths(paths);
    return await this.run(["delete", ...paths]);
  }

  async revert(paths: string[], recursive = false): Promise<string> {
    if (!paths.length) {
      return "";
    }
    this.validatePaths(paths);
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
    this.validatePaths(paths);
    return await this.run(["resolve", "--accept", "working", ...paths]);
  }

  async commit(paths: string[], message: string): Promise<string> {
    if (!paths.length) {
      throw new Error("未选择任何暂存文件，无法提交。");
    }
    if (!message.trim()) {
      throw new Error("提交备注不能为空。");
    }
    this.validatePaths(paths);
    this.validateInput(message, "提交备注");
    return await this.run(["commit", "-m", message, ...paths]);
  }

  private maskSensitiveArgs(args: string[]): string[] {
    const safeArgs = [...args];
    const passwordIndex = safeArgs.indexOf("--password");
    if (passwordIndex >= 0 && passwordIndex + 1 < safeArgs.length) {
      safeArgs[passwordIndex + 1] = "******";
    }
    return safeArgs;
  }

  private getBinaryCandidates(): string[] {
    const configured = this.svnBinaryPath.trim();
    const candidates: string[] = [];

    if (configured) {
      candidates.push(configured);
    }

    if (!configured || configured.toLowerCase() !== "svn") {
      candidates.push("svn");
    }

    if (process.platform === "win32") {
      candidates.push(
        "C:/Program Files/TortoiseSVN/bin/svn.exe",
        "C:/Program Files/SlikSvn/bin/svn.exe",
        "C:/Program Files/VisualSVN Server/bin/svn.exe",
        "C:/Program Files (x86)/SlikSvn/bin/svn.exe",
        "C:/Program Files (x86)/CollabNet Subversion Client/svn.exe"
      );
    }

    return [...new Set(candidates)];
  }

  private async discoverFromSystemPath(): Promise<string[]> {
    try {
      if (process.platform === "win32") {
        const { stdout } = await execFileAsync("where", ["svn"], {
          windowsHide: true,
          maxBuffer: 1024 * 1024
        });
        return (stdout ?? "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
      }

      const { stdout } = await execFileAsync("which", ["svn"], {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      return (stdout ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private isCommandName(binary: string): boolean {
    return !binary.includes("/") && !binary.includes("\\") && !binary.includes(":");
  }

  private async existsExecutable(binary: string): Promise<boolean> {
    if (this.isCommandName(binary)) {
      return true;
    }

    const normalized = binary.replace(/\\/g, "/");
    if (!path.isAbsolute(normalized)) {
      return false;
    }

    try {
      await access(normalized, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async resolveBinaryCandidates(): Promise<string[]> {
    const baseCandidates = this.getBinaryCandidates();
    const discovered = await this.discoverFromSystemPath();
    const merged = [...baseCandidates, ...discovered];

    const deduped = merged.filter((item, index) => {
      const normalized = process.platform === "win32" ? item.toLowerCase() : item;
      return merged.findIndex((other) => (process.platform === "win32" ? other.toLowerCase() : other) === normalized) === index;
    });

    const available: string[] = [];
    for (const candidate of deduped) {
      if (await this.existsExecutable(candidate)) {
        available.push(candidate);
      }
    }

    return available;
  }

  private buildBinaryNotFoundError(candidates: string[]): Error {
    const message = [
      "未找到 svn 可执行文件。",
      `已尝试：${candidates.join(" | ")}`,
      "请在插件“设置”中将“SVN 可执行文件”配置为 svn.exe 的绝对路径（例如 C:/Program Files/TortoiseSVN/bin/svn.exe）。",
      "若安装 TortoiseSVN，请在安装时勾选“Command line client tools”组件。"
    ].join(" ");
    return new Error(message);
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

    this.debugLog("[Obsidian SVN] 解析状态行", { line, code, pathPart, pathPartLength: pathPart.length });

    const normalizedPath = pathPart.replace(/\\/g, "/");
    const splitIndex = normalizedPath.lastIndexOf("/");
    const fileName = splitIndex >= 0 ? normalizedPath.slice(splitIndex + 1) : normalizedPath;
    const folderPath = splitIndex >= 0 ? normalizedPath.slice(0, splitIndex) : "";

    this.debugLog("[Obsidian SVN] 解析结果", { normalizedPath, fileName, folderPath });

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

  private validateInput(input: string, context: string): void {
    if (!input) {
      return;
    }
    
    // 检查是否包含危险字符或命令注入尝试
    const dangerousPatterns = [
      /[;&|`$<>\n\r]/g, //  shell 元字符
      /\.\.\//g, // 路径遍历
      /\/\*|\*\//g, // 注释
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        throw new Error(`输入验证失败：${context} 包含危险字符`);
      }
    }
  }

  private validatePaths(paths: string[]): void {
    for (const path of paths) {
      this.validateInput(path, `文件路径 "${path}"`);
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

    const safeArgs = this.maskSensitiveArgs(finalArgs);
    const binaries = await this.resolveBinaryCandidates();

    for (const binary of binaries) {
      this.debugLog("[Obsidian SVN] 执行命令", {
        binary,
        args: safeArgs,
        cwd: this.workingCopyPath
      });

      try {
        const { stdout } = await execFileAsync(binary, finalArgs, {
          cwd: this.workingCopyPath,
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'buffer' // 以 Buffer 形式返回输出
        });
        
        // 尝试用不同的编码解码输出
        let decodedOutput: string;
        try {
          // 首先尝试 GBK 编码（Windows 中文系统的默认编码）
          decodedOutput = iconv.decode(stdout, 'gbk');
        } catch {
          // 如果失败，尝试 UTF-8
          decodedOutput = iconv.decode(stdout, 'utf8');
        }
        
        this.debugLog("[Obsidian SVN] 命令执行成功", {
          binary,
          args: safeArgs,
          stdoutLength: decodedOutput.length,
          stdoutSample: decodedOutput.substring(0, 500) // 显示前500个字符的输出样本
        });
        return decodedOutput;
      } catch (error) {
        const err = error as Error & { stderr?: string; stdout?: string; code?: string | number };

        if (err.code === "ENOENT") {
          console.warn("[Obsidian SVN] svn 可执行文件未找到，尝试下一个候选", {
            binary,
            args: safeArgs,
            message: err.message
          });
          continue;
        }

        console.error("[Obsidian SVN] 命令执行失败", {
          binary,
          args: safeArgs,
          code: err.code,
          stderr: err.stderr,
          stdout: err.stdout,
          message: err.message,
          stack: err.stack
        });
        const message = err.stderr?.trim() || err.message || "SVN 命令执行失败";
        throw new Error(message);
      }
    }

    console.error("[Obsidian SVN] 所有 svn 候选路径均不可用", {
      binaries,
      args: safeArgs,
      cwd: this.workingCopyPath
    });
    throw this.buildBinaryNotFoundError(binaries);
  }
}
