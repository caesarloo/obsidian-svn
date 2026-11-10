import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import { t } from "../i18n";
import type { ObsidianSvnPlugin } from "../types";

export class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  /**
   * Obsidian 1.13+ 的声明式设置定义。
   *
   * 1.13 起框架优先调用本方法渲染设置页，并用它建立设置搜索索引；
   * 返回非空数组时框架不会调用 display()，因此 display() 只作为
   * 1.13 以下版本的兜底（见 SettingTab#display 的官方注释）。
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const lang = this.plugin.settings.language;

    return [
      {
        type: "group",
        heading: t("settings.heading", lang),
        items: [
          {
            name: t("settings.language", lang),
            desc: t("settings.language.desc", lang),
            control: {
              type: "dropdown",
              key: "language",
              options: {
                zh: "中文（简体）",
                en: "English"
              },
              defaultValue: "zh"
            }
          },
          {
            name: t("settings.svnBinaryPath", lang),
            desc: t("settings.svnBinaryPath.desc", lang),
            control: {
              type: "text",
              key: "svnBinaryPath",
              placeholder: t("settings.svnBinaryPath.placeholder", lang),
              defaultValue: "svn",
              validate: (value: string) =>
                /tortoiseproc\.exe$/i.test(value.replace(/\\\\/g, "/"))
                  ? t("settings.svnBinaryPath.warning", lang)
                  : undefined
            }
          },
          {
            name: t("settings.info", lang),
            desc: t("settings.info.desc", lang)
          },
          {
            name: t("settings.debugLog", lang),
            desc: t("settings.debugLog.desc", lang),
            control: {
              type: "toggle",
              key: "enableDebugLog",
              defaultValue: false
            }
          },
          {
            name: t("settings.autoRefresh", lang),
            desc: t("settings.autoRefresh.desc", lang),
            control: {
              type: "number",
              key: "autoRefreshInterval",
              defaultValue: 0,
              min: 0,
              step: 1
            }
          },
          {
            name: t("settings.autoGenerateSummary", lang),
            desc: t("settings.autoGenerateSummary.desc", lang),
            control: {
              type: "toggle",
              key: "autoGenerateSummary",
              defaultValue: true
            }
          },
          {
            name: t("settings.diffTheme", lang),
            desc: t("settings.diffTheme.desc", lang),
            control: {
              type: "dropdown",
              key: "diffTheme",
              options: {
                light: t("diffTheme.light", lang),
                dark: t("diffTheme.dark", lang)
              },
              defaultValue: "light"
            }
          },
          {
            name: t("settings.defaultExpandFolders", lang),
            desc: t("settings.defaultExpandFolders.desc", lang),
            control: {
              type: "toggle",
              key: "defaultExpandFolders",
              defaultValue: false
            }
          }
        ]
      }
    ];
  }

  /** 声明式控件取值：直接读插件设置（1.13+ 使用） */
  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  /** 声明式控件写值：写回插件设置并持久化（1.13+ 使用） */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;

    if (key === "svnBinaryPath") {
      const normalized = String(value ?? "").trim() || "svn";
      // validate 已拦截的情况不会走到这里；此处只做防御，避免写入非 svn 命令行程序
      if (/tortoiseproc\.exe$/i.test(normalized.replace(/\\\\/g, "/"))) {
        return;
      }
      settings[key] = normalized;
    } else {
      settings[key] = value;
    }

    await this.plugin.saveSettings();

    if (key === "language") {
      // 设置项的 name/desc 由当前语言生成，切换语言后重新求值定义
      this.update();
    } else if (key === "autoRefreshInterval") {
      await this.plugin.syncAutoRefreshInterval();
    }
  }

  /**
   * 1.13 以下的兜底渲染（1.13+ 框架返回了声明式定义时不会调用本方法）。
   */
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
        dropdown.addOption("light", t("diffTheme.light", lang));
        dropdown.addOption("dark", t("diffTheme.dark", lang));
        dropdown.setValue(this.plugin.settings.diffTheme);
        dropdown.onChange(async (value) => {
          this.plugin.settings.diffTheme = value as "light" | "dark";
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
