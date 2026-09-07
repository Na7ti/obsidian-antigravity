import { Plugin, WorkspaceLeaf, App, PluginSettingTab, Setting } from "obsidian";
import { AntigravitySidebarView, VIEW_TYPE_ANTIGRAVITY } from "./views/SidebarView";
import { ContextService } from "./services/ContextService";
import { AntigravityClient } from "./services/AntigravityClient";

export interface AntigravityPluginSettings {
	cliPath: string;
	autoContext: boolean;
	streamResponse: boolean;
}

const DEFAULT_SETTINGS: AntigravityPluginSettings = {
	cliPath: "agy",
	autoContext: true,
	streamResponse: true,
};

export default class AntigravityPlugin extends Plugin {
	settings: AntigravityPluginSettings;
	contextService: ContextService;
	antigravityClient: AntigravityClient;

	async onload(): Promise<void> {
		await this.loadSettings();

		// ContextService & AntigravityClient の初期化
		this.contextService = new ContextService(this.app);
		this.antigravityClient = new AntigravityClient(this.settings.cliPath);

		// カスタムサイドバーViewの登録
		this.registerView(
			VIEW_TYPE_ANTIGRAVITY,
			(leaf: WorkspaceLeaf) =>
				new AntigravitySidebarView(
					leaf,
					this.contextService,
					this.antigravityClient,
					() => ({
						autoContext: this.settings.autoContext,
						streamResponse: this.settings.streamResponse,
					})
				)
		);

		// リボンアイコン (左リボンにbotアイコン追加)
		this.addRibbonIcon("bot", "Antigravity を開く", () => {
			this.activateView();
		});

		// コマンドパレット登録: サイドバーを開く
		this.addCommand({
			id: "open-antigravity-sidebar",
			name: "サイドバーを開く",
			callback: () => {
				this.activateView();
			},
		});

		// コマンドパレット登録: 選択範囲を Antigravity に送信
		this.addCommand({
			id: "send-selection-to-antigravity",
			name: "選択範囲を Antigravity に送信",
			editorCallback: async (editor) => {
				const selection = editor.getSelection();
				if (selection && selection.trim().length > 0) {
					await this.activateView();
					const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ANTIGRAVITY);
					if (leaves.length > 0 && leaves[0].view instanceof AntigravitySidebarView) {
						leaves[0].view.setInputText(
							`以下のテキストについて確認・解説してください:\n\n\`\`\`markdown\n${selection.trim()}\n\`\`\``
						);
					}
				}
			},
		});

		// 設定タブの追加
		this.addSettingTab(new AntigravitySettingTab(this.app, this));
	}

	async onunload(): Promise<void> {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_ANTIGRAVITY);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ANTIGRAVITY);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			// 右側サイドバーに展開
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_ANTIGRAVITY,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		if (this.antigravityClient) {
			this.antigravityClient.setCliPath(this.settings.cliPath);
		}
	}
}

class AntigravitySettingTab extends PluginSettingTab {
	plugin: AntigravityPlugin;

	constructor(app: App, plugin: AntigravityPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Antigravity Assistant 設定" });

		new Setting(containerEl)
			.setName("Antigravity コマンド / CLI パス")
			.setDesc("Antigravity 実行コマンド名またはバイナリの絶対パス（デフォルト: agy）")
			.addText((text) =>
				text
					.setPlaceholder("agy")
					.setValue(this.plugin.settings.cliPath)
					.onChange(async (value) => {
						this.plugin.settings.cliPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("アクティブノートのコンテキスト自動付与")
			.setDesc("質問時に現在開いているノートのタイトルや選択テキストを自動でプロンプトに添付します")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoContext)
					.onChange(async (value) => {
						this.plugin.settings.autoContext = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("ストリーミング応答")
			.setDesc("AIエージェントからの応答を逐次ストリーミング受信します")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.streamResponse)
					.onChange(async (value) => {
						this.plugin.settings.streamResponse = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
