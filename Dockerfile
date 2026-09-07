FROM node:20-bookworm-slim

# 基本ツールのインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# パッケージ定義を先にコピーして依存関係をキャッシュ
COPY package.json ./

RUN npm install

# ソースコード全体をコピー
COPY . .

# 開発用デフォルトコマンド（ホットリロードビルド）
CMD ["npm", "run", "dev"]

