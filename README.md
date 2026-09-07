# Antigravity Assistant for Obsidian

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Desktop Only](https://img.shields.io/badge/Platform-Desktop%20Only-blue.svg)](#-prerequisites-前提条件)
[![Maintenance: As--Is](https://img.shields.io/badge/Maintenance-As--Is%20%2F%20Unmaintained-red.svg)](#-disclaimer--maintenance-免責事項--保守について)

Seamlessly integrates the **Antigravity AI personal assistant** directly into Obsidian's sidebar. 
Interact with your AI assistant while browsing and editing notes, featuring intelligent vault context extraction and one-click editor operations.

---

## ⚠️ Disclaimer & Maintenance (免責事項・保守について)

> [!IMPORTANT]
> **Please read before using / ご利用前にお読みください**
>
> 1. **Personal Hobby Project (自己利用・気まぐれ公開):**  
>    This plugin was originally built purely for personal daily use to enhance the author's own Obsidian workflow. It is published on a whim as an open-source project in case anyone else finds it useful.  
>    *(本プラグインは作者個人の日常的な Obsidian 環境を便利にするために作成した自己利用目的のツールであり、気まぐれで公開した個人趣味プロジェクトです)*
>
> 2. **Built Primarily by AI (AI 主体での開発):**  
>    Architecture, TypeScript codebase, Docker environment, and documentation were constructed primarily through autonomous AI coding assistants (multi-agent orchestration).  
>    *(本リポジトリの設計・コード・環境構築・ドキュメントの大部分は、AI エージェント主導で生成・構築されています)*
>
> 3. **No Active Maintenance or Support (保守・サポート対応なし):**  
>    **This project is provided "AS-IS" without any warranty.** There are no plans for active maintenance, regular bug fixes, feature requests implementation, or compatibility updates for future Obsidian versions. Feel free to fork, customize, or improve it for your own needs!  
>    *(将来的な Obsidian のアップデート追従、バグ修正、機能追加要望などの**継続的な保守・サポートは見込めません**。現状有姿（AS-IS）での提供となりますので、ご自身の環境に合わせて自由にフォーク・改修してご利用ください)*

---

## ✨ Features (主な機能)

- **🤖 Dedicated Sidebar View**: Always-accessible AI panel in Obsidian's right or left leaf.
- **📄 Smart Vault Context Extraction**: Automatically grabs active note filename, path, YAML frontmatter, cursor lines (±5 lines), and selection.
- **📝 One-Click Editor Integration**:
  - 📍 **Insert at Cursor**: Place AI output directly at your cursor position.
  - 📝 **Append to Note**: Automatically append output to the bottom of the active note.
  - 🔄 **Replace Selection**: Overwrite selected text with AI response.
  - ⚡ **Insert Code Only**: Automatically detects code blocks (` ``` `) in the response and inserts only the code.
  - 📋 **Copy**: Copy response to clipboard with native Obsidian notice.
- **🎨 Obsidian Native Design**: Fully integrated with Obsidian's theme CSS variables (light and dark modes).
- **⚡ Mode Switcher**: Quick toggle between Chat, Note Summarization, Code Generation, and Daily Task generation.
- **🌅 Morning / 🌙 Evening Shortcuts**: One-click quick action buttons for daily briefings and evening reflections.

---

## 📋 Prerequisites (前提条件)

1. **Desktop Obsidian Only**: Due to local CLI child process execution, this plugin runs on desktop platforms (Linux, macOS, Windows).
2. **Antigravity CLI**: Ensure `agy` command is available in your PATH (or specify its absolute binary path in plugin settings).
   *(※ If CLI is not found, a friendly simulation guidance message will be displayed without crashing)*

---

## 🚀 Installation & Getting Started (インストールと使い方)

### Local Manual Installation (ローカル導入)
1. Download `main.js`, `manifest.json`, and `styles.css` from the repository or build them locally.
2. Place them in your vault's plugin directory:
   ```bash
   <your-vault>/.obsidian/plugins/obsidian-antigravity/
   ```
3. Open Obsidian **Settings > Community plugins**, click **Reload plugins**, and toggle **Antigravity Assistant** ON.
4. Click the 🤖 robot icon on the left ribbon, or press `Ctrl+P` (`Cmd+P`) and choose **`Antigravity: サイドバーを開く`**.

---

## ⚙️ Settings (設定項目)

- **CLI Path**: Custom path to the Antigravity binary (default: `agy`).
- **Auto Context**: Automatically attaches active note path and metadata to prompts.
- **Streaming Response**: Real-time token streaming in the sidebar view.

---

## 🛡️ Privacy & Security (セキュリティとプライバシー)

- **100% Local Execution**: Communicates exclusively with your local CLI via stdin pipes without using system shell (`shell: false`).
- **Zero Third-Party Telemetry**: Does not send any note contents, logs, or metrics to external servers.
- **No InnerHTML / Safe DOM**: Rendered strictly using Obsidian's native `MarkdownRenderer` and secure DOM APIs.

---

## 🐳 For Developers (Docker 開発環境)

For those who wish to modify or build the plugin themselves:

```bash
# 1. Watch mode for development
docker compose up app

# 2. Production build (generates main.js)
docker compose run --rm build

# 3. TypeScript type check
docker compose run --rm check

# 4. Build and deploy to local vault
OBSIDIAN_VAULT_PATH=/path/to/vault docker compose run --rm deploy
```

---

## 📄 License

MIT License © 2026
