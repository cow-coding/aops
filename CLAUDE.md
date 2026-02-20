# AgentOps Project

## Project Structure
- **Backend**: FastAPI + SQLAlchemy async + PostgreSQL + Alembic (`backend/`)
- **Frontend**: React 18 + TypeScript + MUI + React Router v6 + Vite (`frontend/`)
- **Theme**: GitHub-inspired dark theme

## Agent Teams

### Team Configuration
- Team name: `agentops-dev`
- Teammates: `frontend-dev`, `backend-dev`, `designer`, `strict-senior`
- Agent definitions: `.claude/agents/*.md`
- Display mode: tmux split panes (`teammateMode: "tmux"`)

### MANDATORY: Teammate Spawn 후 자동 검증 절차

> **이 절차는 teammate를 spawn할 때마다 반드시 수행해야 한다.** tmux 환경에서 zsh 초기화 타이밍 문제로 Claude Code 프로세스가 즉시 종료되는 현상이 빈번하다.

**원인**: 새 tmux pane에서 zsh가 `.zshrc`를 로딩(oh-my-zsh, powerlevel10k, 플러그인 등)하는 동안 Claude Code 실행 명령이 전송되어, 불완전한 셸 환경에서 실행 → 즉시 종료.

**Team lead는 매 teammate spawn 후 아래 절차를 자동으로 수행한다:**

#### Step 1: Spawn 후 8초 대기 + 상태 확인
```bash
# spawn 직후 8초 대기 후 pane 상태 확인
sleep 8 && tmux list-panes -a -F '#{pane_id} #{pane_current_command}'
```

#### Step 2: 실패 판별
- pane의 `pane_current_command`가 `zsh`이고, pane 내용에 Claude Code UI(`✻`, `Claude Code`, `SendMessage`)가 없으면 → **실패**
- 확인 명령:
```bash
tmux capture-pane -t %{pane_id} -p -S -20
```

#### Step 3: 실패 시 자동 재실행 (최대 2회)
```bash
# 원래 spawn 명령을 pane에서 캡처
tmux capture-pane -t %{pane_id} -p -S -50

# 동일 명령을 pane에 재전송 (@ 앞의 \ 이스케이프 제거)
tmux send-keys -t %{pane_id} 'env CLAUDECODE=1 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 /opt/homebrew/bin/claude --agent-id {name}@{team} --agent-name {name} --team-name {team} --agent-color {color} --parent-session-id {session-id} --agent-type {agent-type} --dangerously-skip-permissions --model claude-opus-4-6' Enter

# 10초 후 재확인
sleep 10 && tmux capture-pane -t %{pane_id} -p -S -5
```

#### Step 4: 2회 실패 시 사용자에게 보고
- 2번 재시도 후에도 Claude가 실행되지 않으면 사용자에게 상황을 보고하고 지시를 요청한다.
- pane을 kill하고 새로 spawn하는 것을 제안한다.

**주의사항**:
- 원래 spawn 명령에서 `@` 앞에 `\` 이스케이프가 붙어 있다. 수동 재실행 시에는 제거 필요 (`frontend-dev\@agentops-dev` → `frontend-dev@agentops-dev`).
- `--parent-session-id`는 team lead의 세션 ID. team config에서 확인: `~/.claude/teams/{team-name}/config.json`의 `leadSessionId`.
- teammate를 여러 명 spawn할 때는 **한 명씩 순차적으로** spawn + 검증한다. 동시 spawn하면 tmux 리소스 경합으로 실패율이 높아진다.
