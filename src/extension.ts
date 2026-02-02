import * as vscode from "vscode";
import { CompresrClient, CompressionResult } from "./client";
import { CompresrSettingsPanel } from "./settingsPanel";

export function activate(context: vscode.ExtensionContext) {
  console.log("Compresr extension activated");

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("compresr.compressFile", () => compressFile()),
    vscode.commands.registerCommand("compresr.compressFilePreview", () => compressFilePreview()),
    vscode.commands.registerCommand("compresr.compressWorkspace", () => compressWorkspace()),
    vscode.commands.registerCommand("compresr.restoreFile", () => restoreFile()),
    vscode.commands.registerCommand("compresr.setApiKey", () => setApiKey()),
    vscode.commands.registerCommand("compresr.selectModel", () => selectModel()),
    vscode.commands.registerCommand("compresr.setCompressionRatio", () => setCompressionRatio()),
    vscode.commands.registerCommand("compresr.openQuickSettings", () => CompresrSettingsPanel.show(context.extensionUri))
  );

  // Check if API key is set, prompt if not
  const config = getConfig();
  if (!config.apiKey) {
    vscode.window
      .showWarningMessage(
        "Compresr: Set your API key to get started.",
        "Set API Key",
        "Get API Key"
      )
      .then((choice) => {
        if (choice === "Set API Key") {
          vscode.commands.executeCommand("compresr.setApiKey");
        } else if (choice === "Get API Key") {
          vscode.env.openExternal(vscode.Uri.parse("https://compresr.ai"));
        }
      });
  }
}

export function deactivate() {}

// ============================================================================
// Configuration Helpers
// ============================================================================

function getConfig() {
  const config = vscode.workspace.getConfiguration("compresr");
  return {
    apiKey: config.get<string>("apiKey") || process.env.COMPRESR_API_KEY || "",
    compressionRatio: config.get<number>("compressionRatio") || 0.3,
    modelName: config.get<string>("modelName") || "cmprsr_v1",
    createBackups: config.get<boolean>("createBackups") ?? true,
    apiEndpoint: config.get<string>("apiEndpoint") || "https://api.compresr.ai",
  };
}

async function getApiKey(): Promise<string | undefined> {
  const config = getConfig();

  if (config.apiKey) {
    return config.apiKey;
  }

  // Prompt user to enter API key
  const key = await vscode.window.showInputBox({
    prompt: "Enter your Compresr API key",
    placeHolder: "cmp_xxxxxxxxxxxx",
    password: true,
    ignoreFocusOut: true,
  });

  if (key) {
    // Save the key to settings
    await vscode.workspace
      .getConfiguration("compresr")
      .update("apiKey", key, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage("API key saved to settings");
  }

  return key;
}

// ============================================================================
// Command: Set API Key
// ============================================================================

async function setApiKey() {
  const key = await vscode.window.showInputBox({
    prompt: "Enter your Compresr API key",
    placeHolder: "cmp_xxxxxxxxxxxx",
    password: true,
    ignoreFocusOut: true,
  });

  if (key) {
    await vscode.workspace
      .getConfiguration("compresr")
      .update("apiKey", key, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage("✓ Compresr API key saved");
  }
}

// ============================================================================
// Command: Select Compression Model
// ============================================================================

async function selectModel() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    vscode.window.showWarningMessage("API key required to fetch available models");
    return;
  }

  const config = getConfig();
  const client = new CompresrClient(apiKey, config.apiEndpoint);

  try {
    const models = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching available models...",
        cancellable: false,
      },
      async () => {
        return await client.getModels();
      }
    );

    if (!models || models.length === 0) {
      vscode.window.showWarningMessage("No compression models available");
      return;
    }

    const items = models.map((model) => ({
      label: model.name,
      description: model.description || "",
      detail: model.max_context_length 
        ? `Max context: ${model.max_context_length} tokens` 
        : undefined,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a compression model",
      title: "Compresr: Select Model",
    });

    if (selected) {
      await vscode.workspace
        .getConfiguration("compresr")
        .update("modelName", selected.label, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`✓ Model set to: ${selected.label}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to fetch models: ${(error as Error).message}`);
  }
}

// ============================================================================
// Command: Set Compression Ratio
// ============================================================================

