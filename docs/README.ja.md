# AOps

> 他の言語: [English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md)

**AOps**は、AIエージェントとプロンプトの管理、バージョン管理、運用のためのオープンソースAgentOpsプラットフォームです。

「GitHub for Prompts」— プロンプトバージョン管理の中央ハブとしてスタートし、モニタリング、トレーシング、コスト追跡、評価を含む総合的なAgentOpsプラットフォームへと発展しています。

---

## 主な機能

### プロンプト管理
- **エージェント**と**チェーン**単位でプロンプトを構成
- 各チェーンは**ペルソナ**（役割）と**コンテンツ**（プロンプト本文、Markdown対応）で構成
- チェーンごとの**バージョン履歴** — 編集するたびに新しいバージョンが自動生成

### バージョン管理
- Gitスタイルの**コミットメッセージ**で変更を記録
- **Diffビューア**でバージョン間を比較
- 不変のバージョン履歴 — 過去のバージョンは変更されない

### APIキー管理
- エージェントごとにAPIキーを発行・失効
- キーは作成時に**一度だけ**表示（生キーはサーバーに保存されない）
- サーバーURLがキーに内蔵 — クライアント側での追加設定不要

### チェーンフロートレーシング
- [`aops` Python SDK](https://github.com/cow-coding/aops-python)によるエージェント実行追跡
- `aops.run()`ブロックが呼び出されたチェーン、順序、レイテンシを自動記録
- UIでの**フロー可視化**: チェーン呼び出しシーケンスの有向グラフ（呼び出し回数、平均レイテンシ表示）
- 実行されていないチェーンは薄く表示 — 隠されたチェーンなし

### セルフホスティング
- **Docker Compose**または**Kubernetes**でデプロイ
- 内蔵PostgreSQLまたは外部データベース接続に対応
- 詳細は[セルフホスティングガイド](./self-hosting.ja.md)を参照

---

## ロードマップ

| カテゴリ | 状態 | 詳細 |
|----------|------|------|
| **プロンプト管理** | 完了 | チェーン、ペルソナ、バージョン履歴、ロールバック |
| **トレーシング** | 完了 | `aops.run()`コンテキストマネージャ、Flowタブ可視化 |
| **APIキー管理** | 完了 | エージェントごとのキー、1回表示 |
| **セルフホスティング** | 完了 | Docker Compose、Kubernetesマニフェスト |
| **モニタリング** | 予定 | エージェント実行ログ、リクエスト/レスポンス追跡 |
| **コスト追跡** | 予定 | エージェント/チェーンごとのトークン使用量とコスト |
| **評価** | 予定 | プロンプト評価パイプライン、A/Bテスト |
| **コラボレーション** | 予定 | チームアクセス制御、バージョンコメント |

---

## プロジェクト構造

```
AOps/
├── frontend/          # React 18 + TypeScript + MUI + Vite
├── backend/           # FastAPI + SQLAlchemy async + PostgreSQL + Alembic
├── k8s/               # Kubernetesマニフェスト
└── docs/              # ドキュメント
```

## 要件

| | バージョン |
|--|-----------|
| Node.js | >= 18 |
| Python | >= 3.12 |
| PostgreSQL | >= 14 |

---

## はじめに

### 方法1: Docker Compose（推奨）

```bash
cp .env.example .env
# .envを編集 — POSTGRES_PASSWORDとSECRET_KEYを変更

docker compose --profile db up -d
```

外部DB設定とKubernetesデプロイについては[セルフホスティングガイド](./self-hosting.ja.md)を参照してください。

### 方法2: ローカル開発

**バックエンド:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload
```

`http://localhost:8000`でアクセスできます。

**フロントエンド:**

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:3000`でアクセスできます。開発モードでは`/api`リクエストがバックエンドにプロキシされます。

---

## APIリファレンス

| パス | 説明 |
|------|------|
| `GET /health` | ヘルスチェック |
| `GET /api/v1/` | APIルート |
| `GET /docs` | Swagger UI |
| `GET /api/v1/openapi.json` | OpenAPIスペック |
| `POST /api/v1/agents/:id/runs` | エージェント実行記録（X-API-Key） |
| `GET /api/v1/agents/:id/flow` | エージェントのチェーンフローグラフ |

---

## 環境変数

プロジェクトルートに`.env`ファイルを作成してデフォルト値をオーバーライドします。

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PROJECT_NAME` | AOps | プロジェクト名 |
| `VERSION` | 0.1.0 | APIバージョン |
| `API_V1_PREFIX` | /api/v1 | APIパスプレフィックス |
| `CORS_ORIGINS` | ["http://localhost:3000"] | 許可オリジン |
| `DATABASE_URL` | — | PostgreSQL接続文字列 |
| `SECRET_KEY` | — | JWT署名シークレット |

---

## SDK

[aops Python SDK](https://github.com/cow-coding/aops-python)を使用して、エージェントコードからプロンプトを取得し実行トレースを記録します:

```python
import aops

aops.init(api_key="aops_...", agent="my-agent")

# 共通チェーン — 一度だけ取得、リクエストごとのトレースから除外
system_prompt = aops.pull("system")

with aops.run():
    # aops.run()内で取得したチェーンは自動的にトレースされる
    classify_prompt = aops.pull("classify")
    category = classify(classify_prompt, user_input)

    response_prompt = aops.pull(f"respond-{category}")
    return respond(system_prompt, response_prompt, user_input)
```

トレースはブロック終了時にバックエンドに送信され、エージェント詳細ページの**Flow**タブで可視化されます。

---

## コントリビューション

AOpsはオープンソースプロジェクトです。イシューやプルリクエストによる貢献を歓迎します。

## ライセンス

[MIT](../LICENSE)
