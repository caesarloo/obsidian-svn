/**
 * ObsidianSvnPlugin.getSvnClient 单元测试
 *
 * 验证插件设置到 @caesarloo/simple-svn-client SvnClient 构造参数的映射，
 * 防止未来包构造签名或默认值漂移导致插件运行时行为变化。
 */
import { SvnClient } from "@caesarloo/simple-svn-client";
import ObsidianSvnPlugin from "./main";
import type { ObsidianSvnSettings } from "./types";

// 包仅在运行时被构造，此处用 mock 记录构造参数
jest.mock("@caesarloo/simple-svn-client", () => ({
  SvnClient: jest.fn()
}));

// 插件基类与 Obsidian API 依赖，测试仅关心 getSvnClient 的映射逻辑
jest.mock("obsidian", () => ({
  Plugin: class {
    app: unknown;
    manifest: unknown;
    constructor(app: unknown, manifest: unknown) {
      this.app = app;
      this.manifest = manifest;
    }
    loadData = jest.fn(async () => null);
    saveData = jest.fn(async () => undefined);
    registerView = jest.fn();
    addRibbonIcon = jest.fn(() => ({ onClick: jest.fn() }));
    addCommand = jest.fn();
    addSettingTab = jest.fn();
    addIcon = jest.fn();
  },
  ItemView: class {},
  Modal: class {},
  Notice: class {},
  PluginSettingTab: class {},
  TFile: class {},
  WorkspaceLeaf: class {},
  setIcon: jest.fn()
}));

const SvnClientMock = SvnClient as jest.MockedClass<typeof SvnClient>;

const DEFAULT_SETTINGS: ObsidianSvnSettings = {
  svnBinaryPath: "C:/Program Files/TortoiseSVN/bin/svn.exe",
  workingCopyPath: "C:/my-vault",
  enableDebugLog: true,
  debugLogMigratedToDefaultOff: true,
  autoRefreshInterval: 30,
  autoGenerateSummary: true,
  diffTheme: "dark",
  defaultExpandFolders: true,
  language: "zh"
};

function createPlugin(overrides: Partial<ObsidianSvnSettings> = {}): ObsidianSvnPlugin {
  const plugin = new ObsidianSvnPlugin({} as never, { id: "vault-svn", version: "1.2.0" } as never);
  plugin.settings = { ...DEFAULT_SETTINGS, ...overrides };
  return plugin;
}

describe("ObsidianSvnPlugin.getSvnClient", () => {
  beforeEach(() => {
    SvnClientMock.mockClear();
  });

  it("将插件设置映射到包的 SvnClient 构造参数，且不设超时", () => {
    const plugin = createPlugin();
    plugin.getSvnClient();

    expect(SvnClientMock).toHaveBeenCalledTimes(1);
    expect(SvnClientMock).toHaveBeenCalledWith("C:/my-vault", {
      svnBinaryPath: "C:/Program Files/TortoiseSVN/bin/svn.exe",
      enableDebugLog: true,
      timeoutMs: 0
    });
  });

  it("svnBinaryPath 未配置时透传默认值 svn，enableDebugLog 跟随设置", () => {
    const plugin = createPlugin({ svnBinaryPath: "svn", enableDebugLog: false });
    plugin.getSvnClient();

    expect(SvnClientMock).toHaveBeenCalledWith("C:/my-vault", {
      svnBinaryPath: "svn",
      enableDebugLog: false,
      timeoutMs: 0
    });
  });

  it("每次调用都创建新的客户端实例（按操作实例化）", () => {
    const plugin = createPlugin();
    plugin.getSvnClient();
    plugin.getSvnClient();

    expect(SvnClientMock).toHaveBeenCalledTimes(2);
  });
});

describe("ObsidianSvnPlugin.loadSettings / saveSettings", () => {
  function createPluginWithVault(basePath: string): ObsidianSvnPlugin {
    return new ObsidianSvnPlugin(
      { vault: { adapter: { basePath } } } as never,
      { id: "vault-svn", version: "1.2.0" } as never
    );
  }

  it("忽略 data.json 里的旧 workingCopyPath，始终使用当前 vault 根目录", async () => {
    const plugin = createPluginWithVault("C:/Users/CaeserLoo/OneDrive - qizhenstudio/svn/支付大模型项目");
    (plugin.loadData as unknown as jest.Mock).mockResolvedValue({
      workingCopyPath: "C:/Users/11010356/OneDrive - qizhenstudio/svn/支付大模型项目",
      svnBinaryPath: "svn"
    });

    await plugin.loadSettings();

    expect(plugin.settings.workingCopyPath).toBe(
      "C:/Users/CaeserLoo/OneDrive - qizhenstudio/svn/支付大模型项目"
    );
  });

  it("data.json 无 workingCopyPath 时回落到当前 vault 根目录", async () => {
    const plugin = createPluginWithVault("/home/user/vault");
    (plugin.loadData as unknown as jest.Mock).mockResolvedValue({ svnBinaryPath: "svn" });

    await plugin.loadSettings();

    expect(plugin.settings.workingCopyPath).toBe("/home/user/vault");
  });

  it("保存设置时不把 workingCopyPath 写回 data.json", async () => {
    const plugin = createPluginWithVault("/home/user/vault");

    await plugin.saveSettings();

    const saveDataMock = plugin.saveData as unknown as jest.Mock;
    expect(saveDataMock).toHaveBeenCalledTimes(1);
    const persisted = saveDataMock.mock.calls[0][0] as Record<string, unknown>;
    expect(persisted).not.toHaveProperty("workingCopyPath");
    expect(persisted.svnBinaryPath).toBe(plugin.settings.svnBinaryPath);
  });
});
