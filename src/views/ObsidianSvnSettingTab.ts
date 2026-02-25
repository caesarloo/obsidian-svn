import { App, PluginSettingTab, Setting } from "obsidian";
import { RepositoryConfigModal } from "./RepositoryConfigModal";
import type { ObsidianSvnPlugin } from "../types";

export class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian SVN" });

    new Setting(containerEl)
      .setName("打开仓库配置弹窗")
      .setDesc("配置 SVN 可执行文件与凭据")
      .addButton((button) => {
        button.setButtonText("打开");
        button.onClick(() => {
          new RepositoryConfigModal(this.app, this.plugin).open();
        });
      });

    new Setting(containerEl)
      .setName("说明")
      .setDesc("若关闭\"持久化保存密码\"，插件会仅在当前会话保存密码，不写入配置文件。")
      .addExtraButton((button) => {
        button.setIcon("info");
      });

    new Setting(containerEl)
      .setName("调试日志")
      .setDesc("关闭后将不再输出调试级别日志（console.debug）")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableDebugLog);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableDebugLog = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("自动刷新间隔")
      .setDesc("设置自动刷新 SVN 状态的间隔时间（秒），0 表示禁用自动刷新")
      .addText((text) => {
        text.setValue(this.plugin.settings.autoRefreshInterval.toString());
        text.onChange(async (value) => {
          const interval = parseInt(value) || 0;
          this.plugin.settings.autoRefreshInterval = interval;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("启动时自动打开 SVN 面板")
      .setDesc("Obsidian 启动时自动打开 SVN 面板")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoOpenPanel);
        toggle.onChange(async (value) => {
          this.plugin.settings.autoOpenPanel = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("提交时自动生成摘要")
      .setDesc("提交时自动生成提交摘要")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoGenerateSummary);
        toggle.onChange(async (value) => {
          this.plugin.settings.autoGenerateSummary = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("差异显示主题")
      .setDesc("设置文件差异显示的主题")
      .addDropdown((dropdown) => {
        dropdown.addOption('light', '浅色');
        dropdown.addOption('dark', '深色');
        dropdown.setValue(this.plugin.settings.diffTheme);
        dropdown.onChange(async (value) => {
          this.plugin.settings.diffTheme = value as 'light' | 'dark';
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("文件树默认展开状态")
      .setDesc("设置文件树的默认展开状态")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.defaultExpandFolders);
        toggle.onChange(async (value) => {
          this.plugin.settings.defaultExpandFolders = value;
          await this.plugin.saveSettings();
        });
      });
  }
}