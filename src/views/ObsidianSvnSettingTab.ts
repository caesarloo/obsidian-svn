import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { t } from "../i18n";
import type { ObsidianSvnPlugin } from "../types";

export class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const lang = this.plugin.settings.language;

    new Setting(containerEl).setName(t("settings.heading", lang)).setHeading();

    // Language selector - always shown
    new Setting(containerEl)
      .setName(t("settings.language", lang))
      .setDesc(t("settings.language.desc", lang))
      .addDropdown((dropdown) => {
        dropdown.addOption("zh", "中文（简体）");
        dropdown.addOption("en", "English");
        dropdown.setValue(this.plugin.settings.language);
        dropdown.onChange(async (value) => {
          this.plugin.settings.language = value as "zh" | "en";
          await this.plugin.saveSettings();
          this.display(); // re-render settings with new language
        });
      });

    new Setting(containerEl)
      .setName(t("settings.svnBinaryPath", lang))
      .setDesc(t("settings.svnBinaryPath.desc", lang))
      .addText((text) => {
        text.setPlaceholder(t("settings.svnBinaryPath.placeholder", lang));
        text.setValue(this.plugin.settings.svnBinaryPath);
        text.onChange(async (value) => {
          const binaryValue = value.trim() || "svn";
          if (/tortoiseproc\.exe$/i.test(binaryValue.replace(/\\\\/g, "/"))) {
            new Notice(t("settings.svnBinaryPath.warning", lang), 5000);
            return;
          }
          this.plugin.settings.svnBinaryPath = binaryValue;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.info", lang))
      .setDesc(t("settings.info.desc", lang))
      .addExtraButton((button) => {
        button.setIcon("info");
      });

    new Setting(containerEl)
      .setName(t("settings.debugLog", lang))
      .setDesc(t("settings.debugLog.desc", lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableDebugLog);
        toggle.onChange(async (value) => {
          this.plugin.settings.enableDebugLog = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.autoRefresh", lang))
      .setDesc(t("settings.autoRefresh.desc", lang))
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
      .setName(t("settings.autoOpenPanel", lang))
      .setDesc(t("settings.autoOpenPanel.desc", lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoOpenPanel);
        toggle.onChange(async (value) => {
          this.plugin.settings.autoOpenPanel = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.autoGenerateSummary", lang))
      .setDesc(t("settings.autoGenerateSummary.desc", lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoGenerateSummary);
        toggle.onChange(async (value) => {
          this.plugin.settings.autoGenerateSummary = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.diffTheme", lang))
      .setDesc(t("settings.diffTheme.desc", lang))
      .addDropdown((dropdown) => {
        dropdown.addOption('light', t("diffTheme.light", lang));
        dropdown.addOption('dark', t("diffTheme.dark", lang));
        dropdown.setValue(this.plugin.settings.diffTheme);
        dropdown.onChange(async (value) => {
          this.plugin.settings.diffTheme = value as 'light' | 'dark';
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.defaultExpandFolders", lang))
      .setDesc(t("settings.defaultExpandFolders.desc", lang))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.defaultExpandFolders);
        toggle.onChange(async (value) => {
          this.plugin.settings.defaultExpandFolders = value;
          await this.plugin.saveSettings();
        });
      });
  }
}
