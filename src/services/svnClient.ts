import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import iconv from "iconv-lite";
import type { SvnStatusEntry, SvnStatusKind, SvnDiff, UpdateResult, UpdateEntry, DiffLine } from "../types";

const execFileAsync = promisify(execFile);
type SupportedEncoding = "utf8" | "gbk" | "gb18030" | "latin1";

export class SvnClient {
  constructor(
    private readonly svnBinaryPath: string,
    private readonly workingCopyPath: string,
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
    // 使用 XML 输出以避免命令行编码导致的文件名乱码问题
    const xml = await this.runRawUtf8(["status", "--xml"]);
    const entries = this.parseStatusXml(xml);
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }

  private async runRawUtf8(args: string[]): Promise<string> {
    const finalArgs = [...args];

    const binaries = await this.resolveBinaryCandidates();
    const safeArgs = this.maskSensitiveArgs(finalArgs);

    for (const binary of binaries) {
      this.debugLog("[Vault SVN] 执行命令 (raw utf8)", { binary, args: safeArgs, cwd: this.workingCopyPath });
      try {
        const { stdout } = await execFileAsync(binary, finalArgs, {
          cwd: this.workingCopyPath,
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'buffer'
        });
        // 明确按 UTF-8 解码，不通过 repair 流程，避免 xml 标签被错误替换
        const text = iconv.decode(stdout, 'utf8');
        this.debugLog("[Vault SVN] 命令执行成功 (raw utf8)", { binary, args: safeArgs, stdoutLength: text.length });
        return text;
      } catch (error) {
        const err = error as Error & { code?: string | number; stderr?: Buffer | string };
        if (err.code === 'ENOENT') {
          console.warn('[Vault SVN] svn 可执行文件未找到 (raw utf8)，尝试下一个候选', { binary, args: safeArgs, message: err.message });
          continue;
        }
        console.error('[Vault SVN] 命令执行失败 (raw utf8)', { binary, args: safeArgs, code: err.code, message: err.message });
        const message = err.message || 'SVN 命令执行失败';
        throw new Error(message);
      }
    }
    throw this.buildBinaryNotFoundError(binaries);
  }

