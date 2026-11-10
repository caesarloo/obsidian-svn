import { PluginSettingTab } from "obsidian";
import type { App, SettingDefinitionItem } from "obsidian";
import { t } from "../i18n";
import type { ObsidianSvnPlugin } from "../types";

export class ObsidianSvnSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app, plugin);
  }

  /**
   * 声明式设置定义（Obsidian 1.13+）。
   *
   * 1.13 起框架调用本方法渲染设置页，并用它建立设置搜索索引。
   * 本插件的 minAppVersion 已对齐 1.13.0，因此不再保留命令式的
   * display() 兜底（该 API 自 1.13.0 起已废弃）。
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

  /** 声明式控件取值：直接读插件设置 */
  getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  /** 声明式控件写值：写回插件设置并持久化 */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;

    if (key === "svnBinaryPath") {
      const normalized = (typeof value === "string" ? value : "").trim() || "svn";
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
}
