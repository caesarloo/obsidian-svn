import { App, Modal, Notice, Setting } from "obsidian";
import { encryptPassword, decryptPassword } from "../services/cryptoService";
import type { ObsidianSvnPlugin } from "../types";

export class RepositoryConfigModal extends Modal {
  constructor(app: App, private readonly plugin: ObsidianSvnPlugin) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("svn-modal");

    new Setting(contentEl).setName("仓库配置").setHeading();

    const binaryInput = this.createBinaryField(contentEl, this.plugin.settings.svnBinaryPath);
    const userInput = this.createField(contentEl, "用户名", this.plugin.settings.username);

    const passwordInput = this.createField(contentEl, "密码", this.plugin.getSessionPassword() || decryptPassword(this.plugin.settings.savedPassword), "password");

    new Setting(contentEl)
      .setName("持久化保存密码")
      .setDesc("关闭时仅在当前会话保留密码（更安全）")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.persistPassword);
        toggle.onChange((value) => {
          this.plugin.settings.persistPassword = value;
        });
      });

    const actionRow = contentEl.createDiv({ cls: "svn-modal-actions" });
    const cancelBtn = actionRow.createEl("button", { cls: "svn-btn", text: "取消" });
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = actionRow.createEl("button", { cls: "svn-btn is-primary", text: "保存" });
    saveBtn.addEventListener("click", () => {
      void this.handleSave(binaryInput, userInput, passwordInput);
    });
  }

  private createField(parent: HTMLElement, label: string, value: string, type = "text"): HTMLInputElement {
    const wrapper = parent.createDiv({ cls: "svn-field" });
    wrapper.createEl("label", { text: label });
    return wrapper.createEl("input", {
      attr: {
        type,
        value
      }
    });
  }

  private createBinaryField(parent: HTMLElement, value: string): HTMLInputElement {
    const wrapper = parent.createDiv({ cls: "svn-field" });
    wrapper.createEl("label", { text: "Svn 可执行文件" });

    const row = wrapper.createDiv({ cls: "svn-field-row" });
    const input = row.createEl("input", {
      attr: {
        type: "text",
        value,
        placeholder: "留空或填写 svn；如失败请填写 svn.exe 绝对路径"
      }
    });

    const picker = row.createEl("input", {
      attr: {
        type: "file",
        accept: ".exe"
      }
    });
    picker.addClass("svn-hidden-input");

    const pickBtn = row.createEl("button", { cls: "svn-btn", text: "选择文件" });
    pickBtn.addEventListener("click", () => {
      void this.handlePickExecutable(input, picker);
    });

    picker.addEventListener("change", () => {
      const file = picker.files?.[0] as File & { path?: string };
      if (file?.path) {
        input.value = file.path;
        return;
      }

      if (picker.value) {
        input.value = picker.value;
        new Notice("当前环境无法读取真实文件路径，请手动粘贴 svn.exe 的绝对路径。", 5000);
      }
    });

    wrapper.createDiv({
      cls: "svn-helper-text",
      text: "示例：C:/Program Files/TortoiseSVN/bin/svn.exe。若安装 TortoiseSVN，请勾选\"Command line client tools\"组件；若 PATH 已配置可直接填 svn。"
    });

    return input;
  }

  private async handleSave(binaryInput: HTMLInputElement, userInput: HTMLInputElement, passwordInput: HTMLInputElement): Promise<void> {
    const binaryValue = binaryInput.value.trim() || "svn";
    if (/tortoiseproc\.exe$/i.test(binaryValue.replace(/\\/g, "/"))) {
      new Notice("所选程序不是 svn 命令行工具，请选择 svn.exe。若安装 tortoisesvn，请勾选\"command line client tools\"组件。");
      return;
    }

    this.plugin.settings.svnBinaryPath = binaryValue;
    this.plugin.settings.username = userInput.value.trim();

    const password = passwordInput.value;
    if (this.plugin.settings.persistPassword) {
      this.plugin.settings.savedPassword = encryptPassword(password);
      this.plugin.setSessionPassword("");
    } else {
      this.plugin.settings.savedPassword = "";
      this.plugin.setSessionPassword(password);
    }

    await this.plugin.saveSettings();
    new Notice("仓库配置已保存");
    this.close();
  }

  private async handlePickExecutable(input: HTMLInputElement, picker: HTMLInputElement): Promise<void> {
    const selected = await this.pickExecutablePathWithElectron();
    if (selected) {
      input.value = selected;
      return;
    }
    picker.click();
  }

  private async pickExecutablePathWithElectron(): Promise<string | null> {
    try {
      const electron = (window as Window & { require?: (id: string) => unknown }).require?.("electron") as {
        dialog?: {
          showOpenDialog: (options: {
            title?: string;
            properties?: string[];
            filters?: Array<{ name: string; extensions: string[] }>;
          }) => Promise<{ canceled: boolean; filePaths: string[] }>;
        };
        remote?: {
          dialog?: {
            showOpenDialog: (options: {
              title?: string;
              properties?: string[];
              filters?: Array<{ name: string; extensions: string[] }>;
            }) => Promise<{ canceled: boolean; filePaths: string[] }>;
          };
        };
      };

      const dialog = electron?.dialog ?? electron?.remote?.dialog;
      if (!dialog?.showOpenDialog) {
        return null;
      }

      const result = await dialog.showOpenDialog({
        title: "选择 svn.exe",
        properties: ["openFile"],
        filters: [{ name: "Executable", extensions: ["exe"] }]
      });

      if (result.canceled || !result.filePaths.length) {
        return null;
      }

      return result.filePaths[0];
    } catch {
      return null;
    }
  }
}