async function setCompressionRatio() {
  const config = getConfig();
  
  const ratioOptions = [
    { label: "10%", value: 0.1, description: "Aggressive compression" },
    { label: "20%", value: 0.2, description: "High compression" },
    { label: "30%", value: 0.3, description: "Recommended (default)" },
    { label: "40%", value: 0.4, description: "Moderate compression" },
    { label: "50%", value: 0.5, description: "Light compression" },
    { label: "60%", value: 0.6, description: "Minimal compression" },
    { label: "70%", value: 0.7, description: "Very light compression" },
    { label: "Custom...", value: -1, description: "Enter a custom ratio" },
  ];

  const items = ratioOptions.map((opt) => ({
    label: opt.label,
    description: opt.description,
    value: opt.value,
    picked: opt.value === config.compressionRatio,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `Current ratio: ${(config.compressionRatio * 100).toFixed(0)}%`,
    title: "Compresr: Set Target Compression Ratio",
  });

  if (!selected) {
    return;
  }

  let ratio = selected.value;

  if (ratio === -1) {
    // Custom ratio
    const input = await vscode.window.showInputBox({
      prompt: "Enter target compression ratio (0.1 to 0.9)",
      placeHolder: "0.3",
      value: config.compressionRatio.toString(),
      validateInput: (value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0.1 || num > 0.9) {
          return "Please enter a number between 0.1 and 0.9";
        }
        return null;
      },
    });

    if (!input) {
      return;
    }

    ratio = parseFloat(input);
  }

  await vscode.workspace
    .getConfiguration("compresr")
    .update("compressionRatio", ratio, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(
    `✓ Compression ratio set to ${(ratio * 100).toFixed(0)}% (compress to ${(ratio * 100).toFixed(0)}% of original size)`
  );
}

// ============================================================================
// Command: Compress Current File
// ============================================================================

async function compressFile(fileUri?: vscode.Uri) {
  // Get the file to compress
  const uri = fileUri || vscode.window.activeTextEditor?.document.uri;

  if (!uri) {
    vscode.window.showErrorMessage("No file selected");
    return;
  }

  if (!uri.fsPath.endsWith(".md")) {
    vscode.window.showErrorMessage("Only markdown files (.md) can be compressed");
    return;
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    vscode.window.showWarningMessage("API key required. Get one at https://compresr.ai");
    return;
  }

  const config = getConfig();
  const client = new CompresrClient(apiKey, config.apiEndpoint);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Compressing file...",
      cancellable: false,
    },
    async () => {
      try {
        // Read file content
        const document = await vscode.workspace.openTextDocument(uri);
        const content = document.getText();
        const originalSize = content.length;

        // Compress with configured model and ratio
        const result = await client.compress(content, {
          targetRatio: config.compressionRatio,
          modelName: config.modelName,
        });

        // Create backup if enabled
        if (config.createBackups) {
          const backupUri = vscode.Uri.file(uri.fsPath + ".bak");
          await vscode.workspace.fs.writeFile(backupUri, Buffer.from(content, "utf-8"));
        }

        // Write compressed content
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(content.length)
        );
        edit.replace(uri, fullRange, result.compressedContent);
        await vscode.workspace.applyEdit(edit);
        await document.save();

        // Show result
        const reduction = ((1 - result.compressedContent.length / originalSize) * 100).toFixed(1);
        vscode.window.showInformationMessage(
          `✓ Compressed: ${originalSize} → ${result.compressedContent.length} chars (${reduction}% reduction)`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Compression failed: ${(error as Error).message}`);
      }
    }
  );
}

// ============================================================================
// Command: Compress with Preview (Diff View)
// ============================================================================

async function compressFilePreview(fileUri?: vscode.Uri) {
  const uri = fileUri || vscode.window.activeTextEditor?.document.uri;

  if (!uri) {
    vscode.window.showErrorMessage("No file selected. Please open a markdown file first.");
    return;
  }

  if (!uri.fsPath.endsWith(".md")) {
    vscode.window.showErrorMessage("Only markdown files (.md) can be compressed");
    return;
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    vscode.window.showWarningMessage("API key required. Get one at https://compresr.ai");
    return;
  }

  const config = getConfig();
  const client = new CompresrClient(apiKey, config.apiEndpoint);

  let compressedContent = "";
  let originalContent = "";
  let originalSize = 0;

  // Compress the content
  const success = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Compressing...",
      cancellable: false,
    },
    async () => {
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        originalContent = document.getText();
        originalSize = originalContent.length;

        const result = await client.compress(originalContent, {
          targetRatio: config.compressionRatio,
          modelName: config.modelName,
        });

        compressedContent = result.compressedContent;
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(`Compression failed: ${(error as Error).message}`);
        return false;
      }
    }
  );

  if (!success) return;

  // Create a temporary file with the compressed content for diff view
  const originalUri = uri;
  const compressedUri = vscode.Uri.parse(`compresr-preview:${uri.fsPath}?compressed`);

  // Register a content provider for the preview
  const provider = new (class implements vscode.TextDocumentContentProvider {
    provideTextDocumentContent(): string {
      return compressedContent;
    }
  })();

  const registration = vscode.workspace.registerTextDocumentContentProvider("compresr-preview", provider);

  // Show diff
  const reduction = ((1 - compressedContent.length / originalSize) * 100).toFixed(1);
  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    compressedUri,
    `Compresr: ${originalSize} → ${compressedContent.length} chars (${reduction}% reduction)`
  );

  // Ask user to accept or reject
  const choice = await vscode.window.showInformationMessage(
    `Compressed: ${originalSize} → ${compressedContent.length} chars (${reduction}% reduction)`,
    { modal: false },
    "✓ Apply Changes",
    "✗ Discard"
  );

  // Clean up the provider
  registration.dispose();

  if (choice === "✓ Apply Changes") {
    // Create backup if enabled
    if (config.createBackups) {
      const backupUri = vscode.Uri.file(uri.fsPath + ".bak");
      await vscode.workspace.fs.writeFile(backupUri, Buffer.from(originalContent, "utf-8"));
    }

    // Apply the changes
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(originalContent.length)
    );
    edit.replace(uri, fullRange, compressedContent);
    await vscode.workspace.applyEdit(edit);
    await document.save();

    // Close the diff view
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

    vscode.window.showInformationMessage(`✓ Changes applied! Backup saved to ${uri.fsPath}.bak`);
  } else {
    // Close the diff view
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    vscode.window.showInformationMessage("Changes discarded");
  }
}

// ============================================================================
// Command: Compress All Markdown Files in Workspace
// ============================================================================

async function compressWorkspace() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    vscode.window.showWarningMessage("API key required. Get one at https://compresr.ai");
    return;
  }

  // Find all markdown files
  const files = await vscode.workspace.findFiles("**/*.md", "**/node_modules/**");

  if (files.length === 0) {
    vscode.window.showInformationMessage("No markdown files found in workspace");
    return;
  }

  // Confirm with user
  const confirm = await vscode.window.showWarningMessage(
    `Compress ${files.length} markdown file(s)?`,
    { modal: true },
    "Compress All",
    "Cancel"
  );

  if (confirm !== "Compress All") {
    return;
  }

  const config = getConfig();
  const client = new CompresrClient(apiKey, config.apiEndpoint);

  let successCount = 0;
  let totalOriginal = 0;
  let totalCompressed = 0;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Compressing markdown files...",
      cancellable: true,
    },
    async (progress, token) => {
      for (let i = 0; i < files.length; i++) {
        if (token.isCancellationRequested) {
          break;
        }

        const file = files[i];
        const fileName = vscode.workspace.asRelativePath(file);

        progress.report({
          message: `(${i + 1}/${files.length}) ${fileName}`,
          increment: 100 / files.length,
        });

        try {
          const document = await vscode.workspace.openTextDocument(file);
          const content = document.getText();
          const originalSize = content.length;

          const result = await client.compress(content, {
            targetRatio: config.compressionRatio,
            modelName: config.modelName,
          });

          // Create backup
          if (config.createBackups) {
            const backupUri = vscode.Uri.file(file.fsPath + ".bak");
            await vscode.workspace.fs.writeFile(backupUri, Buffer.from(content, "utf-8"));
          }

          // Write compressed
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(content.length)
          );
          edit.replace(file, fullRange, result.compressedContent);
          await vscode.workspace.applyEdit(edit);
          await document.save();

          totalOriginal += originalSize;
          totalCompressed += result.compressedContent.length;
          successCount++;
        } catch (error) {
          console.error(`Failed to compress ${fileName}:`, error);
        }
      }
    }
  );

  // Summary
  if (successCount > 0) {
    const reduction = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);
    vscode.window.showInformationMessage(
      `✓ Compressed ${successCount}/${files.length} files: ${totalOriginal} → ${totalCompressed} chars (${reduction}% reduction)`
    );
  } else {
    vscode.window.showErrorMessage("No files were compressed");
  }
}

// ============================================================================
// Command: Restore File from Backup
// ============================================================================

async function restoreFile(fileUri?: vscode.Uri) {
  let uri = fileUri;

  if (!uri) {
    // Try to find backup for current file
    const currentFile = vscode.window.activeTextEditor?.document.uri;
    if (currentFile) {
      uri = vscode.Uri.file(currentFile.fsPath + ".bak");
    }
  }

  if (!uri) {
    vscode.window.showErrorMessage("No file selected");
    return;
  }

  // Determine the backup and original file paths
  let backupPath: string;
  let originalPath: string;

  if (uri.fsPath.endsWith(".bak")) {
    backupPath = uri.fsPath;
    originalPath = uri.fsPath.slice(0, -4); // Remove .bak
  } else {
    originalPath = uri.fsPath;
    backupPath = uri.fsPath + ".bak";
  }

  try {
    // Check if backup exists
    const backupUri = vscode.Uri.file(backupPath);
    const backupContent = await vscode.workspace.fs.readFile(backupUri);

    // Write backup content to original file
    const originalUri = vscode.Uri.file(originalPath);
    await vscode.workspace.fs.writeFile(originalUri, backupContent);

    // Delete backup file
    await vscode.workspace.fs.delete(backupUri);

    vscode.window.showInformationMessage(`✓ Restored ${vscode.workspace.asRelativePath(originalUri)}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Restore failed: ${(error as Error).message}`);
  }
}
