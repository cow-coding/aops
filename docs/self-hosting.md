# Self-Hosting Guide

> Also available in: [한국어](./self-hosting.ko.md) | [日本語](./self-hosting.ja.md) | [中文](./self-hosting.zh.md)

This guide explains how to self-host AOps using Docker Compose or Kubernetes.

---

## Prerequisites

| Requirement | Docker Compose | Kubernetes |
|-------------|----------------|------------|
| Docker | v20.10+ | v20.10+ |
| Docker Compose | v2.0+ | — |
| kubectl | — | v1.24+ |
| Cluster | — | minikube, kind, EKS, GKE, etc. |

---

## Option 1: Docker Compose

### Quick Start (with built-in DB)

```bash
# 1. Set up environment variables
cp .env.example .env

# 2. Edit .env and change the secret values
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

`.env` example:

```env
POSTGRES_USER=agentops
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# 3. Start with built-in PostgreSQL
docker compose --profile db up -d

# 4. Verify
docker compose ps
curl http://localhost:8000/health
```

Access: `http://localhost` (frontend) / `http://localhost:8000` (API)

### Using an External Database

To use an existing PostgreSQL instance (e.g., AWS RDS, on-premise DB), skip the `--profile db` flag and set `DATABASE_URL`.

```env
# .env
DATABASE_URL=postgresql+asyncpg://user:password@your-db-host:5432/agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# Start without the DB profile (backend + frontend only)
docker compose up -d
```

### Custom Ports

Override default ports in `.env` if they conflict with existing services.

```env
DB_PORT=5433
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

### Service Management

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Stop all services
docker compose down

# Stop and remove all data
docker compose --profile db down -v
```

---

## Option 2: Kubernetes

### Directory Structure

```
k8s/
├── namespace.yaml
├── secret.yaml.example
├── postgres/
│   ├── pvc.yaml          # 5Gi PersistentVolumeClaim
│   ├── deployment.yaml   # PostgreSQL 16 (Recreate strategy)
│   └── service.yaml
├── backend/
│   ├── configmap.yaml
│   ├── deployment.yaml   # 2 replicas, health probes
│   └── service.yaml
└── frontend/
    ├── deployment.yaml   # 2 replicas
    └── service.yaml      # NodePort 30080
```

### Quick Start

```bash
# 1. Create secret file
cp k8s/secret.yaml.example k8s/secret.yaml

# 2. Edit k8s/secret.yaml — change secret values
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

```bash
# 3. Build Docker images
docker build -t agentops-backend:latest ./backend
docker build -t agentops-frontend:latest ./frontend
```

> **Using minikube?** Run `eval $(minikube docker-env)` before building so the images are available inside the cluster.

```bash
# 4. Deploy resources (in order)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# 5. Verify
kubectl get pods -n agentops
kubectl get svc -n agentops
```

### Using an External Database

To skip the built-in PostgreSQL:

1. Do not apply `k8s/postgres/`.
2. Update `DATABASE_URL` in `k8s/backend/deployment.yaml`:

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql+asyncpg://user:password@your-db-host:5432/agentops"
```

### Accessing the Application

```bash
# NodePort access (default 30080)
# minikube
minikube service frontend -n agentops

# kind or other clusters
curl http://<NODE_IP>:30080
```

For production, use an Ingress or LoadBalancer type Service instead of NodePort.

### Updating ConfigMap

Modify server settings in `k8s/backend/configmap.yaml`:

```yaml
data:
  SERVER_URL: "https://your-domain.com"
  CORS_ORIGINS: '["https://your-domain.com"]'
```

Apply changes:

```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl rollout restart deployment/backend -n agentops
```

### Resource Limits

| Component | CPU (req/limit) | Memory (req/limit) |
|-----------|-----------------|---------------------|
| Backend   | 100m / 500m     | 256Mi / 512Mi       |
| Frontend  | 50m / 200m      | 64Mi / 128Mi        |
| Postgres  | 100m / 500m     | 256Mi / 512Mi       |

Adjust the `resources` section in each `deployment.yaml` as needed.

---

## Database Migration

Run Alembic migrations after the first deployment or after updates:

```bash
# Docker Compose
docker compose exec backend python -m alembic upgrade head

# Kubernetes
kubectl exec -n agentops deployment/backend -- python -m alembic upgrade head
```

---

## Important Notes

- Always change `SECRET_KEY` and `POSTGRES_PASSWORD` for production.
- `.env` and `k8s/secret.yaml` are included in `.gitignore`. Never commit them.
- Data persistence: Docker uses the `pgdata` volume; K8s uses `postgres-pvc` (5Gi, Retain policy).