  private parseStatusXml(xml: string): SvnStatusEntry[] {
    const entries: SvnStatusEntry[] = [];
    if (!xml) return entries;
    // 匹配 <entry path="..."> ... <wc-status item="modified" .../>
    const entryRe = /<entry\s+path="([^"]+)">([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(xml))) {
      const pathAttr = m[1];
      const inner = m[2];
      const wcMatch = inner.match(/<wc-status[^>]*item="([^"]+)"/);
      const item = wcMatch ? wcMatch[1] : '';
      const normalizedPath = pathAttr.replace(/\\/g, '/');
      const splitIndex = normalizedPath.lastIndexOf('/');
      const fileName = splitIndex >= 0 ? normalizedPath.slice(splitIndex + 1) : normalizedPath;
      const folderPath = splitIndex >= 0 ? normalizedPath.slice(0, splitIndex) : '';
      const status = this.mapStatusFromItem(item);
      if (status) {
        entries.push({ path: normalizedPath, fileName, folderPath, status });
      }
    }
    return entries;
  }

  private mapStatusFromItem(item: string): SvnStatusKind | null {
    switch (item) {
      case 'added':
      case 'external':
        return 'added';
      case 'modified':
        return 'modified';
      case 'deleted':
        return 'deleted';
      case 'conflicted':
        return 'conflict';
      case 'unversioned':
        return 'untracked';
      case 'missing':
        return 'missing';
      default:
        return null;
    }
  }

  async update(): Promise<UpdateResult> {
    const output = await this.run(["update"]);
    return this.parseUpdateOutput(output);
  }

  async diff(
    filePath: string,
    compareWithPrevious = false,
    updateStatus?: "added" | "modified" | "deleted" | "unchanged"
  ): Promise<SvnDiff> {
    this.validateInput(filePath, `文件路径 "${filePath}"`);

    if (updateStatus === "added") {
      return await this.buildFileContentDiff(filePath);
    }

    let output = "";
    if (compareWithPrevious) {
      if (updateStatus === "deleted") {
        output = await this.diffViaRepositoryUrl(filePath);
      } else {
        try {
          output = await this.runRawUtf8(["diff", "--force", "-r", "PREV:COMMITTED", filePath]);
        } catch {
          try {
            output = await this.runRawUtf8(["diff", "--force", "-r", "0:COMMITTED", filePath]);
          } catch {
            output = await this.diffViaRepositoryUrl(filePath);
          }
        }
      }
    } else {
      try {
        output = await this.runRawUtf8(["diff", "--force", filePath]);
      } catch {
        // 新增/未纳入版本控制文件无法生成 svn diff，降级为直接显示文件内容
        return await this.buildFileContentDiff(filePath);
      }
    }

    return this.parseDiffOutput(filePath, output, compareWithPrevious ? "previous-revision" : "working-copy");
  }

  private async buildFileContentDiff(relativePath: string): Promise<SvnDiff> {
    const fullPath = path.join(this.workingCopyPath, relativePath);
    const fileBuffer = await readFile(fullPath);

    if (this.isLikelyBinaryFile(fileBuffer)) {
      throw new Error(`该文件可能为二进制文件，暂不支持文本预览：${relativePath}`);
    }

    const text = this.decodeBuffer(fileBuffer);
    const lines = text.split(/\r?\n/);

    const parsedLines: DiffLine[] = lines.map((content, index) => ({
      lineNumber: index + 1,
      content,
      type: "unchanged"
    }));

    return {
      filePath: relativePath,
      lines: parsedLines,
      compareMode: "file-content"
    };
  }

  private isLikelyBinaryFile(buffer: Buffer): boolean {
    if (!buffer.length) {
      return false;
    }

    const sampleLength = Math.min(buffer.length, 8000);
    let suspiciousCount = 0;

    for (let i = 0; i < sampleLength; i += 1) {
      const value = buffer[i];
      if (value === 0) {
        return true;
      }
      const isAllowedControl = value === 9 || value === 10 || value === 13;
      if (!isAllowedControl && value < 32) {
        suspiciousCount += 1;
      }
    }

    return suspiciousCount / sampleLength > 0.1;
  }

  private async diffViaRepositoryUrl(path: string): Promise<string> {
    const workingCopyUrl = (await this.runRawUtf8(["info", "--show-item", "url"])).trim().replace(/\/+$/g, "");
    const revisionText = (await this.runRawUtf8(["info", "--show-item", "revision"])).trim();
    const committedRevision = Number.parseInt(revisionText, 10);

    if (!Number.isFinite(committedRevision) || committedRevision <= 0) {
      throw new Error(`无法解析当前工作副本版本号：${revisionText}`);
    }

    const previousRevision = Math.max(committedRevision - 1, 0);
    const pegRevision = Math.max(previousRevision, 1);
    const encodedPath = path
      .replace(/\\/g, "/")
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const fileUrl = `${workingCopyUrl}/${encodedPath}`;

    return await this.runRawUtf8([
      "diff",
      "--force",
      "-r",
      `${previousRevision}:${committedRevision}`,
      `${fileUrl}@${pegRevision}`
    ]);
  }

  private parseUpdateOutput(output: string): UpdateResult {
    const lines = output.split(/\r?\n/).filter(Boolean);
    const entries: UpdateEntry[] = [];
    const summary = {
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

  private parseDiffOutput(filePath: string, output: string, compareMode: "working-copy" | "previous-revision"): SvnDiff {
    const lines = output.split(/\r?\n/);
    const diffLines: DiffLine[] = [];
    const rawDiffLines: DiffLine[] = [];
    let currentLineNumber = 1;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }

      if (line.startsWith('Index: ') || line.startsWith('===')) {
        inHunk = false;
        continue;
      }

      if (line.startsWith('---') || line.startsWith('+++')) {
        continue;
      }

      if (!inHunk) {
        continue;
      }

      if (line.startsWith('+')) {
        const content = this.repairLikelyUtf8Mojibake(line.substring(1));
        const parsed: DiffLine = {
          lineNumber: currentLineNumber,
          content,
          type: 'added'
        };
        diffLines.push(parsed);
        rawDiffLines.push(parsed);
        currentLineNumber++;
      } else if (line.startsWith('-')) {
        const content = this.repairLikelyUtf8Mojibake(line.substring(1));
        const parsed: DiffLine = {
          lineNumber: currentLineNumber,
          content,
          type: 'deleted'
        };
        diffLines.push(parsed);
        rawDiffLines.push(parsed);
      } else if (line.startsWith(' ')) {
        const content = this.repairLikelyUtf8Mojibake(line.substring(1));
        const parsed: DiffLine = {
          lineNumber: currentLineNumber,
          content,
          type: 'unchanged'
        };
        diffLines.push(parsed);
        rawDiffLines.push(parsed);
        currentLineNumber++;
      }
    }

    const normalizedDiffLines = this.normalizeDiffLines(diffLines);
    const hasRawChanges = rawDiffLines.some((line) => line.type === "added" || line.type === "deleted");
    const hasNormalizedChanges = normalizedDiffLines.some((line) => line.type === "added" || line.type === "deleted");

    if (hasRawChanges && !hasNormalizedChanges) {
      this.debugLog("[Vault SVN] 差异归一化后无实质变更，忽略纯格式差异", {
        filePath,
        rawLineCount: rawDiffLines.length,
        normalizedLineCount: normalizedDiffLines.length
      });
    }

    return {
      filePath,
      lines: normalizedDiffLines,
      compareMode
    };
  }

  private normalizeDiffLines(lines: DiffLine[]): DiffLine[] {
    const result: DiffLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];
      const next = lines[i + 1];

      if ((current.type === "added" || current.type === "deleted") && this.isMarkdownSeparatorLine(current.content)) {
        continue;
      }

      if (this.isWhitespaceOnlyLine(current) && (current.type === "added" || current.type === "deleted")) {
        continue;
      }

      if (
        current.type === "deleted" &&
        next &&
        next.type === "added" &&
        this.normalizeForWhitespaceCompare(current.content) === this.normalizeForWhitespaceCompare(next.content)
      ) {
        result.push({
          lineNumber: current.lineNumber,
          content: next.content,
          type: "unchanged"
        });
        i += 1;
        continue;
      }

      result.push(current);
    }

    return this.cancelEquivalentDiffLines(result);
  }

  private cancelEquivalentDiffLines(lines: DiffLine[]): DiffLine[] {
    const deletedMap = new Map<string, number[]>();
    const addedMap = new Map<string, number[]>();
    const cancelled = new Set<number>();

    lines.forEach((line, index) => {
      if (line.type !== "added" && line.type !== "deleted") {
        return;
      }

      const key = this.normalizeForWhitespaceCompare(line.content);
      if (!key) {
        return;
      }

      if (line.type === "deleted") {
        const queue = deletedMap.get(key) ?? [];
        queue.push(index);
        deletedMap.set(key, queue);
        return;
      }

      const queue = addedMap.get(key) ?? [];
      queue.push(index);
      addedMap.set(key, queue);
    });

    deletedMap.forEach((deletedIndexes, key) => {
      const addedIndexes = addedMap.get(key) ?? [];
      const pairCount = Math.min(deletedIndexes.length, addedIndexes.length);
      for (let i = 0; i < pairCount; i++) {
        cancelled.add(deletedIndexes[i]);
        cancelled.add(addedIndexes[i]);
      }
    });

    return lines.filter((_, index) => !cancelled.has(index));
  }

  private normalizeForWhitespaceCompare(content: string): string {
    return content.replace(/\s+/g, "");
  }

  private repairLikelyUtf8Mojibake(content: string): string {
    if (!content) {
      return content;
    }

    const mojibakeHint = /[\u00C0-\u00FF]{2,}|(?:Ã.|Â.|æ.|ç.|å.|ä.|é.|è.|ï.)/.test(content);
    if (!mojibakeHint) {
      return content;
    }

    const repaired = this.safeRecode(content, "latin1", "utf8");
    if (!repaired || repaired === content) {
      return content;
    }

    const originalCjk = this.countCjk(content);
    const repairedCjk = this.countCjk(repaired);
    const originalReplacement = this.countReplacementChars(content);
    const repairedReplacement = this.countReplacementChars(repaired);

    if (repairedCjk > originalCjk && repairedReplacement <= originalReplacement) {
      return repaired;
    }

    return content;
  }

  private isMarkdownSeparatorLine(content: string): boolean {
    const trimmed = content.trim();
    return trimmed === "---";
  }

  private isWhitespaceOnlyLine(line: DiffLine): boolean {
    return this.normalizeForWhitespaceCompare(line.content).length === 0;
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
    this.debugLog("[Vault SVN] 提交校验开始", {
      stagedCount: paths.length,
      messageLength: message.length,
      messagePreview: message.slice(0, 120)
    });

    try {
      this.validatePaths(paths);
      this.validateCommitMessage(message);
      this.debugLog("[Vault SVN] 提交校验通过", {
        stagedCount: paths.length,
        messageLength: message.length
      });
    } catch (error) {
      this.debugLog("[Vault SVN] 提交校验失败", {
        stagedCount: paths.length,
        messageLength: message.length,
        reason: (error as Error).message
      });
      throw error;
    }

    this.debugLog("[Vault SVN] 提交参数", {
      stagedCount: paths.length,
      stagedPaths: paths,
      messageLength: message.length,
      messagePreview: message.slice(0, 200)
    });
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

    this.debugLog("[Vault SVN] 解析状态行", { line, code, pathPart, pathPartLength: pathPart.length });

    // 若 pathPart 可能含有 mojibake，则尝试修复单行路径（降低乱码文件名出现概率）
    let repairedPathPart = pathPart;
    if (this.hasMojibakeHint(pathPart) || this.countReplacementChars(pathPart) > 0) {
      const repaired = this.repairMojibakeLines(pathPart);
      if (repaired.changedCount > 0) {
        repairedPathPart = repaired.text;
      } else {
        // 走额外尝试链，挑选 CJK 最多且替换字符最少的结果
        const attempts = [
          this.safeRecode(pathPart, 'gbk', 'utf8'),
          this.safeRecode(pathPart, 'utf8', 'gbk'),
          this.safeRecode(pathPart, 'gb18030', 'utf8'),
          this.safeRecode(pathPart, 'utf8', 'gb18030')
        ];
        let best = repairedPathPart;
        let bestScore = this.countCjk(best) - this.countReplacementChars(best) * 5;
        for (const a of attempts) {
          const score = this.countCjk(a) - this.countReplacementChars(a) * 5;
          if (score > bestScore) {
            bestScore = score;
            best = a;
          }
        }
        repairedPathPart = best;
      }
      if (repairedPathPart !== pathPart) {
        this.debugLog('[Vault SVN] 解析状态行 - 路径修复', { original: pathPart, repaired: repairedPathPart });
      }
    }

    const normalizedPath = repairedPathPart.replace(/\\/g, "/");
    const splitIndex = normalizedPath.lastIndexOf("/");
    const fileName = splitIndex >= 0 ? normalizedPath.slice(splitIndex + 1) : normalizedPath;
    const folderPath = splitIndex >= 0 ? normalizedPath.slice(0, splitIndex) : "";

    this.debugLog("[Vault SVN] 解析结果", { normalizedPath, fileName, folderPath });

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
        this.debugLog("[Vault SVN] 输入校验拦截", {
          context,
          pattern: pattern.toString(),
          preview: input.slice(0, 120)
        });
        throw new Error(`输入验证失败：${context} 包含危险字符`);
      }
    }
  }

  private validatePaths(paths: string[]): void {
    for (const path of paths) {
      this.validateInput(path, `文件路径 "${path}"`);
    }
  }

  private validateCommitMessage(message: string): void {
    if (message.includes("\u0000")) {
      this.debugLog("[Vault SVN] 提交备注校验拦截", {
        reason: "包含空字符",
        messageLength: message.length,
        messagePreview: message.slice(0, 120)
      });
      throw new Error("输入验证失败：提交备注包含非法字符");
    }

    if (this.hasInvalidControlChars(message, false)) {
      this.debugLog("[Vault SVN] 提交备注校验拦截", {
        reason: "包含非法控制字符",
        messageLength: message.length,
        messagePreview: message.slice(0, 120)
      });
      throw new Error("输入验证失败：提交备注包含非法控制字符");
    }

    this.debugLog("[Vault SVN] 提交备注校验通过", {
      messageLength: message.length,
      hasLineBreak: /\r|\n/.test(message)
    });
  }

  private decodeBuffer(input: Buffer | string | undefined): string {
    if (input === undefined) {
      return "";
    }
    if (typeof input === "string") {
      return input;
    }

    const utf8 = iconv.decode(input, "utf8");
    const gbk = iconv.decode(input, "gbk");
    const gb18030 = iconv.decode(input, "gb18030");
    const latin1 = iconv.decode(input, "latin1");

    const candidates: Array<{
      source: string;
      text: string;
      score: number;
      replacementCount: number;
      cjkCount: number;
      sample: string;
    }> = [
      { source: "utf8", text: utf8, score: this.getDecodeScore(utf8), replacementCount: this.countReplacementChars(utf8), cjkCount: this.countCjk(utf8), sample: utf8.slice(0, 60) },
      { source: "gbk", text: gbk, score: this.getDecodeScore(gbk), replacementCount: this.countReplacementChars(gbk), cjkCount: this.countCjk(gbk), sample: gbk.slice(0, 60) },
      { source: "gb18030", text: gb18030, score: this.getDecodeScore(gb18030), replacementCount: this.countReplacementChars(gb18030), cjkCount: this.countCjk(gb18030), sample: gb18030.slice(0, 60) },
      { source: "latin1", text: latin1, score: this.getDecodeScore(latin1), replacementCount: this.countReplacementChars(latin1), cjkCount: this.countCjk(latin1), sample: latin1.slice(0, 60) },
      { source: "repair:gbk->utf8", text: this.safeRecode(gbk, "gbk", "utf8"), score: 0, replacementCount: 0, cjkCount: 0, sample: "" },
      { source: "repair:gb18030->utf8", text: this.safeRecode(gb18030, "gb18030", "utf8"), score: 0, replacementCount: 0, cjkCount: 0, sample: "" }
    ];

    // 计算修复链的分数与统计
    for (const candidate of candidates) {
      if (candidate.source.startsWith("repair:")) {
        candidate.score = this.getDecodeScore(candidate.text);
        candidate.replacementCount = this.countReplacementChars(candidate.text);
        candidate.cjkCount = this.countCjk(candidate.text);
        candidate.sample = candidate.text.slice(0, 60);
      }
    }

    // 去重相同文本
    const uniqueCandidates = candidates.filter((candidate, index, array) => array.findIndex((other) => other.text === candidate.text) === index);

    // 优先 replacementCount 最低的候选，再在这些候选中按 cjkCount 降序选择
    const minReplacement = Math.min(...uniqueCandidates.map(c => c.replacementCount));
    const filtered = uniqueCandidates.filter(c => c.replacementCount === minReplacement);
    filtered.sort((a, b) => b.cjkCount - a.cjkCount || a.score - b.score);
    // 如果候选集中包含 utf8，则优先选择 utf8（在替换字符相同的已筛选集合中）
    const utf8Preferred = filtered.find(c => c.source === 'utf8');
    const best = utf8Preferred ?? filtered[0] ?? uniqueCandidates[0];

    let repaired = this.repairMojibakeLines(best.text);

    // 若最佳结果仍有 mojibake 或替换字符，进行全缓冲区修复尝试（跨多种编码组合）
    const repairedReplacementCount = this.countReplacementChars(repaired.text);
    if (this.hasMojibakeHint(repaired.text) || repairedReplacementCount > 0) {
      const pool: Array<{ name: SupportedEncoding; text: string }> = [
        { name: 'utf8', text: utf8 },
        { name: 'gbk', text: gbk },
        { name: 'gb18030', text: gb18030 },
        { name: 'latin1', text: latin1 }
      ];
      const fullCandidates: Array<{ source: string; text: string; replacement: number; score: number; cjk: number }> = [];
      // include originals
      for (const p of pool) {
        fullCandidates.push({ source: p.name, text: p.text, replacement: this.countReplacementChars(p.text), score: this.getDecodeScore(p.text), cjk: this.countCjk(p.text) });
      }
      // try pairwise recoding
      for (const from of pool) {
        for (const to of pool) {
          if (from.name === to.name) continue;
          try {
            const t = this.safeRecode(from.text, from.name, to.name);
            fullCandidates.push({ source: `${from.name}->${to.name}`, text: t, replacement: this.countReplacementChars(t), score: this.getDecodeScore(t), cjk: this.countCjk(t) });
          } catch {
            // ignore
          }
        }
      }
      // choose best: minimal replacement, then minimal score, then max cjk
      fullCandidates.sort((a, b) => {
        if (a.replacement !== b.replacement) return a.replacement - b.replacement;
        if (a.score !== b.score) return a.score - b.score;
        return b.cjk - a.cjk;
      });
      const fullBest = fullCandidates[0];
      if (fullBest && (fullBest.replacement < repairedReplacementCount || this.countCjk(fullBest.text) > this.countCjk(repaired.text))) {
        const secondPass = this.repairMojibakeLines(fullBest.text);
        this.debugLog('[Vault SVN] 全缓冲区修复选择', { fullBestSource: fullBest.source, fullBestReplacement: fullBest.replacement, fullBestCjk: fullBest.cjk, secondPassChanged: secondPass.changedCount });
        repaired = secondPass;
      }
    }

    // include raw buffer hex sample for debugging
    const rawHexSample = input.subarray(0, 120).toString('hex');

    this.debugLog("[Vault SVN] 编码解码来源", {
      selectedSource: best.source,
      selectedScore: best.score,
      replacementCounts: uniqueCandidates.map(c => ({ source: c.source, replacementCount: c.replacementCount })),
      cjkCounts: uniqueCandidates.map(c => ({ source: c.source, cjkCount: c.cjkCount })),
      candidates: uniqueCandidates.map(c => c.source),
      debugSamples: uniqueCandidates.map(c => ({ source: c.source, sample: c.sample })),
      rawHexSample,
      lineRepairCount: repaired.changedCount,
      repairedSamples: repaired.samples,
      outputPreview: repaired.text.slice(0, 120)
    });

    return repaired.text;
  }

  private repairMojibakeLines(text: string): { text: string; changedCount: number; samples: Array<{ before: string; after: string }> } {
    if (!text) {
      return { text, changedCount: 0, samples: [] };
    }

    const lineBreak = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    let changedCount = 0;
    const samples: Array<{ before: string; after: string }> = [];

    const repairedLines = lines.map((line) => {
      if (!this.hasMojibakeHint(line) && this.countReplacementChars(line) === 0) {
        return line;
      }

      const attempts: Array<{ from: SupportedEncoding; to: SupportedEncoding }> = [
        { from: 'gbk', to: 'utf8' },
        { from: 'gb18030', to: 'utf8' },
        { from: 'latin1', to: 'utf8' }
      ];

      const candidates = attempts.map((a) => {
        const text = this.safeRecode(line, a.from, a.to);
        return {
          text,
          from: a.from,
          to: a.to,
          score: this.getDecodeScore(text),
          cjk: this.countCjk(text),
          replacement: this.countReplacementChars(text)
        };
      });

      // include original as candidate too for fair comparison
      candidates.push({ text: line, from: 'utf8', to: 'utf8', score: this.getDecodeScore(line), cjk: this.countCjk(line), replacement: this.countReplacementChars(line) });

      // choose candidate with minimal score; tie-breaker: maximal cjk, minimal replacement
      candidates.sort((a, b) => {
        if (a.replacement !== b.replacement) return a.replacement - b.replacement;
        if (a.score !== b.score) return a.score - b.score;
        return b.cjk - a.cjk;
      });

      const best = candidates[0];
      const originalScore = this.getDecodeScore(line);
      const originalCjk = this.countCjk(line);

      if ((best.text !== line) && (best.score <= originalScore || best.cjk >= originalCjk)) {
        changedCount += 1;
        if (samples.length < 3) {
          samples.push({ before: line.slice(0, 120), after: best.text.slice(0, 120) });
        }
        return best.text;
      }

      return line;
    });

    return {
      text: repairedLines.join(lineBreak),
      changedCount,
      samples
    };
  }

  private safeRecode(text: string, from: "utf8" | "gbk" | "gb18030" | "latin1", to: "utf8" | "gbk" | "gb18030" | "latin1"): string {
    try {
      return iconv.decode(iconv.encode(text, from), to);
    } catch {
      return text;
    }
  }

  private getDecodeScore(text: string): number {
    const replacementCount = this.countReplacementChars(text);
    const controlCount = this.countInvalidControlChars(text, true);
    const mojibakeHints = (text.match(/[ÃÂÐÊÔ鍙鍚鍏闇璇璐锛锟閭闂]/g) ?? []).length;
    return replacementCount * 20 + controlCount * 5 + mojibakeHints * 3;
  }

  private hasInvalidControlChars(text: string, includeNull: boolean): boolean {
    return this.countInvalidControlChars(text, includeNull) > 0;
  }

  private countInvalidControlChars(text: string, includeNull: boolean): number {
    let count = 0;
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code === 0 && includeNull) {
        count += 1;
        continue;
      }
      if ((code >= 1 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) {
        count += 1;
      }
    }
    return count;
  }

  private countReplacementChars(text: string): number {
    return (text.match(/\uFFFD/g) ?? []).length;
  }

  private hasMojibakeHint(text: string): boolean {
    return /(?:璐|闇€|鍙|閭|鎴|锛�|锟�|姹|鑳藉姏|閭欢)/.test(text);
  }

  private countCjk(text: string): number {
    return (text.match(/[\u4E00-\u9FFF]/g) ?? []).length;
  }

  private async run(args: string[]): Promise<string> {
    const finalArgs = [...args];

    const safeArgs = this.maskSensitiveArgs(finalArgs);
    const binaries = await this.resolveBinaryCandidates();

    for (const binary of binaries) {
      this.debugLog("[Vault SVN] 执行命令", {
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
        const decodedOutput = this.decodeBuffer(stdout as Buffer | string | undefined);
        
        this.debugLog("[Vault SVN] 命令执行成功", {
          binary,
          args: safeArgs,
          stdoutLength: decodedOutput.length,
          stdoutSample: decodedOutput.substring(0, 500) // 显示前500个字符的输出样本
        });
        return decodedOutput;
      } catch (error) {
        const err = error as Error & { stderr?: Buffer | string; stdout?: Buffer | string; code?: string | number };

        if (err.code === "ENOENT") {
          console.warn("[Vault SVN] svn 可执行文件未找到，尝试下一个候选", {
            binary,
            args: safeArgs,
            message: err.message
          });
          continue;
        }

        console.error("[Vault SVN] 命令执行失败", {
          binary,
          args: safeArgs,
          code: err.code,
          stderr: this.decodeBuffer(err.stderr),
          stdout: this.decodeBuffer(err.stdout),
          message: err.message,
          stack: err.stack
        });
        const message = this.decodeBuffer(err.stderr).trim() || err.message || "SVN 命令执行失败";
        throw new Error(message);
      }
    }

    console.error("[Vault SVN] 所有 svn 候选路径均不可用", {
      binaries,
      args: safeArgs,
      cwd: this.workingCopyPath
    });
    throw this.buildBinaryNotFoundError(binaries);
  }
}
