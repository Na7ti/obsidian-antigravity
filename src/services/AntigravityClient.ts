import { spawn, ChildProcess } from "child_process";

export interface AntigravityClientOptions {
	cliPath?: string;
	timeoutMs?: number;
}

export class AntigravityClient {
	private cliPath: string;
	private timeoutMs: number;

	constructor(cliPath: string = "agy", timeoutMs: number = 60000) {
		this.cliPath = cliPath;
		this.timeoutMs = timeoutMs;
	}

	public setCliPath(cliPath: string): void {
		this.cliPath = cliPath.trim() || "agy";
	}

	public getCliPath(): string {
		return this.cliPath;
	}

	public setTimeoutMs(timeoutMs: number): void {
		this.timeoutMs = timeoutMs;
	}

	/**
	 * Antigravity CLI がシステムで実行可能かどうかを検証する
	 */
	public async isCliAvailable(): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			try {
				const child = spawn(this.cliPath, ["--version"], {
					shell: false,
				});

				const timer = setTimeout(() => {
					try {
						child.kill("SIGKILL");
					} catch (_) {}
					resolve(false);
				}, 3000);

				child.on("error", () => {
					clearTimeout(timer);
					resolve(false);
				});

				child.on("close", (code) => {
					clearTimeout(timer);
					resolve(code === 0);
				});
			} catch (_) {
				resolve(false);
			}
		});
	}

	/**
	 * Antigravity CLI へメッセージ（プロンプトおよびコンテキスト）を送信し、応答を取得する
	 * @param prompt ユーザーのプロンプト
	 * @param context ノート等のフォーマット済みコンテキスト
	 * @param mode アシスタントモード (chat, summarize, code, task など)
	 * @param onChunk ストリーミング受信時のコールバック
	 */
	public async sendMessage(
		prompt: string,
		context?: string,
		mode: string = "chat",
		onChunk?: (text: string) => void
	): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			let resolved = false;
			let accumulatedOutput = "";
			let errorOutput = "";

			// プロンプトとコンテキストの統合
			const fullPayload = context && context.trim().length > 0
				? `${context}\n\n---\n\n${prompt}`
				: prompt;

			// CLI 引数の組み立て
			const args: string[] = [];
			if (mode) {
				args.push("--mode", mode);
			}

			let child: ChildProcess;
			try {
				child = spawn(this.cliPath, args, {
					shell: false,
					env: {
						...process.env,
						ANTIGRAVITY_MODE: mode,
					},
				});
			} catch (err: any) {
				const fallback = this.generateFallbackResponse(
					prompt,
					context,
					mode,
					`プロセス起動に失敗しました: ${err.message || err}`
				);
				onChunk?.(fallback);
				return resolve(fallback);
			}

			// タイムアウト監視
			const timer = setTimeout(() => {
				if (resolved) return;
				resolved = true;
				try {
					child.kill("SIGTERM");
					setTimeout(() => {
						try {
							child.kill("SIGKILL");
						} catch (_) {}
					}, 2000);
				} catch (_) {}

				const timeoutMsg = `\n\n> [!WARNING]\n> 処理がタイムアウトしました (${this.timeoutMs / 1000}秒)。`;
				accumulatedOutput += timeoutMsg;
				onChunk?.(timeoutMsg);
				resolve(accumulatedOutput);
			}, this.timeoutMs);

			// 標準入力 (stdin) にプロンプトペイロードを流し込み
			try {
				if (child.stdin) {
					child.stdin.write(fullPayload, "utf-8", (err) => {
						if (!err) {
							child.stdin?.end();
						}
					});
				}
			} catch (err) {
				console.warn("[AntigravityClient] stdin write warning:", err);
			}

			// stdout (ストリーミング受信)
			if (child.stdout) {
				child.stdout.on("data", (chunk: Buffer) => {
					const text = chunk.toString("utf-8");
					accumulatedOutput += text;
					if (onChunk) {
						onChunk(text);
					}
				});
			}

			// stderr (エラー補足)
			if (child.stderr) {
				child.stderr.on("data", (chunk: Buffer) => {
					errorOutput += chunk.toString("utf-8");
				});
			}

			// プロセスエラーハンドリング（ENOENT: コマンド不在など）
			child.on("error", (err: any) => {
				if (resolved) return;
				resolved = true;
				clearTimeout(timer);

				const isNotFound = err.code === "ENOENT" || err.message?.includes("ENOENT");
				const reason = isNotFound
					? `コマンド '${this.cliPath}' が見つかりませんでした。`
					: `プロセス実行エラー: ${err.message || err}`;

				const fallback = this.generateFallbackResponse(prompt, context, mode, reason);
				onChunk?.(fallback);
				resolve(fallback);
			});

			// プロセス終了処理
			child.on("close", (code: number | null) => {
				if (resolved) return;
				resolved = true;
				clearTimeout(timer);

				if (code === 0) {
					// 正常終了
					if (!accumulatedOutput.trim()) {
						accumulatedOutput = "*(Antigravity CLI からの出力はありませんでした)*";
					}
					resolve(accumulatedOutput);
				} else {
					// 非ゼロ終了
					// もし stdout に既に出力があればそれを返しつつ警告を添える
					if (accumulatedOutput.trim().length > 0) {
						resolve(accumulatedOutput);
					} else {
						// stdout が空でエラー終了した場合はフォールバックガイダンス
						const reason = errorOutput.trim()
							? `終了コード ${code}: ${errorOutput.trim()}`
							: `プロセスが終了コード ${code} で異常終了しました。`;
						const fallback = this.generateFallbackResponse(prompt, context, mode, reason);
						onChunk?.(fallback);
						resolve(fallback);
					}
				}
			});
		});
	}

	/**
	 * CLIが未検出または実行不能な場合のガイダンスおよびモック応答を生成
	 */
	private generateFallbackResponse(
		prompt: string,
		context?: string,
		mode: string = "chat",
		reason?: string
	): string {
		let modePrefix = "";
		if (mode === "summarize") {
			modePrefix = "### 📝 ノート要約 (ガイダンス)\n\n";
		} else if (mode === "code") {
			modePrefix = "### ⚡ スクリプト生成 (ガイダンス)\n\n";
		} else if (mode === "task") {
			modePrefix = "### 🎯 タスク・日報 (ガイダンス)\n\n";
		}

		const lines: string[] = [];

		lines.push("> [!WARNING]");
		lines.push(`> **Antigravity CLI (\`${this.cliPath}\`) と通信できませんでした。**`);
		if (reason) {
			lines.push(`> 原因: ${reason}`);
		}
		lines.push(">");
		lines.push("> **対処方法:**");
		lines.push(`> 1. Antigravity CLI がインストールされているか確認してください。`);
		lines.push(`> 2. プラグイン設定（Settings → Antigravity Assistant）で正しい CLI 実行パス（例: \`/usr/local/bin/agy\` や \`~/.cargo/bin/agy\`）を指定してください。`);
		lines.push("");
		lines.push("---");
		lines.push("");
		lines.push(`${modePrefix}#### 🤖 シミュレーション応答`);
		lines.push(`**受信モード**: \`${mode}\``);
		lines.push(`**リクエスト内容**: \n> ${prompt}`);

		if (context) {
			lines.push("");
			lines.push("<details><summary>📎 添付されたノートコンテキスト (展開)</summary>\n");
			lines.push(context);
			lines.push("\n</details>");
		}

		lines.push("");
		lines.push("```markdown");
		lines.push("# 実行プラン (Ready for execution)");
		lines.push("- [x] ノートコンテキストの抽出完了");
		lines.push("- [x] リクエストパラメータのバインド完了");
		lines.push("- [ ] Antigravity エージェントへの実行委譲 (CLI待機中)");
		lines.push("```");

		return lines.join("\n");
	}
}
