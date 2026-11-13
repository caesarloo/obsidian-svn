/**
 * SvnPanelView 目录层级还原的未跟踪条目处理单元测试
 *
 * 背景：svn revert 对未跟踪（unversioned）条目无效，目录层级点「还原」时若只调
 * svn revert --recursive，未跟踪文件会留在磁盘上；单文件还原因另有删除分支所以正常。
 * 本文件覆盖为此抽出的两个纯函数：collectUntrackedPaths / removeUntrackedEntries。
 */
import type { SvnStatusEntry, SvnStatusKind } from "@caesarloo/simple-svn-client";
import { collectUntrackedPaths, removeUntrackedEntries } from "./SvnPanelView";

jest.mock("obsidian", () => ({
  ItemView: class {
    app: unknown;
    constructor(app?: unknown) {
      this.app = app;
    }
  },
  Modal: class {},
  Notice: class {},
  TFile: class {},
  WorkspaceLeaf: class {},
  setIcon: jest.fn()
}));

jest.mock("@caesarloo/simple-svn-client", () => ({
  generateSummaryWithFallback: jest.fn()
}));

function entry(path: string, status: SvnStatusKind): SvnStatusEntry {
  const segments = path.split("/");
  return {
    path,
    fileName: segments[segments.length - 1] ?? path,
    folderPath: segments.slice(0, -1).join("/"),
    status
  };
}

describe("collectUntrackedPaths", () => {
  it("只收集未跟踪条目，忽略已跟踪的各种状态", () => {
    const entries = [
      entry("notes/untracked-a.md", "untracked"),
      entry("notes/added.md", "added"),
      entry("notes/modified.md", "modified"),
      entry("notes/deleted.md", "deleted"),
      entry("notes/conflict.md", "conflict"),
      entry("notes/missing.md", "missing"),
      entry("notes/untracked-b.md", "untracked")
    ];

    expect(collectUntrackedPaths(entries)).toEqual([
      "notes/untracked-a.md",
      "notes/untracked-b.md"
    ]);
  });

  it("同一路径重复出现时去重", () => {
    const entries = [
      entry("notes/dup.md", "untracked"),
      entry("notes/dup.md", "untracked")
    ];

    expect(collectUntrackedPaths(entries)).toEqual(["notes/dup.md"]);
  });

  it("按层级由浅到深排序，父目录先于其下子条目", () => {
    const entries = [
      entry("notes/sub/deep/file.md", "untracked"),
      entry("notes/sub/file.md", "untracked"),
      entry("notes/top.md", "untracked")
    ];

    expect(collectUntrackedPaths(entries)).toEqual([
      "notes/top.md",
      "notes/sub/file.md",
      "notes/sub/deep/file.md"
    ]);
  });

  it("无未跟踪条目时返回空数组", () => {
    expect(collectUntrackedPaths([entry("notes/a.md", "modified")])).toEqual([]);
    expect(collectUntrackedPaths([])).toEqual([]);
  });
});

describe("removeUntrackedEntries", () => {
  it("删除全部未跟踪条目，且不会把已跟踪条目交给删除函数", async () => {
    const removePath = jest.fn(async (_path: string) => true);
    const entries = [
      entry("notes/untracked-a.md", "untracked"),
      entry("notes/modified.md", "modified"),
      entry("other/untracked-dir", "untracked")
    ];

    const result = await removeUntrackedEntries(entries, removePath);

    expect(removePath.mock.calls.map((call) => call[0])).toEqual([
      "notes/untracked-a.md",
      "other/untracked-dir"
    ]);
    expect(result).toEqual({ deletedCount: 2, failedPaths: [] });
  });

  it("条目已不存在（删除函数返回 false）时不计入删除数，也不算失败", async () => {
    const removePath = jest.fn(async () => false);

    const result = await removeUntrackedEntries(
      [entry("notes/gone.md", "untracked")],
      removePath
    );

    expect(result).toEqual({ deletedCount: 0, failedPaths: [] });
  });

  it("单个条目删除失败不中断其余条目，失败路径被收集", async () => {
    const removePath = jest.fn(async (path: string) => {
      if (path === "notes/locked.md") {
        throw new Error("EPERM");
      }
      return true;
    });
    const entries = [
      entry("notes/locked.md", "untracked"),
      entry("notes/ok.md", "untracked")
    ];

    const result = await removeUntrackedEntries(entries, removePath);

    expect(result).toEqual({ deletedCount: 1, failedPaths: ["notes/locked.md"] });
    expect(removePath).toHaveBeenCalledWith("notes/ok.md");
  });

  it("按父目录优先顺序删除", async () => {
    const order: string[] = [];
    const removePath = jest.fn(async (path: string) => {
      order.push(path);
      return true;
    });
    const entries = [
      entry("notes/sub/deep.md", "untracked"),
      entry("notes/sub", "untracked")
    ];

    await removeUntrackedEntries(entries, removePath);

    expect(order).toEqual(["notes/sub", "notes/sub/deep.md"]);
  });
});
