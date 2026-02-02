# Compresr

**Compress markdown context files to reduce token usage with AI assistants.**

Reduce the size of your `CLAUDE.md`, `COPILOT.md`, and other context files while preserving meaning. Save tokens and money when working with AI coding assistants.

## ✨ Features

- **🔍 Preview Changes** — See a diff before applying compression
- **📄 Compress Single File** — Right-click any `.md` file or use the command palette
- **📁 Compress Workspace** — Process all markdown files at once
- **🔄 Easy Restore** — Automatic backups let you restore anytime
- **⚡ Quick Settings** — Fast access with `Cmd+Shift+,` (Mac) / `Ctrl+Shift+,` (Windows)

## 🚀 Quick Start

1. Install the extension
2. Open Command Palette (`Cmd+Shift+P`)
3. Run `Compresr: Set API Key`
4. Get your free API key at [compresr.ai](https://compresr.ai)
5. Open a markdown file and run `Compresr: Quick Settings ⚡`

## 📖 Usage

### Quick Settings Menu

Press `Cmd+Shift+,` (Mac) or `Ctrl+Shift+,` (Windows) to open the quick menu:

| Option | Description |
|--------|-------------|
| **Compress This File** | Compress current file with preview |
| **Compress All Markdown Files** | Process entire workspace |
| **Model** | Select compression model |
| **Compression Ratio** | Set target size (10% = max, 90% = light) |
| **API Key** | Configure your credentials |

### Compression Ratio

| Ratio | Description |
|-------|-------------|
| 10-20% | Aggressive — smallest size, may lose detail |
| 30-40% | Strong — good balance |
| 50-60% | Moderate — preserves most content |
| 70-90% | Light — minimal changes |

### Preview & Apply

When you compress a file, Compresr shows a **side-by-side diff**. Review the changes, then:
- ✓ **Apply Changes** — Save the compressed version
- ✗ **Discard** — Keep the original

Backups are automatically created as `.bak` files.

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `compresr.apiKey` | `""` | Your API key from [compresr.ai](https://compresr.ai) |
| `compresr.compressionRatio` | `0.3` | Target size (0.3 = 30% of original) |
| `compresr.modelName` | `cmprsr_v1` | Compression model |
| `compresr.createBackups` | `true` | Create .bak files before compressing |

## ⌨️ Keyboard Shortcuts

| Command | Mac | Windows/Linux |
|---------|-----|---------------|
| Quick Settings | `Cmd+Shift+,` | `Ctrl+Shift+,` |
| Compress File | `Cmd+Shift+C` | `Ctrl+Shift+C` |

## � Privacy & Data

When you compress a file, Compresr sends the file content to our API (`api.compresr.ai`) for processing. Here's what you should know:

| Aspect | Details |
|--------|---------|
| **Data Sent** | Only the content of files you explicitly compress |
| **API Key** | Required for authentication; stored locally in VS Code settings |
| **Backups** | Created locally on your machine (`.bak` files) |

We do not:
- Share data with third parties

For full details, see our [Privacy Policy](https://compresr.ai/privacy).

## 🔗 Links

- [Get API Key](https://compresr.ai)
- [Documentation](https://compresr.ai/docs/overview)
- [GitHub](https://github.com/Compresr-ai/compresr-vscode)
- [Report Issues](https://github.com/Compresr-ai/compresr-vscode/issues)

## 📄 License

MIT © [Compresr](https://compresr.ai)

The extension source code is open source under the MIT license. The Compresr API service is provided under separate [Terms of Service](https://compresr.ai/terms).
