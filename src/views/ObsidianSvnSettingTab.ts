import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { ObsidianSvnPlugin } from "../types";

export class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("插件设置").setHeading();

    new Setting(containerEl)
      .setName("Svn 可执行文件")
      .setDesc("留空或填写 svn；如失败请填写 svn.exe 绝对路径")
      .addText((text) => {
        text.setPlaceholder("例如：C:/Program Files/TortoiseSVN/bin/svn.exe 或 svn");
        text.setValue(this.plugin.settings.svnBinaryPath);
        text.onChange(async (value) => {
          const binaryValue = value.trim() || "svn";
          if (/tortoiseproc\.exe$/i.test(binaryValue.replace(/\\/g, "/"))) {
            new Notice("所选程序不是 svn 命令行工具，请填写 svn.exe。", 5000);
            return;
          }

          this.plugin.settings.svnBinaryPath = binaryValue;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("说明")
      .setDesc("本插件使用系统中的 svn 命令行工具执行版本管理操作。")
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
      .setDesc("设置自动刷新 svn 状态的间隔时间（秒），0 表示禁用自动刷新")
      .addText((text) => {
        text.setValue(this.plugin.settings.autoRefreshInterval.toString());
        text.onChange(async (value) => {
          const interval = parseInt(value) || 0;
          this.plugin.settings.autoRefreshInterval = interval;
          await this.plugin.saveSettings();
          await this.plugin.syncAutoRefreshInterval();
        });
      });

    new Setting(containerEl)
      .setName("启动时自动打开 svn 面板")
      .setDesc("Obsidian 启动时自动打开 svn 面板")
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
      .setName("Svn 差异显示主题")
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