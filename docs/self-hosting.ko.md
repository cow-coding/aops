# 셀프 호스팅 가이드

> 다른 언어: [English](./self-hosting.md) | [日本語](./self-hosting.ja.md) | [中文](./self-hosting.zh.md)

Docker Compose 또는 Kubernetes를 사용하여 AOps를 셀프 호스팅하는 방법을 안내합니다.

---

## 사전 요구사항

| 항목 | Docker Compose | Kubernetes |
|------|----------------|------------|
| Docker | v20.10+ | v20.10+ |
| Docker Compose | v2.0+ | — |
| kubectl | — | v1.24+ |
| 클러스터 | — | minikube, kind, EKS, GKE 등 |

---

## Option 1: Docker Compose

### Quick Start (내장 DB 포함)

```bash
# 1. 환경 변수 설정
cp .env.example .env

# 2. .env 파일에서 비밀값 변경
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

`.env` 예시:

```env
POSTGRES_USER=agentops
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# 3. 내장 PostgreSQL과 함께 실행
docker compose --profile db up -d

# 4. 상태 확인
docker compose ps
curl http://localhost:8000/health
```

접속: `http://localhost` (프론트엔드) / `http://localhost:8000` (API)

### 외부 DB 사용

사내 PostgreSQL이나 AWS RDS 등 기존 DB를 사용하려면 `--profile db`를 생략하고 `DATABASE_URL`을 설정합니다.

```env
# .env
DATABASE_URL=postgresql+asyncpg://user:password@your-db-host:5432/agentops
SECRET_KEY=your-long-random-secret-key
SERVER_URL=http://localhost
CORS_ORIGINS=["http://localhost"]
```

```bash
# DB 프로필 없이 실행 (backend + frontend만)
docker compose up -d
```

### 포트 변경

기본 포트가 충돌하면 `.env`에서 변경 가능합니다.

```env
DB_PORT=5433
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

### 서비스 관리

```bash
# 로그 확인
docker compose logs -f backend
docker compose logs -f frontend

# 재시작
docker compose restart backend

# 중지
docker compose down

# 중지 + 데이터 삭제
docker compose --profile db down -v
```

---

## Option 2: Kubernetes

### 디렉토리 구조

```
k8s/
├── namespace.yaml
├── secret.yaml.example
├── postgres/
│   ├── pvc.yaml          # 5Gi PersistentVolumeClaim
│   ├── deployment.yaml   # PostgreSQL 16 (Recreate 전략)
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
# 1. Secret 파일 생성
cp k8s/secret.yaml.example k8s/secret.yaml

# 2. k8s/secret.yaml 수정 — 비밀값 변경
#    - POSTGRES_PASSWORD
#    - SECRET_KEY
```

```bash
# 3. Docker 이미지 빌드
docker build -t agentops-backend:latest ./backend
docker build -t agentops-frontend:latest ./frontend
```

> **minikube 사용 시**: `eval $(minikube docker-env)` 후 빌드하면 클러스터 내에서 이미지를 사용할 수 있습니다.

```bash
# 4. 리소스 배포 (순서대로)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# 5. 상태 확인
kubectl get pods -n agentops
kubectl get svc -n agentops
```

### 외부 DB 사용

내장 PostgreSQL을 사용하지 않으려면:

1. `k8s/postgres/` 배포를 건너뜁니다.
2. `k8s/backend/deployment.yaml`의 `DATABASE_URL`을 외부 DB로 변경합니다.

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql+asyncpg://user:password@your-db-host:5432/agentops"
```

### 접속

```bash
# NodePort 접속 (기본 30080)
# minikube
minikube service frontend -n agentops

# kind / 일반 클러스터
curl http://<NODE_IP>:30080
```

프로덕션 환경에서는 NodePort 대신 Ingress 또는 LoadBalancer 타입 Service를 권장합니다.

### ConfigMap 수정

`k8s/backend/configmap.yaml`에서 서버 설정을 변경할 수 있습니다.

```yaml
data:
  SERVER_URL: "https://your-domain.com"
  CORS_ORIGINS: '["https://your-domain.com"]'
```

변경 후 반영:

```bash
kubectl apply -f k8s/backend/configmap.yaml
kubectl rollout restart deployment/backend -n agentops
```

### 리소스 제한

| 컴포넌트 | CPU (req/limit) | Memory (req/limit) |
|----------|-----------------|---------------------|
| Backend  | 100m / 500m     | 256Mi / 512Mi       |
| Frontend | 50m / 200m      | 64Mi / 128Mi        |
| Postgres | 100m / 500m     | 256Mi / 512Mi       |

필요에 따라 각 `deployment.yaml`의 `resources` 섹션을 조정하세요.

---

## DB 마이그레이션

첫 배포 또는 업데이트 후에는 Alembic 마이그레이션을 실행해야 합니다.

```bash
# Docker Compose
docker compose exec backend python -m alembic upgrade head

# Kubernetes
kubectl exec -n agentops deployment/backend -- python -m alembic upgrade head
```

---

## 주의사항

- `SECRET_KEY`와 `POSTGRES_PASSWORD`는 반드시 프로덕션 환경에 맞게 변경하세요.
- `.env`와 `k8s/secret.yaml`은 `.gitignore`에 포함되어 있습니다. 절대 커밋하지 마세요.
- 데이터 영속성: Docker는 `pgdata` 볼륨, K8s는 `postgres-pvc` (5Gi, Retain 정책)을 사용합니다.
