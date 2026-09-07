import {
	ItemView,
	WorkspaceLeaf,
	Notice,
	MarkdownRenderer,
	MarkdownView,
} from "obsidian";
import { ContextService, ActiveNoteContext } from "../services/ContextService";
import { AntigravityClient } from "../services/AntigravityClient";

export const VIEW_TYPE_ANTIGRAVITY = "antigravity-sidebar-view";

export interface AssistantMode {
	id: string;
	label: string;
	placeholder: string;
}

export const MODES: AssistantMode[] = [
	{
		id: "chat",
		label: "💬 アシスタント対話",
		placeholder: "指示または質問を入力... (Shift+Enterで改行)",
	},
	{
		id: "summarize",
		label: "📝 ノート要約・構造化",
		placeholder: "要約・構造化したい内容やノートへの指示を入力...",
	},
	{
		id: "code",
		label: "⚡ コード・スクリプト生成",
		placeholder: "生成したいスクリプトや処理の要件を入力...",
	},
	{
		id: "task",
		label: "🎯 タスク・日報生成",
		placeholder: "日報やタスク化したい活動メモを入力...",
	},
];

export interface AntigravityViewSettingsAccessor {
	autoContext: boolean;
	streamResponse?: boolean;
}

export class AntigravitySidebarView extends ItemView {
	private chatHistoryEl: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private statusBadgeEl: HTMLElement;
	private modeSelectEl: HTMLSelectElement;
	private currentMode: string = "chat";
	private isProcessing: boolean = false;

	private contextService?: ContextService;
	private antigravityClient?: AntigravityClient;
	private getSettings?: () => AntigravityViewSettingsAccessor;

	constructor(
		leaf: WorkspaceLeaf,
		contextService?: ContextService,
		antigravityClient?: AntigravityClient,
		getSettings?: () => AntigravityViewSettingsAccessor
	) {
		super(leaf);
		this.contextService = contextService;
		this.antigravityClient = antigravityClient;
		this.getSettings = getSettings;
	}

	public setServices(
		contextService: ContextService,
		antigravityClient: AntigravityClient,
		getSettings: () => AntigravityViewSettingsAccessor
	): void {
		this.contextService = contextService;
		this.antigravityClient = antigravityClient;
		this.getSettings = getSettings;
	}

	getViewType(): string {
		return VIEW_TYPE_ANTIGRAVITY;
	}

	getDisplayText(): string {
		return "Antigravity Assistant";
	}

