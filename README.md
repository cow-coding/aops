# AOps

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

---

## Roadmap

| Category | Planned Features |
|----------|-----------------|
| **Prompt Management** | Prompt rollback, branching, tagging |
| **Monitoring** | Agent execution logs, request/response tracking |
| **Tracing** | LLM call traces, chain-level observability |
| **Cost Tracking** | Token usage and cost per agent/chain |
| **Evaluation** | Prompt evaluation pipelines, A/B testing |
| **Collaboration** | Team access control, comments on versions |

---

## Project Structure

```
AOps/
├── frontend/          # React 18 + TypeScript + Vite
└── backend/           # FastAPI + Pydantic v2
```

## Requirements

| | Version |
|--|---------|
| Node.js | >= 18 |
| Python | >= 3.12 |

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
```

```bash
uvicorn app.main:app --reload
```

Available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Available at `http://localhost:3000`.
In development mode, `/api` requests are proxied to the backend.

### Docker (recommended)

```bash
docker-compose up
```

---

## API Reference

| Path | Description |
|------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/` | API root |
| `GET /docs` | Swagger UI |
| `GET /api/v1/openapi.json` | OpenAPI spec |

---

## Environment Variables

Create a `.env` file in the project root to override defaults.

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | AOps | Project name |
| `VERSION` | 0.1.0 | API version |
| `API_V1_PREFIX` | /api/v1 | API path prefix |
| `CORS_ORIGINS` | ["http://localhost:3000"] | Allowed origins |

---

## Contributing

AOps is an open-source project. Contributions are welcome — feel free to open issues or pull requests.

## License

[MIT](LICENSE)
