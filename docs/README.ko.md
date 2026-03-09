# AOps

> 다른 언어: [English](../README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md)

**AOps**는 AI 에이전트와 프롬프트를 관리, 버전 관리, 운영하기 위한 오픈소스 AgentOps 플랫폼입니다.

"GitHub for Prompts" — 프롬프트 버전 관리를 위한 중앙 허브로 시작하여, 모니터링, 트레이싱, 비용 추적, 평가를 포함하는 종합 AgentOps 플랫폼으로 발전하고 있습니다.

---

## 주요 기능

### 프롬프트 관리
- **에이전트**와 **체인** 단위로 프롬프트 구성
- 각 체인은 **페르소나**(역할)와 **콘텐츠**(프롬프트 본문, Markdown 지원)로 구성
- 체인별 **버전 히스토리** — 수정할 때마다 자동으로 새 버전 생성

### 버전 관리
- Git 스타일의 **커밋 메시지**로 변경사항 기록
- **Diff 뷰어**로 버전 간 비교
- 불변 버전 히스토리 — 과거 버전은 절대 변경되지 않음

### API 키 관리
- 에이전트별 API 키 발급 및 폐기
- 키는 생성 시 **한 번만** 표시 (원본 키는 서버에 저장되지 않음)
- 서버 URL이 키에 내장 — 클라이언트에서 별도 설정 불필요

### 체인 플로우 트레이싱
- [`aops` Python SDK](https://github.com/cow-coding/aops-python)를 통한 에이전트 실행 추적
- `aops.run()` 블록이 호출된 체인, 순서, 레이턴시를 자동 기록
- UI에서 **플로우 시각화**: 체인 호출 시퀀스의 유향 그래프 (호출 횟수, 평균 레이턴시 표시)
- 실행되지 않은 체인은 흐리게 표시 — 숨겨진 체인 없음

### 셀프 호스팅
- **Docker Compose** 또는 **Kubernetes**로 배포
- 내장 PostgreSQL 또는 외부 데이터베이스 연결 지원
- 자세한 내용은 [셀프 호스팅 가이드](./self-hosting.ko.md) 참고

---

## 로드맵

| 카테고리 | 상태 | 상세 |
|----------|------|------|
| **프롬프트 관리** | 완료 | 체인, 페르소나, 버전 히스토리, 롤백 |
| **트레이싱** | 완료 | `aops.run()` 컨텍스트 매니저, Flow 탭 시각화 |
| **API 키 관리** | 완료 | 에이전트별 키, 1회 표시 |
| **셀프 호스팅** | 완료 | Docker Compose, Kubernetes manifests |
| **모니터링** | 예정 | 에이전트 실행 로그, 요청/응답 추적 |
| **비용 추적** | 예정 | 에이전트/체인별 토큰 사용량 및 비용 |
| **평가** | 예정 | 프롬프트 평가 파이프라인, A/B 테스트 |
| **협업** | 예정 | 팀 접근 제어, 버전 코멘트 |

---

## 프로젝트 구조

```
AOps/
├── frontend/          # React 18 + TypeScript + MUI + Vite
├── backend/           # FastAPI + SQLAlchemy async + PostgreSQL + Alembic
├── k8s/               # Kubernetes manifests
└── docs/              # 문서
```

## 요구사항

| | 버전 |
|--|------|
| Node.js | >= 18 |
| Python | >= 3.12 |
| PostgreSQL | >= 14 |

---

## 시작하기

### 방법 1: Docker Compose (권장)

```bash
cp .env.example .env
# .env 수정 — POSTGRES_PASSWORD, SECRET_KEY 변경

docker compose --profile db up -d
```

외부 DB 설정 및 Kubernetes 배포는 [셀프 호스팅 가이드](./self-hosting.ko.md)를 참고하세요.

### 방법 2: 로컬 개발

**백엔드:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload
```

`http://localhost:8000`에서 접속 가능합니다.

**프론트엔드:**

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:3000`에서 접속 가능합니다. 개발 모드에서는 `/api` 요청이 백엔드로 프록시됩니다.

---

## API 레퍼런스

| 경로 | 설명 |
|------|------|
| `GET /health` | 헬스 체크 |
| `GET /api/v1/` | API 루트 |
| `GET /docs` | Swagger UI |
| `GET /api/v1/openapi.json` | OpenAPI 스펙 |
| `POST /api/v1/agents/:id/runs` | 에이전트 실행 기록 (X-API-Key) |
| `GET /api/v1/agents/:id/flow` | 에이전트의 체인 플로우 그래프 |

---

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성하여 기본값을 오버라이드합니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PROJECT_NAME` | AOps | 프로젝트 이름 |
| `VERSION` | 0.1.0 | API 버전 |
| `API_V1_PREFIX` | /api/v1 | API 경로 접두사 |
| `CORS_ORIGINS` | ["http://localhost:3000"] | 허용 오리진 |
| `DATABASE_URL` | — | PostgreSQL 연결 문자열 |
| `SECRET_KEY` | — | JWT 서명 시크릿 |

---

## SDK

[aops Python SDK](https://github.com/cow-coding/aops-python)를 사용하여 에이전트 코드에서 프롬프트를 가져오고 실행 트레이스를 기록합니다:

```python
import aops

aops.init(api_key="aops_...", agent="my-agent")

# 공통 체인 — 한 번만 가져오고, 요청별 트레이스에서 제외
system_prompt = aops.pull("system")

with aops.run():
    # aops.run() 안에서 가져온 체인은 자동으로 트레이스됨
    classify_prompt = aops.pull("classify")
    category = classify(classify_prompt, user_input)

    response_prompt = aops.pull(f"respond-{category}")
    return respond(system_prompt, response_prompt, user_input)
```

트레이스는 블록 종료 시 백엔드로 전송되며, 에이전트 상세 페이지의 **Flow** 탭에서 시각화됩니다.

---

## 기여하기

AOps는 오픈소스 프로젝트입니다. 이슈 등록이나 풀 리퀘스트를 통한 기여를 환영합니다.

## 라이선스

[MIT](../LICENSE)