	getIcon(): string {
		return "bot";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("antigravity-sidebar-container");

		// Header
		const header = container.createDiv({ cls: "antigravity-header" });

		// Top row: Title and Controls (Status + Clear button)
		const headerTop = header.createDiv({ cls: "antigravity-header-top" });
		const titleArea = headerTop.createDiv({ cls: "antigravity-title-area" });
		titleArea.createEl("h4", { text: "🤖 Antigravity" });

		const headerControls = headerTop.createDiv({ cls: "antigravity-header-controls" });
		this.statusBadgeEl = headerControls.createDiv({
			cls: "antigravity-status-badge ready",
			text: "Ready",
		});

		const clearBtn = headerControls.createEl("button", {
			cls: "antigravity-clear-button",
			attr: {
				"aria-label": "チャット履歴をクリア",
				title: "チャット履歴をクリア",
			},
		});
		clearBtn.setText("🗑️ クリア");
		clearBtn.onclick = () => this.clearChatHistory();

		// Mode selector row
		const modeRow = header.createDiv({ cls: "antigravity-mode-row" });
		modeRow.createEl("span", {
			cls: "antigravity-mode-label",
			text: "モード:",
		});

		this.modeSelectEl = modeRow.createEl("select", {
			cls: "antigravity-mode-select dropdown",
		});

		for (const mode of MODES) {
			this.modeSelectEl.createEl("option", {
				value: mode.id,
				text: mode.label,
			});
		}
		this.modeSelectEl.value = this.currentMode;
		this.modeSelectEl.addEventListener("change", () => {
			this.handleModeChange(this.modeSelectEl.value);
		});

		// Chat history container
		this.chatHistoryEl = container.createDiv({
			cls: "antigravity-chat-history",
		});

		// Initial welcome message
		await this.addWelcomeMessage();

		// Input area
		const inputContainer = container.createDiv({
			cls: "antigravity-input-container",
		});

		this.inputEl = inputContainer.createEl("textarea", {
			cls: "antigravity-textarea",
			attr: {
				placeholder: MODES[0].placeholder,
			},
		});

		this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.handleSubmit();
			}
		});

		// Button bar
		const buttonBar = inputContainer.createDiv({
			cls: "antigravity-button-bar",
		});

		const quickActions = buttonBar.createDiv({
			cls: "antigravity-quick-actions",
		});

		const morningBtn = quickActions.createEl("button", {
			text: "🌅 /morning",
			cls: "antigravity-quick-btn",
		});
		morningBtn.onclick = () => {
			this.inputEl.value = "/morning";
			this.handleSubmit();
		};

		const eveningBtn = quickActions.createEl("button", {
			text: "🌙 /evening",
			cls: "antigravity-quick-btn",
		});
		eveningBtn.onclick = () => {
			this.inputEl.value = "/evening";
			this.handleSubmit();
		};

		const sendBtn = buttonBar.createEl("button", {
			cls: "antigravity-send-button",
			text: "送信",
		});
		sendBtn.onclick = () => this.handleSubmit();
	}

	async onClose(): Promise<void> {
		if (this.chatHistoryEl) {
			this.chatHistoryEl.empty();
		}
		const container = this.containerEl.children[1] as HTMLElement;
		if (container) {
			container.empty();
		}
	}

	/**
	 * 外部（コマンドパレット等）から入力欄にテキストをセットする
	 */
	public setInputText(text: string, autoSubmit: boolean = false): void {
		if (this.inputEl) {
			this.inputEl.value = text;
			this.inputEl.focus();
			if (autoSubmit) {
				this.handleSubmit();
			}
		}
	}

	private async addWelcomeMessage(): Promise<void> {
		await this.addMessage(
			"assistant",
			"こんにちは！**Antigravity AIアシスタント**です。\nVault内のノート整理、タスク管理、コード生成など何でもご相談ください。\n\n上部のドロップダウンからモードを切り替えることで、目的に応じたアシストを利用できます。"
		);
	}

	private clearChatHistory(): void {
		if (!this.chatHistoryEl) return;
		this.chatHistoryEl.empty();
		this.addWelcomeMessage();
		new Notice("チャット履歴をクリアしました");
	}

	private handleModeChange(modeId: string): void {
		this.currentMode = modeId;
		const mode = MODES.find((m) => m.id === modeId);
		if (mode) {
			this.inputEl.placeholder = mode.placeholder;
			new Notice(`モード変更: ${mode.label}`);
		}
	}

	public async addMessage(
		sender: "user" | "assistant",
		text: string,
		contextNote?: string
	): Promise<void> {
		if (!this.chatHistoryEl) return;

		const msgEl = this.chatHistoryEl.createDiv({
			cls: `antigravity-message ${sender}`,
		});

		if (contextNote && sender === "user") {
			const badgeEl = msgEl.createDiv({
				cls: "antigravity-context-badge",
			});
			badgeEl.setText(`📎 ノート: ${contextNote}`);
		}

		const messageContentEl = msgEl.createDiv({
			cls: "antigravity-message-content",
		});

		if (sender === "assistant") {
			messageContentEl.addClass("markdown-rendered");
			await MarkdownRenderer.render(this.app, text, messageContentEl, "", this);
			this.attachActionButtons(msgEl, text);
		} else {
			messageContentEl.setText(text);
		}

		this.scrollToBottom();
	}

	/**
	 * レスポンスメッセージ下部に各種エディタ挿入・置換アクションボタンを配置
	 */
	private attachActionButtons(msgEl: HTMLElement, text: string): void {
		const actionsEl = msgEl.createDiv({
			cls: "antigravity-message-actions",
		});

		// 📋 コピー
		const copyBtn = actionsEl.createEl("button", {
			cls: "antigravity-action-btn",
			attr: { title: "メッセージをクリップボードにコピー" },
		});
		copyBtn.setText("📋 コピー");
		copyBtn.onclick = async () => {
			try {
				await navigator.clipboard.writeText(text);
				new Notice("クリップボードにコピーしました");
			} catch (err) {
				new Notice(`コピーに失敗しました: ${err}`);
			}
		};

		// 🔄 選択範囲を置換
		const replaceBtn = actionsEl.createEl("button", {
			cls: "antigravity-action-btn",
			attr: { title: "エディタの選択範囲をこの回答で置換" },
		});
		replaceBtn.setText("🔄 選択範囲を置換");
		replaceBtn.onclick = () => {
			this.replaceActiveNoteSelection(text);
		};

		// 📍 カーソル位置へ挿入
		const insertCursorBtn = actionsEl.createEl("button", {
			cls: "antigravity-action-btn",
			attr: { title: "現在開いているノートのカーソル位置に挿入" },
		});
		insertCursorBtn.setText("📍 カーソル位置へ挿入");
		insertCursorBtn.onclick = () => {
			this.insertToActiveNote(text, "cursor");
		};

		// 📝 ノート末尾へ挿入
		const insertEndBtn = actionsEl.createEl("button", {
			cls: "antigravity-action-btn",
			attr: { title: "現在開いているノートの末尾に挿入" },
		});
		insertEndBtn.setText("📝 ノート末尾へ挿入");
		insertEndBtn.onclick = () => {
			this.insertToActiveNote(text, "end");
		};

		// コードブロックが含まれている場合は「⚡ コードのみ挿入」ボタンも提供
		const codeBlocks = this.extractCodeBlocks(text);
		if (codeBlocks.length > 0) {
			const insertCodeBtn = actionsEl.createEl("button", {
				cls: "antigravity-action-btn",
				attr: { title: "回答内のコードブロックのみをエディタに挿入" },
			});
			insertCodeBtn.setText("⚡ コードのみ挿入");
			insertCodeBtn.onclick = () => {
				const combinedCode = codeBlocks.join("\n\n");
				this.insertToActiveNote(combinedCode, "cursor");
			};
		}
	}

	/**
	 * Markdownテキストからコードブロック（```で囲まれた部分）の中身を抽出
	 */
	private extractCodeBlocks(markdown: string): string[] {
		const codeBlockRegex = /```[\w-]*\r?\n([\s\S]*?)```/g;
		const blocks: string[] = [];
		let match;
		while ((match = codeBlockRegex.exec(markdown)) !== null) {
			blocks.push(match[1].trim());
		}
		return blocks;
	}

	/**
	 * アクティブノートのエディタ選択範囲を置換する
	 */
	private replaceActiveNoteSelection(text: string): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !activeView.editor) {
			new Notice("アクティブなMarkdownエディタが見つかりません。ノートを開いてから再度お試しください。");
			return;
		}

		const editor = activeView.editor;
		const selection = editor.getSelection();

		if (!selection) {
			// 選択範囲がない場合はカーソル位置に挿入
			editor.replaceSelection(text);
			new Notice("選択範囲がなかったため、カーソル位置に挿入しました");
			return;
		}

		editor.replaceSelection(text);
		new Notice("選択範囲を置換しました");
	}

	/**
	 * アクティブノートのエディタへテキストを挿入する
	 */
	private insertToActiveNote(text: string, position: "end" | "cursor"): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !activeView.editor) {
			new Notice("アクティブなMarkdownエディタが見つかりません。ノートを開いてから再度お試しください。");
			return;
		}

		const editor = activeView.editor;
		if (position === "cursor") {
			editor.replaceSelection(text);
			new Notice("カーソル位置に挿入しました");
		} else if (position === "end") {
			const lineCount = editor.lineCount();
			const lastLineContent = editor.getLine(lineCount - 1);
			const prefix = lastLineContent.trim().length > 0 ? "\n\n" : "\n";
			editor.replaceRange(`${prefix}${text}\n`, {
				line: lineCount,
				ch: 0,
			});
			new Notice("ノート末尾に挿入しました");
		}
	}

	private scrollToBottom(): void {
		if (!this.chatHistoryEl) return;
		this.chatHistoryEl.scrollTo({
			top: this.chatHistoryEl.scrollHeight,
			behavior: "smooth",
		});
	}

	private async handleSubmit(): Promise<void> {
		if (this.isProcessing) {
			new Notice("現在リクエストを処理中です。しばらくお待ちください。");
			return;
		}

		const prompt = this.inputEl.value.trim();
		if (!prompt) return;

		this.isProcessing = true;
		this.inputEl.value = "";

		// 1. autoContext 設定確認 & コンテキスト抽出
		const settings = this.getSettings ? this.getSettings() : { autoContext: true, streamResponse: true };
		let noteContext: ActiveNoteContext | null = null;

		if (settings.autoContext && this.contextService) {
			noteContext = this.contextService.getActiveNoteContext();
		}

		// 2. ユーザーメッセージをUIに表示
		await this.addMessage("user", prompt, noteContext ? noteContext.fileName : undefined);

		// 3. 送信中ステータス更新
		this.statusBadgeEl.removeClass("ready");
		this.statusBadgeEl.addClass("busy");
		this.statusBadgeEl.setText("Thinking...");

		// 4. アシスタントメッセージ用DOM枠を作成（ストリーミング受信用）
		const msgEl = this.chatHistoryEl.createDiv({
			cls: "antigravity-message assistant",
		});
		const messageContentEl = msgEl.createDiv({
			cls: "antigravity-message-content",
		});
		const streamingPreEl = messageContentEl.createEl("div", {
			cls: "antigravity-streaming-text",
		});
		streamingPreEl.setText("思考中...");
		this.scrollToBottom();

		let accumulatedResponse = "";

		try {
			if (this.antigravityClient) {
				const finalResponse = await this.antigravityClient.sendMessage(
					prompt,
					noteContext?.formattedContext,
					this.currentMode,
					(chunkText: string) => {
						this.statusBadgeEl.setText("Streaming...");
						accumulatedResponse += chunkText;
						streamingPreEl.setText(accumulatedResponse);
						this.scrollToBottom();
					}
				);

				// 受信完了後、正式に MarkdownRenderer でレンダリング
				messageContentEl.empty();
				messageContentEl.addClass("markdown-rendered");
				await MarkdownRenderer.render(
					this.app,
					finalResponse || accumulatedResponse,
					messageContentEl,
					"",
					this
				);

				// エディタ挿入・置換アクションボタン群を付加
				this.attachActionButtons(msgEl, finalResponse || accumulatedResponse);
			} else {
				// クライアント未注入時のフォールバック
				messageContentEl.empty();
				messageContentEl.addClass("markdown-rendered");
				const errorMarkdown = "> [!CAUTION]\n> AntigravityClient が初期化されていません。プラグインを再読み込みしてください。";
				await MarkdownRenderer.render(this.app, errorMarkdown, messageContentEl, "", this);
			}
		} catch (error: any) {
			messageContentEl.empty();
			messageContentEl.addClass("markdown-rendered");
			const errorMarkdown = `> [!CAUTION]\n> 通信エラーが発生しました: ${error.message || error}`;
			await MarkdownRenderer.render(this.app, errorMarkdown, messageContentEl, "", this);
			new Notice(`エラーが発生しました: ${error.message || error}`);
		} finally {
			this.isProcessing = false;
			this.statusBadgeEl.removeClass("busy");
			this.statusBadgeEl.addClass("ready");
			this.statusBadgeEl.setText("Ready");
			this.scrollToBottom();
		}
	}
}
