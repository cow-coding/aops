# セルフホスティングガイド

> 他の言語: [English](./self-hosting.md) | [한국어](./self-hosting.ko.md) | [中文](./self-hosting.zh.md)

Docker ComposeまたはKubernetesを使用してAOpsをセルフホスティングする方法を説明します。

---

## 前提条件

| 要件 | Docker Compose | Kubernetes |
|------|----------------|------------|
| Docker | v20.10+ | v20.10+ |
| Docker Compose | v2.0+ | — |
| kubectl | — | v1.24+ |
| クラスター | — | minikube、kind、EKS、GKEなど |

---

## Option 1: Docker Compose

### クイックスタート（内蔵DB付き）

```bash
# 1. 環境変数を設定
cp .env.example .env

# 2. .envファイルでシークレット値を変更
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

`.env` の例:

```env
POSTGRES_USER=agentops
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# 3. 内蔵PostgreSQLと一緒に起動
docker compose --profile db up -d

# 4. 状態確認
docker compose ps
curl http://localhost:8000/health
```

アクセス: `http://localhost`（フロントエンド）/ `http://localhost:8000`（API）

### 外部DBの使用

既存のPostgreSQL（AWS RDS、社内DBなど）を使用する場合は、`--profile db`を省略し、`DATABASE_URL`を設定します。

```env
# .env
DATABASE_URL=postgresql+asyncpg://user:password@your-db-host:5432/agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# DBプロファイルなしで起動（backend + frontendのみ）
docker compose up -d
```

### ポートの変更

デフォルトポートが競合する場合は、`.env`で変更できます。

```env
DB_PORT=5433
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

### サービス管理

```bash
# ログの確認
docker compose logs -f backend
docker compose logs -f frontend

# 再起動
docker compose restart backend

# 停止
docker compose down

# 停止 + データ削除
docker compose --profile db down -v
```

---

## Option 2: Kubernetes

### ディレクトリ構造

```
k8s/
├── namespace.yaml
├── secret.yaml.example
├── postgres/
│   ├── pvc.yaml          # 5Gi PersistentVolumeClaim
│   ├── deployment.yaml   # PostgreSQL 16（Recreate戦略）
│   └── service.yaml
├── backend/
│   ├── configmap.yaml
│   ├── deployment.yaml   # 2レプリカ、ヘルスプローブ
│   └── service.yaml
└── frontend/
    ├── deployment.yaml   # 2レプリカ
    └── service.yaml      # NodePort 30080
```

### クイックスタート

```bash
# 1. Secretファイルを作成
cp k8s/secret.yaml.example k8s/secret.yaml

# 2. k8s/secret.yamlを編集 — シークレット値を変更
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

```bash
# 3. Dockerイメージをビルド
docker build -t agentops-backend:latest ./backend
docker build -t agentops-frontend:latest ./frontend
```

> **minikubeを使用する場合**: `eval $(minikube docker-env)` を実行してからビルドすると、クラスター内でイメージを使用できます。

```bash
# 4. リソースをデプロイ（順番通りに）
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# 5. 状態確認
kubectl get pods -n agentops
kubectl get svc -n agentops
```

### 外部DBの使用

内蔵PostgreSQLを使用しない場合:

1. `k8s/postgres/` のデプロイをスキップします。
2. `k8s/backend/deployment.yaml`の`DATABASE_URL`を外部DBに変更します。

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql+asyncpg://user:password@your-db-host:5432/agentops"
```

### アクセス

```bash
# NodePortアクセス（デフォルト30080）
# minikube
minikube service frontend -n agentops

# kind / 一般クラスター
curl http://<NODE_IP>:30080
```

本番環境では、NodePortの代わりにIngressまたはLoadBalancerタイプのServiceを推奨します。

### ConfigMapの変更

`k8s/backend/configmap.yaml`でサーバー設定を変更できます。

```yaml
data:
  SERVER_URL: "https://your-domain.com"
  CORS_ORIGINS: '["https://your-domain.com"]'
```

変更後の反映:

```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl rollout restart deployment/backend -n agentops
```

### リソース制限

| コンポーネント | CPU (req/limit) | Memory (req/limit) |
|---------------|-----------------|---------------------|
| Backend       | 100m / 500m     | 256Mi / 512Mi       |
| Frontend      | 50m / 200m      | 64Mi / 128Mi        |
| Postgres      | 100m / 500m     | 256Mi / 512Mi       |

必要に応じて各`deployment.yaml`の`resources`セクションを調整してください。

---

## DBマイグレーション

初回デプロイまたはアップデート後にAlembicマイグレーションを実行する必要があります。

```bash
# Docker Compose
docker compose exec backend python -m alembic upgrade head

# Kubernetes
kubectl exec -n agentops deployment/backend -- python -m alembic upgrade head
```

---

## 注意事項

- `SECRET_KEY`と`POSTGRES_PASSWORD`は必ず本番環境に合わせて変更してください。
- `.env`と`k8s/secret.yaml`は`.gitignore`に含まれています。絶対にコミットしないでください。
- データの永続性: Dockerは`pgdata`ボリューム、K8sは`postgres-pvc`（5Gi、Retainポリシー）を使用します。
