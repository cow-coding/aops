# AgentOps

## 프로젝트 구조

```
AgentOps/
├── frontend/          # React 18 + TypeScript + Vite
└── backend/           # FastAPI + Pydantic v2
```

## 요구 사항

| 구분 | 버전 |
|------|------|
| Node.js | >= 18 |
| Python | >= 3.12 |

## Frontend

Vite + React 18 + TypeScript 기반 프로젝트입니다.

### 의존성 설치

```bash
cd frontend
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 접속할 수 있습니다.
개발 모드에서 `/api` 경로는 백엔드(`http://localhost:8000`)로 프록시됩니다.

### 빌드

```bash
npm run build
```

### 린트

```bash
npm run lint
```

## Backend

FastAPI + Pydantic v2 기반 프로젝트입니다.

### 의존성 설치

```bash
cd backend
pip install -r requirements.txt
```

### 개발 서버 실행

```bash
uvicorn app.main:app --reload
```

`http://localhost:8000` 에서 접속할 수 있습니다.

### 주요 엔드포인트

| 경로 | 설명 |
|------|------|
| `GET /health` | 헬스 체크 |
| `GET /api/v1/` | API 루트 |
| `GET /api/v1/openapi.json` | OpenAPI 스펙 |
| `GET /docs` | Swagger UI |

### 환경 변수

프로젝트 루트에 `.env` 파일을 생성하여 설정을 오버라이드할 수 있습니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PROJECT_NAME` | AgentOps | 프로젝트 이름 |
| `VERSION` | 0.1.0 | API 버전 |
| `API_V1_PREFIX` | /api/v1 | API 경로 접두사 |
| `CORS_ORIGINS` | ["http://localhost:3000"] | 허용 오리진 목록 |
