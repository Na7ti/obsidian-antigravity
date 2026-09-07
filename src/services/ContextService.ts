import { App, MarkdownView, TFile } from "obsidian";

export interface ActiveNoteContext {
	file: TFile | null;
	fileName: string;
	filePath: string;
	frontmatter: Record<string, any> | null;
	selectedText: string;
	surroundingText?: string;
	summaryText?: string;
	formattedContext: string;
}

export class ContextService {
	constructor(private app: App) {}

	/**
	 * 現在アクティブなノートのコンテキスト（ファイルパス、Frontmatter、選択テキスト等）を抽出する
	 */
	public getActiveNoteContext(): ActiveNoteContext | null {
		// 1. アクティブな MarkdownView / TFile の取得
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeFile: TFile | null = activeView?.file ?? this.app.workspace.getActiveFile();

		if (!activeFile) {
			return null;
		}

		const fileName = activeFile.name;
		const filePath = activeFile.path;

		// 2. YAML Frontmatter（tags, status, date等）の取得
		let frontmatter: Record<string, any> | null = null;
		const fileCache = this.app.metadataCache.getFileCache(activeFile);
		if (fileCache?.frontmatter) {
			// position 等の内部用メタデータを除外したクリーンなオブジェクトを作成
			const { position, ...cleanFrontmatter } = fileCache.frontmatter;
			frontmatter = cleanFrontmatter;
		}

		// 3. エディタの選択範囲テキスト、またはカーソル周辺・サマリーの取得
		let selectedText = "";
		let surroundingText: string | undefined;
		let summaryText: string | undefined;

		if (activeView && activeView.editor) {
			const editor = activeView.editor;
			const selection = editor.getSelection();

			if (selection && selection.trim().length > 0) {
				selectedText = selection;
			} else {
				// 選択がない場合: カーソル周辺のコンテキスト行 (前後5行)
				const cursor = editor.getCursor();
				const totalLines = editor.lineCount();
				const startLine = Math.max(0, cursor.line - 5);
				const endLine = Math.min(totalLines - 1, cursor.line + 5);

				const surroundingLines: string[] = [];
				for (let i = startLine; i <= endLine; i++) {
					const prefix = i === cursor.line ? "👉 " : "   ";
					surroundingLines.push(`${prefix}${editor.getLine(i)}`);
				}
				surroundingText = surroundingLines.join("\n");

				// 先頭サマリー（先頭10行、最大1000文字）
				const summaryLineCount = Math.min(totalLines, 10);
				const summaryLines: string[] = [];
				for (let i = 0; i < summaryLineCount; i++) {
					summaryLines.push(editor.getLine(i));
				}
				summaryText = summaryLines.join("\n").slice(0, 1000);
			}
		}

		// 4. フォーマット済みのプロンプト用コンテキスト文字列（Markdown形式）を生成
		const formattedContext = this.formatContextMarkdown({
			fileName,
			filePath,
			frontmatter,
			selectedText,
			surroundingText,
			summaryText,
		});

		return {
			file: activeFile,
			fileName,
			filePath,
			frontmatter,
			selectedText,
			surroundingText,
			summaryText,
			formattedContext,
		};
	}

	/**
	 * コンテキスト情報を LLM / Agent プロンプト用の Markdown 形式に整形する
	 */
	private formatContextMarkdown(data: {
		fileName: string;
		filePath: string;
		frontmatter: Record<string, any> | null;
		selectedText: string;
		surroundingText?: string;
		summaryText?: string;
	}): string {
		const sections: string[] = [];

		sections.push(`### 📄 Active Note Context\n- **File**: \`${data.filePath}\``);

		if (data.frontmatter && Object.keys(data.frontmatter).length > 0) {
			const fmEntries = Object.entries(data.frontmatter);
			const fmLines: string[] = [];
			for (const [key, val] of fmEntries) {
				if (Array.isArray(val)) {
					fmLines.push(`${key}: [${val.join(", ")}]`);
				} else if (typeof val === "object" && val !== null) {
					fmLines.push(`${key}: ${JSON.stringify(val)}`);
				} else {
					fmLines.push(`${key}: ${val}`);
				}
			}
			sections.push(`**Frontmatter (Metadata):**\n\`\`\`yaml\n${fmLines.join("\n")}\n\`\`\``);
		}

		if (data.selectedText) {
			sections.push(`**Selected Text in Note:**\n\`\`\`markdown\n${data.selectedText}\n\`\`\``);
		} else if (data.surroundingText) {
			sections.push(
				`**Cursor Context in Note (around cursor line 👉):**\n\`\`\`markdown\n${data.surroundingText}\n\`\`\``
			);
			if (data.summaryText && data.summaryText !== data.surroundingText) {
				sections.push(
					`**Note Header / Excerpt:**\n\`\`\`markdown\n${data.summaryText}\n\`\`\``
				);
			}
		} else if (data.summaryText) {
			sections.push(
				`**Note Content Excerpt:**\n\`\`\`markdown\n${data.summaryText}\n\`\`\``
			);
		}

		return sections.join("\n\n");
	}
}
