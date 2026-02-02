import * as vscode from "vscode";
import { CompresrClient, CompressionModel } from "./client";

export class CompresrSettingsPanel {
  public static async show(_extensionUri?: vscode.Uri) {
    const config = vscode.workspace.getConfiguration("compresr");
    const apiKey = config.get<string>("apiKey") || "";
    const apiEndpoint = config.get<string>("apiEndpoint") || "https://api.compresr.ai";
    const currentModel = config.get<string>("modelName") || "cmprsr_v1";
    const currentRatio = config.get<number>("compressionRatio") || 0.3;

    // Check if current file is markdown
    const activeEditor = vscode.window.activeTextEditor;
    const hasMarkdownFile = activeEditor?.document.uri.fsPath.endsWith(".md") ?? false;
    const fileName = activeEditor?.document.uri.fsPath.split("/").pop();

    // Fetch models
    let models: CompressionModel[] = [{ name: "cmprsr_v1", description: "Default model" }];
    if (apiKey) {
      try {
        const client = new CompresrClient(apiKey, apiEndpoint);
        const fetched = await client.getModels();
        if (Array.isArray(fetched) && fetched.length > 0) {
          models = fetched;
        }
      } catch {
        // Keep default
      }
    }

    interface MenuItem extends vscode.QuickPickItem {
      action?: string;
      value?: string | number;
    }

    const items: MenuItem[] = [];

    // Settings first
    items.push({
      label: `$(gear) Model: ${currentModel}`,
      description: "",
      action: "selectModel",
    });

    items.push({
      label: `$(sliders) Ratio: ${Math.round(currentRatio * 100)}%`,
      description: this.getRatioLabel(currentRatio),
      action: "selectRatio",
    });

    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });

    // Actions
    if (hasMarkdownFile) {
      items.push({
        label: "$(play) Compress This File",
        description: fileName,
        action: "compressFile",
      });
    }

    items.push({
      label: "$(files) Compress All Markdown",
      description: "Entire workspace",
      action: "compressAll",
    });

    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });

    // API Key at bottom
    items.push({
      label: apiKey ? "$(pass-filled) API Key" : "$(key) API Key",
      description: apiKey ? "Connected" : "Not configured",
      action: "apiKey",
    });

    const selected = await vscode.window.showQuickPick(items, {
      title: "⚡ Compresr",
      placeHolder: hasMarkdownFile ? "Compress or configure" : "Configure settings",
    });

    if (!selected?.action) return;

    switch (selected.action) {
      case "compressFile":
        vscode.commands.executeCommand("compresr.compressFilePreview");
        break;

      case "compressAll":
        vscode.commands.executeCommand("compresr.compressWorkspace");
        break;

      case "selectModel":
        await this.showModelPicker(models, currentModel, config);
        break;

      case "selectRatio":
        await this.showRatioPicker(currentRatio, config);
        break;

      case "apiKey":
        vscode.commands.executeCommand("compresr.setApiKey");
        break;
    }
  }

  private static getRatioLabel(ratio: number): string {
    if (ratio <= 0.2) return "Aggressive";
    if (ratio <= 0.4) return "Strong";
    if (ratio <= 0.6) return "Moderate";
    if (ratio <= 0.8) return "Light";
    return "Minimal";
  }

  private static async showModelPicker(
    models: CompressionModel[],
    currentModel: string,
    config: vscode.WorkspaceConfiguration
  ) {
    interface ModelItem extends vscode.QuickPickItem {
      value?: string;
      isBack?: boolean;
    }

    const items: ModelItem[] = [
      { label: "$(arrow-left) Back", isBack: true },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      ...models.map((m) => ({
        label: m.name === currentModel ? `$(check) ${m.name}` : `     ${m.name}`,
        description: m.description || "",
        value: m.name,
      })),
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "⚡ Compresr › Model",
      placeHolder: `Current: ${currentModel}`,
    });

    if (!selected) return;
    if (selected.isBack) {
      this.show();
      return;
    }

    if (selected.value) {
      await config.update("modelName", selected.value, vscode.ConfigurationTarget.Global);
      this.show();
    }
  }

  private static async showRatioPicker(
    currentRatio: number,
    config: vscode.WorkspaceConfiguration
  ) {
    interface RatioItem extends vscode.QuickPickItem {
      value?: number;
      isBack?: boolean;
    }

    const options = [
      { pct: 10, value: 0.1, desc: "Maximum compression" },
      { pct: 20, value: 0.2, desc: "High compression" },
      { pct: 30, value: 0.3, desc: "Strong compression" },
      { pct: 40, value: 0.4, desc: "Moderate" },
      { pct: 50, value: 0.5, desc: "Balanced" },
      { pct: 60, value: 0.6, desc: "Light compression" },
      { pct: 70, value: 0.7, desc: "Very light" },
      { pct: 80, value: 0.8, desc: "Minimal" },
      { pct: 90, value: 0.9, desc: "Near original" },
    ];

    const items: RatioItem[] = [
      { label: "$(arrow-left) Back", isBack: true },
      { label: "", kind: vscode.QuickPickItemKind.Separator },
      ...options.map((o) => ({
        label: o.value === currentRatio ? `$(check) ${o.pct}%` : `     ${o.pct}%`,
        description: o.desc,
        value: o.value,
      })),
    ];

    const selected = await vscode.window.showQuickPick(items, {
      title: "⚡ Compresr › Compression Ratio",
      placeHolder: `Current: ${Math.round(currentRatio * 100)}%`,
    });

    if (!selected) return;
    if (selected.isBack) {
      this.show();
      return;
    }

    if (selected.value !== undefined) {
      await config.update("compressionRatio", selected.value, vscode.ConfigurationTarget.Global);
      this.show();
    }
  }
}
