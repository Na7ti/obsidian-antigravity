import fs from "fs";
import path from "path";
import process from "process";

// デプロイ先: 環境変数 OBSIDIAN_VAULT_PATH が指定されていればそれを使用し、なければ相対パスをフォールバックとして使用
const defaultVaultPath = path.resolve(process.cwd(), "../obsidian-vault");
const vaultDir = process.env.OBSIDIAN_VAULT_PATH || defaultVaultPath;
const pluginTargetDir = path.join(vaultDir, ".obsidian", "plugins", "obsidian-antigravity");

try {
	if (!fs.existsSync(pluginTargetDir)) {
		fs.mkdirSync(pluginTargetDir, { recursive: true });
	}

	const files = ["main.js", "manifest.json", "styles.css"];
	for (const file of files) {
		const src = path.resolve(process.cwd(), file);
		const dest = path.join(pluginTargetDir, file);
		if (fs.existsSync(src)) {
			fs.copyFileSync(src, dest);
			console.log(`[Deploy] Copied ${file} -> ${dest}`);
		} else {
			console.warn(`[Deploy] Warning: File not found ${src}`);
		}
	}
	console.log(`[Deploy] Successfully deployed to: ${pluginTargetDir}`);
} catch (err) {
	console.error("[Deploy] Error during deployment:", err);
	process.exit(1);
}

