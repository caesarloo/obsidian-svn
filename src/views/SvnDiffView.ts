import { ItemView, WorkspaceLeaf } from "obsidian";
import type { SvnDiff } from "../types";
import { t, type Lang } from "../i18n";

export class SvnDiffView extends ItemView {
  private currentDiff: SvnDiff | null = null;
  private currentPage = 1;
  private readonly pageSize = 400;
  private displayText: string;

  constructor(leaf: WorkspaceLeaf, private readonly lang: Lang) {
    super(leaf);
    this.displayText = t("diff.title", this.lang);
  }

  getViewType(): string {
    return "obsidian-svn-diff-view";
  }

  getDisplayText(): string {
    return this.displayText;
  }

  onOpen(): Promise<void> {
    this.render();
    return Promise.resolve();
  }

  getState(): Record<string, unknown> {
    return {
      title: this.displayText,
      path: this.currentDiff?.filePath ?? ""
    };
  }

  setState(state: unknown): Promise<void> {
    const value = state as { title?: string } | undefined;
    if (value?.title) {
      this.displayText = value.title;
    }
    this.render();
    return Promise.resolve();
  }

  async setDiff(diff: SvnDiff): Promise<void> {
    this.currentDiff = diff;
    this.currentPage = 1;
    const fileName = diff.filePath.split("/").pop() || diff.filePath;
    const modeLabel = this.getModeLabel(diff.compareMode);
    this.displayText = t("diff.tabTitle", this.lang, { mode: modeLabel, file: fileName });
    await this.syncLeafState();
    this.render();
  }

  private getModeLabel(mode: SvnDiff["compareMode"]): string {
    if (mode === "previous-revision") {
      return t("diff.modePrevious", this.lang);
    }
    if (mode === "file-content") {
      return t("diff.modeFileContent", this.lang);
    }
    return t("diff.modeLocal", this.lang);
  }

  private async syncLeafState(): Promise<void> {
    const currentState = this.leaf.getViewState();
    await this.leaf.setViewState({
      ...currentState,
      type: this.getViewType(),
      state: {
        ...(currentState.state ?? {}),
        title: this.displayText
      }
    });
  }

  private render(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("svn-diff-view-root");

    const header = root.createDiv({ cls: "svn-diff-view-header" });
    const modeLabel = this.getModeLabel(this.currentDiff?.compareMode);
    header.createDiv({
      cls: "svn-diff-view-title",
      text: this.currentDiff
        ? t("diff.headerWithMode", this.lang, { mode: modeLabel, path: this.currentDiff.filePath })
        : t("diff.header", this.lang)
    });

    const content = root.createDiv({ cls: "svn-diff-view-content" });
    if (!this.currentDiff) {
      content.createDiv({ cls: "svn-helper-text", text: t("diff.hint", this.lang) });
      return;
    }

    content.createDiv({ cls: "svn-diff-file-path", text: this.currentDiff.filePath });

    const totalLines = this.currentDiff.lines.length;
    const totalPages = Math.max(1, Math.ceil(totalLines / this.pageSize));
    this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));
    const start = (this.currentPage - 1) * this.pageSize;
    const pageLines = this.currentDiff.lines.slice(start, start + this.pageSize);

    const diffLinesEl = content.createDiv({ cls: "svn-diff-lines svn-virtual-scroll" });
    pageLines.forEach((line) => {
      const lineEl = diffLinesEl.createDiv({ cls: `svn-diff-line svn-diff-${line.type}` });
      lineEl.createSpan({ cls: "svn-diff-line-number", text: line.lineNumber.toString() });
      lineEl.createSpan({ cls: "svn-diff-line-content", text: line.content });
    });

    if (!this.currentDiff.lines.length) {
      content.createDiv({ cls: "svn-helper-text", text: t("diff.noDiff", this.lang) });
      return;
    }

    if (totalPages > 1) {
      const pager = content.createDiv({ cls: "svn-diff-pager" });
      const prevBtn = pager.createEl("button", { cls: "svn-btn", text: t("diff.prevPage", this.lang) });
      prevBtn.disabled = this.currentPage <= 1;
      prevBtn.addEventListener("click", () => {
        this.currentPage -= 1;
        this.render();
      });

      pager.createDiv({ cls: "svn-helper-text", text: t("diff.pageInfo", this.lang, { current: this.currentPage, total: totalPages }) });

      const nextBtn = pager.createEl("button", { cls: "svn-btn", text: t("diff.nextPage", this.lang) });
      nextBtn.disabled = this.currentPage >= totalPages;
      nextBtn.addEventListener("click", () => {
        this.currentPage += 1;
        this.render();
      });
    }
  }
}
