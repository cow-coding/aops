# 自托管指南

> 其他语言: [English](./self-hosting.md) | [한국어](./self-hosting.ko.md) | [日本語](./self-hosting.ja.md)

本指南介绍如何使用 Docker Compose 或 Kubernetes 自托管 AOps。

---

## 前提条件

| 要求 | Docker Compose | Kubernetes |
|------|----------------|------------|
| Docker | v20.10+ | v20.10+ |
| Docker Compose | v2.0+ | — |
| kubectl | — | v1.24+ |
| 集群 | — | minikube、kind、EKS、GKE 等 |

---

## 方案一：Docker Compose

### 快速开始（包含内置数据库）

```bash
# 1. 设置环境变量
cp .env.example .env

# 2. 在 .env 文件中修改密钥
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

`.env` 示例：

```env
POSTGRES_USER=agentops
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# 3. 使用内置 PostgreSQL 启动
docker compose --profile db up -d

# 4. 验证状态
docker compose ps
curl http://localhost:8000/health
```

访问地址：`http://localhost`（前端）/ `http://localhost:8000`（API）

### 使用外部数据库

如需使用已有的 PostgreSQL（如 AWS RDS、内部数据库），请省略 `--profile db` 并设置 `DATABASE_URL`。

```env
# .env
DATABASE_URL=postgresql+asyncpg://user:password@your-db-host:5432/agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# 不使用 DB 配置启动（仅 backend + frontend）
docker compose up -d
```

### 自定义端口

如果默认端口冲突，可以在 `.env` 中修改。

```env
DB_PORT=5433
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

### 服务管理

```bash
# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 重启服务
docker compose restart backend

# 停止所有服务
docker compose down

# 停止并删除所有数据
docker compose --profile db down -v
```

---

## 方案二：Kubernetes

### 目录结构

```
k8s/
├── namespace.yaml
├── secret.yaml.example
├── postgres/
│   ├── pvc.yaml          # 5Gi PersistentVolumeClaim
│   ├── deployment.yaml   # PostgreSQL 16（Recreate 策略）
│   └── service.yaml
├── backend/
│   ├── configmap.yaml
│   ├── deployment.yaml   # 2 副本，健康检查
│   └── service.yaml
└── frontend/
    ├── deployment.yaml   # 2 副本
    └── service.yaml      # NodePort 30080
```

### 快速开始

```bash
# 1. 创建 Secret 文件
cp k8s/secret.yaml.example k8s/secret.yaml

# 2. 编辑 k8s/secret.yaml — 修改密钥
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

```bash
# 3. 构建 Docker 镜像
docker build -t agentops-backend:latest ./backend
docker build -t agentops-frontend:latest ./frontend
```

> **使用 minikube 时**：先执行 `eval $(minikube docker-env)`，再构建镜像，使其在集群内可用。

```bash
# 4. 按顺序部署资源
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# 5. 验证状态
kubectl get pods -n agentops
kubectl get svc -n agentops
```

### 使用外部数据库

如不使用内置 PostgreSQL：

1. 跳过 `k8s/postgres/` 的部署。
2. 修改 `k8s/backend/deployment.yaml` 中的 `DATABASE_URL`。

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql+asyncpg://user:password@your-db-host:5432/agentops"
```

### 访问应用

```bash
# NodePort 访问（默认 30080）
# minikube
minikube service frontend -n agentops

# kind / 其他集群
curl http://<NODE_IP>:30080
```

生产环境建议使用 Ingress 或 LoadBalancer 类型的 Service 替代 NodePort。

### 修改 ConfigMap

在 `k8s/backend/configmap.yaml` 中修改服务器配置：

```yaml
data:
  SERVER_URL: "https://your-domain.com"
  CORS_ORIGINS: '["https://your-domain.com"]'
```

应用更改：

```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl rollout restart deployment/backend -n agentops
```

### 资源限制

| 组件 | CPU (req/limit) | Memory (req/limit) |
|------|-----------------|---------------------|
| Backend  | 100m / 500m     | 256Mi / 512Mi       |
| Frontend | 50m / 200m      | 64Mi / 128Mi        |
| Postgres | 100m / 500m     | 256Mi / 512Mi       |

根据需要调整各 `deployment.yaml` 的 `resources` 部分。

---

## 数据库迁移

首次部署或更新后需要运行 Alembic 迁移：

```bash
# Docker Compose
docker compose exec backend python -m alembic upgrade head

# Kubernetes
kubectl exec -n agentops deployment/backend -- python -m alembic upgrade head
```

---

## 注意事项

- `SECRET_KEY` 和 `POSTGRES_PASSWORD` 必须在生产环境中修改。
- `.env` 和 `k8s/secret.yaml` 已包含在 `.gitignore` 中，切勿提交。
- 数据持久性：Docker 使用 `pgdata` 卷，K8s 使用 `postgres-pvc`（5Gi，Retain 策略）。
