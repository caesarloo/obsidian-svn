/**
 * ObsidianSvnSettingTab 声明式设置单元测试
 *
 * 验证 Obsidian 1.13+ 声明式设置 API 的定义完整性，以及
 * getControlValue / setControlValue 的读写、校验与副作用行为。
 */
import type { SettingDefinitionControl, SettingDefinitionGroup, SettingDefinitionItem } from "obsidian";
import { ObsidianSvnSettingTab } from "./ObsidianSvnSettingTab";
import type { ObsidianSvnPlugin, ObsidianSvnSettings } from "../types";

jest.mock("obsidian", () => ({
  PluginSettingTab: class {
    app: unknown;
    plugin: unknown;
    update = jest.fn();
    constructor(app: unknown, plugin: unknown) {
      this.app = app;
      this.plugin = plugin;
    }
  },
  Setting: class {
    setName() {
      return this;
    }
    setDesc() {
      return this;
    }
    setHeading() {
      return this;
    }
    addDropdown() {
      return this;
    }
    addText() {
      return this;
    }
    addToggle() {
      return this;
    }
    addExtraButton() {
      return this;
    }
  },
  Notice: class {},
  setIcon: jest.fn()
}));

const BASE_SETTINGS: ObsidianSvnSettings = {
  svnBinaryPath: "svn",
  workingCopyPath: "C:/vault",
  enableDebugLog: false,
  debugLogMigratedToDefaultOff: true,
  autoRefreshInterval: 30,
  autoGenerateSummary: true,
  diffTheme: "light",
  defaultExpandFolders: false,
  language: "zh"
};

function createTab(overrides: Partial<ObsidianSvnSettings> = {}) {
  const settings: ObsidianSvnSettings = { ...BASE_SETTINGS, ...overrides };
  const saveSettings = jest.fn(async () => undefined);
  const syncAutoRefreshInterval = jest.fn(async () => undefined);
  const plugin = {
    settings,
    saveSettings,
    syncAutoRefreshInterval
  } as unknown as ObsidianSvnPlugin;
  const tab = new ObsidianSvnSettingTab({} as never, plugin);
  return { tab, settings, saveSettings, syncAutoRefreshInterval };
}

function controlsOf(defs: SettingDefinitionItem[]): SettingDefinitionControl[] {
  const group = defs.find((item) => "type" in item && item.type === "group") as
    | SettingDefinitionGroup
    | undefined;
  expect(group).toBeDefined();
  const items = (group?.items ?? []) as SettingDefinitionItem[];
  return items.filter(
    (item): item is SettingDefinitionControl =>
      "control" in item && item.control !== undefined
  );
}

describe("ObsidianSvnSettingTab.getSettingDefinitions", () => {
  it("声明式定义覆盖全部可配置项", () => {
    const { tab } = createTab();

    const defs = tab.getSettingDefinitions();
    const keys = controlsOf(defs).map((item) => item.control.key);

    expect(keys).toEqual([
      "language",
      "svnBinaryPath",
      "enableDebugLog",
      "autoRefreshInterval",
      "autoGenerateSummary",
      "diffTheme",
      "defaultExpandFolders"
    ]);
  });

  it("每个设置项都有非空名称与说明", () => {
    const { tab } = createTab();

    const defs = tab.getSettingDefinitions();
    const items = (defs[0] as SettingDefinitionGroup).items ?? [];

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const definition = item as { name?: string; desc?: string };
      expect(typeof definition.name).toBe("string");
      expect((definition.name ?? "").length).toBeGreaterThan(0);
      expect(typeof definition.desc).toBe("string");
    }
  });

  it("设置项名称跟随当前语言", () => {
    const { tab } = createTab({ language: "en" });

    const defs = tab.getSettingDefinitions();
    const items = (defs[0] as SettingDefinitionGroup).items ?? [];
    const names = items.map((item) => (item as { name: string }).name);

    expect(names).toContain("Display Language");
    expect(names).not.toContain("显示语言");
  });
});

describe("ObsidianSvnSettingTab.getControlValue / setControlValue", () => {
  it("getControlValue 读取当前插件设置", () => {
    const { tab } = createTab({ autoRefreshInterval: 45 });

    expect(tab.getControlValue("autoRefreshInterval")).toBe(45);
    expect(tab.getControlValue("diffTheme")).toBe("light");
  });

  it("设置 svnBinaryPath 时去除首尾空格，空值回落为 svn", async () => {
    const { tab, settings, saveSettings } = createTab();

    await tab.setControlValue("svnBinaryPath", "  ");
    expect(settings.svnBinaryPath).toBe("svn");

    await tab.setControlValue("svnBinaryPath", "  C:/tools/svn.exe  ");
    expect(settings.svnBinaryPath).toBe("C:/tools/svn.exe");
    expect(saveSettings).toHaveBeenCalledTimes(2);
  });

  it("拒绝把 tortoiseproc.exe 写成 svn 可执行文件", async () => {
    const { tab, settings, saveSettings } = createTab();

    await tab.setControlValue("svnBinaryPath", "C:/Program Files/TortoiseSVN/bin/TortoiseProc.exe");

    expect(settings.svnBinaryPath).toBe("svn");
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it("修改自动刷新间隔后触发定时器同步", async () => {
    const { tab, settings, syncAutoRefreshInterval } = createTab();

    await tab.setControlValue("autoRefreshInterval", 60);

    expect(settings.autoRefreshInterval).toBe(60);
    expect(syncAutoRefreshInterval).toHaveBeenCalledTimes(1);
  });

  it("切换语言后重新求值设置定义", async () => {
    const { tab, settings } = createTab();
    const updateMock = (tab as unknown as { update: jest.Mock }).update;

    await tab.setControlValue("language", "en");

    expect(settings.language).toBe("en");
    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});
