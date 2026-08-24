/**
 * obsidian npm 包仅含类型声明（package.json 的 main 为空），运行时不可被
 * jest 解析。本文件作为 moduleNameMapper 的落点，使 jest.mock("obsidian", factory)
 * 可以解析模块路径；实际行为由各测试的 factory 提供。
 */
export class Plugin {
  app: unknown;
  manifest: unknown;

  constructor(app?: unknown, manifest?: unknown) {
    this.app = app;
    this.manifest = manifest;
  }
}

export class Notice {}
export class TFile {}
export class WorkspaceLeaf {}

export function addIcon(): void {}
