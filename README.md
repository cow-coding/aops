# AOps

> Also available in: [한국어](./docs/README.ko.md) | [日本語](./docs/README.ja.md) | [中文](./docs/README.zh.md)

**AOps** is an open-source AgentOps platform for managing, versioning, and operating AI agents and their prompts.

Starting as a "GitHub for Prompts" — a central hub for prompt version control — AOps is designed to grow into a full-featured AgentOps platform covering monitoring, tracing, cost tracking, and evaluation.

---

## Features

### Prompt Management
- Organize prompts by **Agent** and **Chain** units
- Each Chain has a **persona** (role) and **content** (prompt body, Markdown supported)
- Full **version history** per Chain — every edit creates a new version automatically

### Version Control
- Git-style **commit messages** on every prompt change
- **Diff viewer** to compare versions side by side
- Immutable version history — past versions are never modified

### API Key Management
- Issue and revoke API keys per agent
- Keys are shown **only once** at creation (raw key is never stored)
- Server URL is embedded in the key — no extra configuration needed in the client

### Chain Flow Tracing
- Record agent execution traces via the [`aops` Python SDK](https://github.com/cow-coding/aops-python)
- Each `aops.run()` block captures which chains were called, in what order, and with what latency
- Aggregated **Flow visualization** in the UI: directed graph of chain call sequences with call counts and average latency per edge
- Chains that have never been executed appear as dimmed nodes — no hidden chains

### Self-Hosting
- Deploy with **Docker Compose** or **Kubernetes**
- Built-in PostgreSQL or bring your own external database
- See the [Self-Hosting Guide](./docs/self-hosting.md) for details

---

## Roadmap

| Category | Status | Details |
|----------|--------|---------|
| **Prompt Management** | Shipped | Chains, personas, version history, rollback |
| **Tracing** | Shipped | `aops.run()` context manager, Flow tab visualization |
| **API Key Management** | Shipped | Per-agent keys, one-time display |
| **Self-Hosting** | Shipped | Docker Compose, Kubernetes manifests |
| **Monitoring** | Planned | Agent execution logs, request/response tracking |
| **Cost Tracking** | Planned | Token usage and cost per agent/chain |
| **Evaluation** | Planned | Prompt evaluation pipelines, A/B testing |
| **Collaboration** | Planned | Team access control, comments on versions |

---

## Project Structure

```
AOps/
├── frontend/          # React 18 + TypeScript + MUI + Vite
├── backend/           # FastAPI + SQLAlchemy async + PostgreSQL + Alembic
├── k8s/               # Kubernetes manifests
└── docs/              # Documentation
```

## Requirements

| | Version |
|--|---------|
| Node.js | >= 18 |
| Python | >= 3.12 |
| PostgreSQL | >= 14 |

---

## Getting Started

### Option 1: Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env — change POSTGRES_PASSWORD and SECRET_KEY

docker compose --profile db up -d
```

See the [Self-Hosting Guide](./docs/self-hosting.md) for external DB setup and Kubernetes deployment.

### Option 2: Local Development

**Backend:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload
```

Available at `http://localhost:8000`.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Available at `http://localhost:3000`. In development mode, `/api` requests are proxied to the backend.

---

## API Reference

| Path | Description |
|------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/` | API root |
| `GET /docs` | Swagger UI |
| `GET /api/v1/openapi.json` | OpenAPI spec |
| `POST /api/v1/agents/:id/runs` | Record an agent run (X-API-Key) |
| `GET /api/v1/agents/:id/flow` | Get chain flow graph for an agent |

---

## Environment Variables

Create a `.env` file in the project root to override defaults.

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | AOps | Project name |
| `VERSION` | 0.1.0 | API version |
| `API_V1_PREFIX` | /api/v1 | API path prefix |
| `CORS_ORIGINS` | ["http://localhost:3000"] | Allowed origins |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing secret |

---

## SDK

Use the [aops Python SDK](https://github.com/cow-coding/aops-python) to pull prompts and record execution traces from your agent code:

```python
import aops

aops.init(api_key="aops_...", agent="my-agent")

# Common chains — pulled once, excluded from per-request traces
system_prompt = aops.pull("system")

with aops.run():
    # Chains pulled inside aops.run() are automatically traced
    classify_prompt = aops.pull("classify")
    category = classify(classify_prompt, user_input)

    response_prompt = aops.pull(f"respond-{category}")
    return respond(system_prompt, response_prompt, user_input)
```

Traces are posted to the backend on block exit and visualized in the **Flow** tab of the agent detail page.

---

## Contributing

AOps is an open-source project. Contributions are welcome — feel free to open issues or pull requests.

## License

[MIT](LICENSE)
