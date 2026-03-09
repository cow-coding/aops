# AOps

> 其他语言: [English](../README.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md)

**AOps** 是一个用于管理、版本控制和运维 AI 代理及其提示词的开源 AgentOps 平台。

以 "GitHub for Prompts" 为起点 —— 一个提示词版本控制的中心枢纽，AOps 致力于发展成为涵盖监控、追踪、成本跟踪和评估的全功能 AgentOps 平台。

---

## 主要功能

### 提示词管理
- 按 **代理（Agent）** 和 **链（Chain）** 单元组织提示词
- 每个链包含 **角色（Persona）** 和 **内容（Content）**（提示词正文，支持 Markdown）
- 每个链的完整 **版本历史** —— 每次编辑自动创建新版本

### 版本控制
- Git 风格的 **提交消息** 记录每次更改
- **Diff 查看器** 并排比较版本
- 不可变的版本历史 —— 过去的版本永不被修改

### API 密钥管理
- 按代理发放和撤销 API 密钥
- 密钥仅在创建时 **显示一次**（原始密钥不存储在服务器上）
- 服务器 URL 内嵌于密钥中 —— 客户端无需额外配置

### 链流追踪
- 通过 [`aops` Python SDK](https://github.com/cow-coding/aops-python) 记录代理执行追踪
- `aops.run()` 代码块自动捕获调用的链、顺序和延迟
- UI 中的 **流程可视化**：链调用序列的有向图（显示调用次数和平均延迟）
- 未被执行的链以淡化节点显示 —— 无隐藏链

### 自托管
- 使用 **Docker Compose** 或 **Kubernetes** 部署
- 支持内置 PostgreSQL 或外部数据库连接
- 详见 [自托管指南](./self-hosting.zh.md)

---

## 路线图

| 类别 | 状态 | 详情 |
|------|------|------|
| **提示词管理** | 已完成 | 链、角色、版本历史、回滚 |
| **追踪** | 已完成 | `aops.run()` 上下文管理器，Flow 标签页可视化 |
| **API 密钥管理** | 已完成 | 按代理密钥，一次性显示 |
| **自托管** | 已完成 | Docker Compose、Kubernetes 清单 |
| **监控** | 计划中 | 代理执行日志、请求/响应追踪 |
| **成本跟踪** | 计划中 | 按代理/链的 Token 用量和成本 |
| **评估** | 计划中 | 提示词评估流水线、A/B 测试 |
| **协作** | 计划中 | 团队访问控制、版本评论 |

---

## 项目结构

```
AOps/
├── frontend/          # React 18 + TypeScript + MUI + Vite
├── backend/           # FastAPI + SQLAlchemy async + PostgreSQL + Alembic
├── k8s/               # Kubernetes 清单
└── docs/              # 文档
```

## 环境要求

| | 版本 |
|--|------|
| Node.js | >= 18 |
| Python | >= 3.12 |
| PostgreSQL | >= 14 |

---

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
cp .env.example .env
# 编辑 .env —— 修改 POSTGRES_PASSWORD 和 SECRET_KEY

docker compose --profile db up -d
```

外部数据库配置和 Kubernetes 部署请参考 [自托管指南](./self-hosting.zh.md)。

### 方式二：本地开发

**后端：**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload
```

访问地址：`http://localhost:8000`

**前端：**

```bash
cd frontend
npm install
npm run dev
```

访问地址：`http://localhost:3000`。开发模式下 `/api` 请求会被代理到后端。

---

## API 参考

| 路径 | 描述 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /api/v1/` | API 根路径 |
| `GET /docs` | Swagger UI |
| `GET /api/v1/openapi.json` | OpenAPI 规范 |
| `POST /api/v1/agents/:id/runs` | 记录代理运行（X-API-Key） |
| `GET /api/v1/agents/:id/flow` | 获取代理的链流图 |

---

## 环境变量

在项目根目录创建 `.env` 文件以覆盖默认值。

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `PROJECT_NAME` | AOps | 项目名称 |
| `VERSION` | 0.1.0 | API 版本 |
| `API_V1_PREFIX` | /api/v1 | API 路径前缀 |
| `CORS_ORIGINS` | ["http://localhost:3000"] | 允许的来源 |
| `DATABASE_URL` | — | PostgreSQL 连接字符串 |
| `SECRET_KEY` | — | JWT 签名密钥 |

---

## SDK

使用 [aops Python SDK](https://github.com/cow-coding/aops-python) 从代理代码中拉取提示词并记录执行追踪：

```python
import aops

aops.init(api_key="aops_...", agent="my-agent")

# 通用链 —— 只拉取一次，不包含在每次请求的追踪中
system_prompt = aops.pull("system")

with aops.run():
    # 在 aops.run() 内拉取的链会被自动追踪
    classify_prompt = aops.pull("classify")
    category = classify(classify_prompt, user_input)

    response_prompt = aops.pull(f"respond-{category}")
    return respond(system_prompt, response_prompt, user_input)
```

追踪数据在代码块退出时发送到后端，并在代理详情页的 **Flow** 标签页中可视化。

---

## 贡献

AOps 是一个开源项目，欢迎通过提交 Issue 或 Pull Request 参与贡献。

## 许可证

[MIT](../LICENSE)
