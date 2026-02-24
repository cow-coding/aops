# AgentOps Redesign Spec — Linear + Terminal Aesthetic

> Generated: 2026-02-24 | Designer: designer agent
> Scope: Full redesign — color palette, typography, layout, all components
> Direction: Linear (clean dark minimal) + Terminal (code/prompt areas)

---

## 0. 현재 → 변경 요약

| 항목 | 현재 (GitHub) | 변경 (Linear+Terminal) |
|------|--------------|----------------------|
| Background | `#0d1117` 블루-그레이 | `#0A0A0A` 순수 블랙 |
| Accent | `#58a6ff` 블루 | `#5E6AD2` 바이올렛-인디고 |
| Primary CTA | `#238636` 그린 | `#5E6AD2` 바이올렛 |
| Font | 시스템 폰트 | Inter |
| Mono Font | SF Mono/Menlo | JetBrains Mono |
| Layout | Top nav only | 사이드바 + Top bar |
| List UI | Divider rows | 카드형 rows (gap 8px) |
| Chip radius | 20px (알약) | 4px (사각 뱃지) |
| Code areas | 일반 스타일 | 터미널 블랙 + 컬러 |

---

## 1. New Color Palette (theme.ts 교체)

### Philosophy
순수 블랙 베이스 + 바이올렛 액센트로 AI 플랫폼 정체성. GitHub 블루 완전 제거.

```typescript
export const colors = {
  canvas: {
    default: '#0A0A0A',      // 페이지 배경 (순수 블랙)
    overlay: '#141414',      // 모달, 드롭다운
    inset: '#050505',        // 에디터, 코드 블록 배경
    subtle: '#111111',       // 카드, 세컨더리 서피스
    elevated: '#1A1A1A',     // 호버 카드, 강조 서피스 (신규)
  },

  fg: {
    default: '#F0F0F0',      // 기본 텍스트
    muted: '#888888',        // 보조 텍스트
    subtle: '#555555',       // 플레이스홀더, 비활성
    onEmphasis: '#FFFFFF',
  },

  border: {
    default: '#242424',      // 기본 경계선 (매우 얇음)
    muted: '#1C1C1C',        // 미묘한 경계
    subtle: '#141414',       // 거의 보이지 않는 경계
    focus: '#5E6AD2',        // 포커스 링
  },

  accent: {
    fg: '#8B92E8',           // 링크, 인터랙티브 텍스트 (밝은 바이올렛)
    emphasis: '#5E6AD2',     // Primary 버튼, 액션 (Linear 인디고)
    muted: '#5E6AD233',
    subtle: '#5E6AD21A',
  },

  success: {
    fg: '#4ADE80',           // 성공 텍스트
    emphasis: '#16A34A',
    muted: '#16A34A33',
    subtle: '#16A34A1A',
  },

  attention: {
    fg: '#FBBF24',
    emphasis: '#D97706',
    muted: '#D9770633',
    subtle: '#D977061A',
  },

  danger: {
    fg: '#F87171',           // 부드러운 레드
    emphasis: '#DC2626',
    muted: '#DC262633',
    subtle: '#DC26261A',
  },

  neutral: {
    emphasis: '#555555',
    muted: '#33333366',
    subtle: '#3333331A',
  },

  // 터미널 액센트 (프롬프트/코드 영역 전용)
  terminal: {
    green: '#4ADE80',        // 버전 뱃지, 성공 상태, 터미널 프롬프트
    blue: '#60A5FA',         // 인라인 코드, 변수
    purple: '#C084FC',       // blockquote 경계, 스트링
    yellow: '#FDE68A',       // 주석, 메타데이터
  },
} as const;
```

### Primary CTA 색상 변경
- 기존: `success.emphasis` (#238636 그린)
- 변경: `accent.emphasis` (#5E6AD2 바이올렛)
- 이유: GitHub 관례를 벗어나 AgentOps만의 identity 확립

---

## 2. Typography (theme.ts 교체)

### Font Import (index.html에 추가)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Font Family
```typescript
const fontFamily = [
  '"Inter"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

const monoFontFamily = [
  '"JetBrains Mono"',    // 신규 추가 (ligature 지원)
  '"Fira Code"',
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'monospace',
].join(',');
```

### Typography Scale
```typescript
fontSize: 13,              // 14 → 13 (더 compact, 정보밀도 향상)

h1: { fontSize: '1.75rem', letterSpacing: '-0.03em' }  // 2rem → 1.75rem
h2: { fontSize: '1.25rem', letterSpacing: '-0.025em' } // 1.5rem → 1.25rem
h3: { fontSize: '1rem',    letterSpacing: '-0.01em' }  // 1.25rem → 1rem
body1: { fontSize: '0.8125rem' }                       // 0.875rem → 13px
caption: { fontSize: '0.6875rem' }                     // 0.75rem → 11px
button: { letterSpacing: '-0.01em' }
```

---

## 3. Layout 구조 변경 (AppShell.tsx + 신규 Sidebar.tsx)

### 현재 → 변경
```
[현재]                          [변경 후]
┌──────────────────────┐        ┌──────┬──────────────────────┐
│ AppBar (fixed 48px)  │        │      │  TopBar (40px)        │
├──────────────────────┤        │ Side │──────────────────────┤
│                      │        │ bar  │                       │
│  Content (max 1280px)│        │(220px│  Content (max 960px)  │
│                      │        │)     │                       │
└──────────────────────┘        └──────┴──────────────────────┘
```

### Sidebar 스펙 (`components/Sidebar.tsx` 신규)
- **너비**: 220px fixed
- **배경**: `canvas.default` (#0A0A0A) — 경계선으로만 구분
- **우측 경계**: `1px solid #1C1C1C`

```
┌─────────────────────┐
│ ◆ AgentOps          │  ← 로고 (px:16px, pt:16px, pb:8px)
│                     │
│  Agents        ●    │  ← 활성 NavItem (바이올렛 bg)
│                     │
│  ─── 미래 확장 ────  │
│  Monitoring    (회색)│  ← 비활성 (muted, cursor:default)
│  Traces        (회색)│
│  Cost          (회색)│
└─────────────────────┘

NavItem 스타일:
- 기본: px:12px py:6px, rounded:6px, fg.muted
- 활성: bg:#5E6AD21A, text:accent.fg, border-left:2px solid #5E6AD2
- hover: bg:#FFFFFF08
- 아이콘 16px + 텍스트 gap:8px
- font: 0.8125rem, weight:500
```

### AppShell 변경 요점
- `mt: '48px'` 제거 (더 이상 fixed AppBar 없음)
- max-width: 1280px → **960px**
- 메인 영역 overflow: auto (사이드바는 fixed)

---

## 4. 컴포넌트 변경 스펙

### 4-1. Button (theme.ts MuiButton)
```typescript
// contained primary: 그린 → 바이올렛
'&.MuiButton-containedPrimary': {
  backgroundColor: '#5E6AD2',  // accent.emphasis
  '&:hover': { backgroundColor: '#6872E0' },
  border: 'none',
  boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
}

// outlined: 더 얇은 경계
outlined: {
  borderColor: '#242424',       // border.default
  backgroundColor: 'transparent',
  '&:hover': { backgroundColor: '#1A1A1A' },
}

// size
root: { minHeight: 30, padding: '4px 12px' }  // 32 → 30 (compact)
```

### 4-2. Card / Paper
```typescript
borderRadius: 8,             // 6 → 8
borderColor: '#242424',
transition: 'border-color 0.15s ease',
'&:hover': { borderColor: '#333333' },
```

### 4-3. Input 포커스 링
```typescript
'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
  borderColor: '#5E6AD2',    // accent → 바이올렛
  boxShadow: '0 0 0 3px #5E6AD21A',
}
```

### 4-4. Tabs indicator
```typescript
indicator: {
  backgroundColor: '#5E6AD2',  // danger.fg(레드) → 바이올렛으로 변경
}
```

### 4-5. Chip/Badge borderRadius
```typescript
borderRadius: 4,             // 20px → 4px (사각 뱃지, Linear 스타일)
```

---

## 5. List UI 변경 (AgentList, ChainList)

### 현재: Divider 구분 행
### 변경: 카드형 Row (gap 8px, 경계선)

```
[현재]
agent-name ─────────────── divider
agent-name ─────────────── divider

[변경]
┌──────────────────────────────────────────────┐
│ ● agent-name                 Updated 2h ago › │
│   description...                              │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ ● another-agent              Updated 5d ago › │
└──────────────────────────────────────────────┘

스타일:
- border: 1px solid #1C1C1C
- borderRadius: 8px
- gap: 8px (Divider 제거)
- hover: borderColor → #333333, bg → #111111
- 이름 색상: accent.fg (#8B92E8) — 바이올렛
- › 화살표 아이콘 (ChevronRight) 우측
```

---

## 6. Terminal 감성 적용 포인트

### 6-1. 프롬프트 에디터 (편집 모드 TextField)
```typescript
// ChainDetailPage, ChainCreatePage의 content TextField
inputProps: {
  style: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '0.8125rem',
    lineHeight: 1.7,
    letterSpacing: '-0.01em',
    background: '#050505',    // canvas.inset — 터미널 블랙
  }
}
// 포커스: border #5E6AD2 + subtle glow
// placeholder: "// Enter prompt content..."
```

### 6-2. Markdown 렌더링 (MarkdownRenderer)
```typescript
// 인라인 코드
'& code': {
  color: '#60A5FA',          // terminal.blue
  background: '#1A1A1A',
  border: '1px solid #242424',
}
// 코드 블록
'& pre': {
  background: '#080808',
  borderLeft: '2px solid #5E6AD2',  // 바이올렛 accent 라인
}
// blockquote
'& blockquote': {
  borderLeft: '2px solid #C084FC',  // terminal.purple
}
```

### 6-3. 버전 뱃지 (vN)
```typescript
// 현재: fg.muted 텍스트 + canvas.subtle bg
// 변경: terminal.green + 어두운 bg
{
  fontFamily: '"JetBrains Mono", monospace',
  color: '#4ADE80',          // terminal.green
  background: '#050505',
  border: '1px solid #1C1C1C',
  borderRadius: '4px',
  padding: '1px 6px',
}
```

### 6-4. API Key 표시
```typescript
// key display box
{
  background: '#050505',
  border: '1px solid #1C1C1C',
}
// key text
{
  color: '#4ADE80',          // terminal.green
  fontFamily: '"JetBrains Mono", monospace',
}
```

### 6-5. Diff 뷰어 (DiffViewer)
```typescript
// 전체 배경
background: '#050505',

// 추가 라인 (+)
backgroundColor: 'rgba(74,222,128,0.08)',
borderLeft: '3px solid #4ADE80',
color: '#4ADE80',

// 삭제 라인 (-)
backgroundColor: 'rgba(248,113,113,0.08)',
borderLeft: '3px solid #F87171',
color: '#F87171',

// 컨텍스트 라인
color: '#555555',           // subtle
```

### 6-6. Version History (VersionRow)
```
Git 로그 스타일:
● v3  current   Update persona instructions        Feb 24, 2026  [View] [Diff]
○ v2             Add system prompt context          Feb 23, 2026  [View] [Diff] [↩]
○ v1             Initial version                   Jan 15, 2026  [View] [Diff] [↩]

● : accent.fg 색상 dot (최신)
○ : fg.subtle dot (이전 버전)
vN : terminal.green + JetBrains Mono
current : success.fg 배지
타임스탬프: mono 폰트, fg.subtle
```

---

## 7. borderRadius 정책

| 요소 | 현재 | 변경 |
|------|------|------|
| Button | 6px | 6px (유지) |
| Card/Paper | 6px | **8px** |
| Input | 6px | 6px (유지) |
| Dialog | 12px | 12px (유지) |
| Chip/Badge | **20px** | **4px** (Linear 스타일) |
| Code block | 6px | 4px |
| Sidebar NavItem | — | 6px |

---

## 8. 구현 우선순위

1. **`theme.ts`** — 색상 팔레트 전체 교체 (가장 빠른 임팩트)
2. **`index.html`** — Inter + JetBrains Mono 폰트 로드
3. **`components/Sidebar.tsx`** — 신규 사이드바 컴포넌트
4. **`components/AppShell.tsx`** — 사이드바 포함한 레이아웃 재구성
5. **`pages/AgentListPage.tsx`** — 카드형 Row UI
6. **`pages/AgentDetailPage.tsx`** — 체인 목록 카드형 Row
7. **`pages/ChainDetailPage.tsx`** — 터미널 에디터, Diff, Version 히스토리
8. **`pages/ChainCreatePage.tsx`** — 터미널 에디터 스타일

---

## 11. Disabled 버튼 & 폼 유효성 피드백 스펙

> 추가일: 2026-02-24

### 11-1. 현재 문제

MUI 기본 disabled 스타일 (`opacity: 0.38`, `cursor: default`)은 활성 상태와 시각 차이가 약해 "비활성화됐다"는 인지가 부족하다.

---

### 11-2. Disabled 버튼 스타일 (theme.ts MuiButton 오버라이드)

**핵심 변경 3가지**: opacity 강화 + cursor not-allowed + 색상 wash-out

```typescript
// theme.ts — MuiButton styleOverrides에 추가
MuiButton: {
  styleOverrides: {
    root: {
      // ... 기존 스타일 유지
      '&.Mui-disabled': {
        cursor: 'not-allowed',          // default → not-allowed (명확한 불가 시그널)
        pointerEvents: 'auto',          // cursor 표시 위해 필요 (MUI 기본은 none)
      },
    },
    contained: {
      '&.MuiButton-containedPrimary.Mui-disabled': {
        backgroundColor: '#5E6AD2',     // 원래 색상 유지
        color: '#FFFFFF',
        opacity: 0.28,                  // 0.38 → 0.28 (더 강한 wash-out)
        boxShadow: 'none',
      },
    },
    outlined: {
      '&.Mui-disabled': {
        borderColor: 'currentColor',
        opacity: 0.28,
      },
    },
  },
}
```

**다크/라이트 모드 공통** — opacity 기반이므로 배경에 상관없이 일관성 유지.

**시각적 비교:**
```
[활성]    [  Create agent  ]  ← 바이올렛, 선명, opacity 1.0
[비활성]  [  Create agent  ]  ← 바이올렛, 흐릿, opacity 0.28, cursor 🚫
```

---

### 11-3. 활성화 조건 피드백 — Linear 스타일 접근

**Linear 원칙**: 실시간 에러(타이핑 중 빨간 경계)는 지양. 사용자가 *먼저 시도*하거나 *필드를 떠날 때* 피드백 제공.

#### 방식 A: Disabled 버튼 Tooltip (가장 간단, 즉시 적용 가능)

```tsx
// 버튼을 Tooltip으로 감싸기
<Tooltip
  title={!isValid ? getDisabledReason(form) : ''}
  placement="top"
  arrow
>
  <span>  {/* disabled 버튼은 Tooltip 이벤트 차단하므로 span 래핑 필요 */}
    <Button
      variant="contained"
      disabled={!isValid}
      onClick={handleSubmit}
    >
      Create agent
    </Button>
  </span>
</Tooltip>

// 이유 텍스트 생성 함수
function getDisabledReason(form): string {
  const missing = [];
  if (!form.name.trim()) missing.push('agent name');
  // 추가 필드...
  return missing.length
    ? `Required: ${missing.join(', ')}`
    : '';
}
```

**결과:**
```
[마우스 올림] ↓
┌─────────────────────┐
│ Required: agent name│  ← Tooltip
└─────────────────────┘
[  Create agent  ]   ← disabled, opacity 0.28
```

#### 방식 B: 필수 필드 Helper Text (submit 시도 후 표시)

```tsx
// 상태 추가
const [submitted, setSubmitted] = useState(false);

// submit 핸들러에서
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitted(true);
  if (!isValid) return;   // 유효하지 않으면 중단
  // ... API 호출
};

// TextField에서
<TextField
  label="Agent name"
  value={form.name}
  error={submitted && !form.name.trim()}
  helperText={
    submitted && !form.name.trim()
      ? 'Agent name is required'
      : 'Great names are short and memorable.'
  }
/>
```

**에러 상태 스타일 (자동 적용):**
- border: `danger.fg` (#F87171 다크 / #DC2626 라이트)
- helperText: `danger.fg` 색상으로 변경
- 필드 라벨: 에러 색상

---

### 11-4. 권장 조합 (frontend-dev 구현 타겟)

| 폼 | 권장 방식 |
|----|-----------|
| AgentCreatePage | A (Tooltip) + B (submit 후 helper text) |
| ChainCreatePage | A (Tooltip) + B |
| ChainDetailPage 커밋 다이얼로그 | A (Tooltip) — 단일 필드라 B 불필요 |
| 기타 다이얼로그 | A (Tooltip) 만으로 충분 |

**조합 이유**: Tooltip은 즉각적인 힌트, helper text는 submit 시도 후 명확한 에러 위치 안내. 실시간 validation 없이도 충분한 피드백.

---

### 11-5. Tooltip 스타일 (theme.ts 기존 설정 확인)

현재 MuiTooltip 오버라이드가 이미 있음. disabled 이유 표시에 맞게 추가:
```typescript
MuiTooltip: {
  styleOverrides: {
    tooltip: {
      // 기존 스타일 유지
      maxWidth: 240,                    // 긴 메시지 대비
      textAlign: 'center',
    },
  },
}
```

---

## 9. 변경하지 않는 것

- `App.tsx` Routes 구조
- 모든 API 서비스 레이어 (`services/`)
- 컴포넌트 로직 및 상태 관리

---

## 10. 다크/라이트 모드 테마 전환 스펙

> 추가일: 2026-02-24

### 10-1. 설계 철학

**다크 모드**: Linear 순수 블랙 + Terminal 감성 — 개발자가 주로 사용
**라이트 모드**: 클린 화이트 기반, 터미널 영역은 **약한 회색 배경** 유지 — accent 색상(바이올렛) 동일하게 유지

> 핵심 원칙: 라이트 모드에서도 "코드/프롬프트 에디터 영역"은 어두운 느낌을 살짝 유지해 터미널 감성을 보존.

---

### 10-2. Light Mode Color Palette

```typescript
// theme.ts에서 mode에 따라 분기하는 lightColors 객체
export const lightColors = {
  canvas: {
    default: '#FFFFFF',       // 순수 화이트 페이지 배경
    overlay: '#FAFAFA',       // 모달, 드롭다운
    inset: '#F3F4F6',         // 에디터/코드 배경 — 약한 쿨 그레이
    subtle: '#F7F7F8',        // 카드, 세컨더리 서피스
    elevated: '#EFEFEF',      // hover 서피스
  },

  fg: {
    default: '#0F0F0F',       // 거의 순수 블랙 텍스트
    muted: '#5C5C5C',         // 보조 텍스트
    subtle: '#999999',        // 플레이스홀더, 비활성
    onEmphasis: '#FFFFFF',
  },

  border: {
    default: '#E2E2E2',       // 기본 경계 (밝지만 선명)
    muted: '#EBEBEB',         // 미묘한 경계
    subtle: '#F3F3F3',        // 거의 보이지 않는 경계
    focus: '#5E6AD2',         // 포커스 링 — 다크와 동일
  },

  accent: {
    fg: '#4C54C0',            // 라이트 배경용 더 진한 바이올렛
    emphasis: '#5E6AD2',      // Primary 버튼 — 다크와 동일
    muted: '#5E6AD233',
    subtle: '#5E6AD20F',
  },

  success: {
    fg: '#16A34A',            // 진한 초록
    emphasis: '#15803D',
    muted: '#16A34A22',
    subtle: '#16A34A0F',
  },

  attention: {
    fg: '#D97706',
    emphasis: '#B45309',
    muted: '#D9770622',
    subtle: '#D977060F',
  },

  danger: {
    fg: '#DC2626',            // 진한 레드
    emphasis: '#B91C1C',
    muted: '#DC262622',
    subtle: '#DC26260F',
  },

  neutral: {
    emphasis: '#777777',
    muted: '#88888833',
    subtle: '#8888881A',
  },

  // 라이트 모드 터미널 컬러 — 다크 대비 조정
  terminal: {
    green: '#16A34A',         // 진한 초록 (배경 밝으므로 darken)
    blue: '#2563EB',          // 진한 블루
    purple: '#7C3AED',        // 진한 퍼플
    yellow: '#B45309',        // 진한 amber
  },
} as const;
```

### 10-3. 다크/라이트 비교표

| 토큰 | 다크 | 라이트 |
|------|------|--------|
| canvas.default | `#0A0A0A` | `#FFFFFF` |
| canvas.inset | `#050505` | `#F3F4F6` |
| canvas.subtle | `#111111` | `#F7F7F8` |
| fg.default | `#F0F0F0` | `#0F0F0F` |
| fg.muted | `#888888` | `#5C5C5C` |
| border.default | `#242424` | `#E2E2E2` |
| accent.fg | `#8B92E8` | `#4C54C0` |
| accent.emphasis | `#5E6AD2` | `#5E6AD2` (동일) |
| terminal.green | `#4ADE80` | `#16A34A` |

---

### 10-4. 라이트 모드에서 터미널 감성 유지 방법

**원칙**: 완전한 흰 배경 대신 쿨 그레이(#F3F4F6)를 에디터 영역에 사용.
색상은 다크 버전보다 "짙게" 조정.

#### 프롬프트 에디터 (라이트)
```
배경: #F3F4F6 (쿨 그레이, inset)
텍스트: #0F0F0F
경계: #E2E2E2
포커스 경계: #5E6AD2 (동일)
폰트: JetBrains Mono (동일)
```

#### 코드 블록 / Markdown (라이트)
```
배경: #F3F4F6
border-left (코드블록): 2px solid #5E6AD2  (동일)
인라인 코드 텍스트: #2563EB (terminal.blue darken)
blockquote border: #7C3AED (terminal.purple darken)
```

#### Diff 뷰어 (라이트)
```
배경: #F8F8F8 (아주 연한 회색)
추가(+): bg rgba(22,163,74,0.1), border #16A34A, text #16A34A
삭제(-): bg rgba(220,38,38,0.1), border #DC2626, text #DC2626
컨텍스트: #999999
```

#### 버전 뱃지 vN (라이트)
```
배경: #F3F4F6
경계: #E2E2E2
텍스트: #16A34A (terminal.green darken)
폰트: JetBrains Mono (동일)
```

#### API Key 표시 (라이트)
```
배경: #F3F4F6
텍스트: #16A34A (terminal.green darken)
```

---

### 10-5. 토글 버튼 위치 및 디자인

**위치: 사이드바 하단 고정**

```
사이드바 레이아웃:
┌─────────────────────┐
│ ◆ AgentOps          │  ← 상단 로고
│                     │
│  Agents        ●    │  ← 네비게이션
│  Monitoring   (회색) │
│  Traces       (회색) │
│                     │
│ ─────────────────── │  ← 구분선
│  [☀/🌙]   Light     │  ← 토글 버튼 (하단 고정)
└─────────────────────┘
```

**토글 스위치 스펙:**
```
위치: 사이드바 하단, mt: auto (사이드바 하단에 자동 붙기)
레이아웃: px:12px py:10px, display:flex, alignItems:center, justifyContent:space-between

왼쪽: 아이콘 + 텍스트
  아이콘: MUI LightModeOutlined (라이트) / DarkModeOutlined (다크), 14px, fg.muted
  텍스트: "Light" / "Dark" — 0.8125rem, fg.muted

오른쪽: MUI Switch 컴포넌트 (커스텀)
  checked = 다크 모드
  크기: small
  색상 커스텀:
    다크일 때 thumb: #8B92E8 (accent.fg)
    다크일 때 track: #5E6AD233 (accent.muted)
    라이트일 때 thumb: #FFFFFF
    라이트일 때 track: #E2E2E2

전체 행 hover: bg canvas.elevated, 텍스트 fg.default
```

```
시각적 예시 (사이드바 하단):
┌─────────────────────┐
│  🌙 Dark      [●  ] │  ← 다크 모드 (switch ON)
└─────────────────────┘
┌─────────────────────┐
│  ☀ Light     [  ○] │  ← 라이트 모드 (switch OFF)
└─────────────────────┘
```

**왜 사이드바 하단인가:**
- Linear의 사용자 설정 영역 패턴과 일치
- 네비게이션 흐름 방해하지 않음
- 자주 사용하는 기능이 아니므로 눈에 덜 띄는 위치가 적합
- 헤더에 두면 복잡해 보임

---

### 10-6. theme.ts 구현 가이드 (frontend-dev용)

```typescript
// theme.ts 구조 변경
import { createTheme } from '@mui/material/styles';

type ColorMode = 'dark' | 'light';

export function buildTheme(mode: ColorMode) {
  const c = mode === 'dark' ? colors : lightColors;

  return createTheme({
    palette: {
      mode,
      // ... c를 사용해서 기존과 동일한 구조로
    },
    // typography, shape, components는 mode에 무관한 것들은 공통
    // border color 등 mode-dependent한 부분만 c에서 참조
  });
}

export default buildTheme('dark'); // 기본값
```

**ThemeContext 구조 (frontend-dev 구현용):**
```typescript
// contexts/ThemeContext.tsx
const ThemeContext = createContext<{
  mode: 'dark' | 'light';
  toggle: () => void;
}>({ mode: 'dark', toggle: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark';
  });

  const toggle = () => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

---

### 10-7. 구현 순서 (frontend-dev용)

1. `theme.ts`: `lightColors` 추가 + `buildTheme(mode)` 함수로 리팩터
2. `contexts/ThemeContext.tsx`: 신규 — 위 ThemeContext 구현
3. `main.tsx`: `ThemeProvider`로 감싸기
4. `components/Sidebar.tsx`: 하단에 테마 토글 버튼 추가
5. 각 컴포넌트에서 `colors` 직접 import 대신 MUI theme 토큰 사용 확인
   (현재 `colors.canvas.inset` 직접 참조하는 곳이 많아 주의 필요)

---

## [구 GitHub 스펙 — 하단 보존]

# AgentOps UI Design Specifications (OLD — GitHub Style)

## Design System Overview

### Color Tokens (from `theme.ts`)
Use the exported `colors` object for any custom styling.

| Token             | Value       | Usage                              |
|-------------------|-------------|-------------------------------------|
| canvas.default    | `#0d1117`   | Page background                    |
| canvas.subtle     | `#161b22`   | Cards, secondary surfaces          |
| canvas.overlay    | `#161b22`   | Modals, dropdowns                  |
| canvas.inset      | `#010409`   | Input fields, code blocks          |
| fg.default        | `#e6edf3`   | Primary text                       |
| fg.muted          | `#8b949e`   | Secondary text, labels             |
| fg.subtle         | `#6e7681`   | Placeholders, disabled text        |
| border.default    | `#30363d`   | Standard borders                   |
| border.muted      | `#21262d`   | Subtle borders                     |
| accent.fg         | `#58a6ff`   | Links, interactive text            |
| accent.emphasis   | `#1f6feb`   | Primary action buttons             |
| success.emphasis  | `#238636`   | Primary CTA buttons (Create, Save) |
| danger.fg         | `#f85149`   | Delete actions, errors             |

### Typography
- **Headings**: System font stack, semibold (600)
- **Body**: 14px (0.875rem), line-height 1.5
- **Small/Caption**: 12px (0.75rem)
- **Code/Mono**: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`
- **No uppercase transforms** on buttons or tabs

### Spacing Scale
Based on 8px grid: 4, 8, 12, 16, 24, 32, 48, 64

### Border Radius
- Default: 6px
- Chips/Badges: 20px (fully rounded)
- Modals: 12px

---

## App Shell Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] AgentOps          [Search...]           [User Menu]  │  ← Header (48px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Page Content (max-width: 1280px, centered)           │  │
│  │                                                       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Header**: Fixed top, 48px height, bg: `canvas.default`, bottom border: `border.default`
- **Logo**: Simple text mark "AgentOps" in semibold with accent color circle (16px) prefix
- **Content area**: Max-width 1280px, padding 24px horizontal, centered
- **No sidebar** for now — use top navigation/tabs

---

## Page: Agent List (`/agents`)

### Layout Reference
GitHub repositories page (`github.com/{user}?tab=repositories`)

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Agents                                      [+ New agent]  │  ← Page header
├─────────────────────────────────────────────────────────────┤
│  [🔍 Find an agent...]  [Type ▾]  [Status ▾]  [Sort ▾]    │  ← Filter bar
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ agent-name-alpha                                        ││  ← Agent item
│  │ Agent description text goes here...                     ││
│  │ [TypeTag]  [StatusDot Online]  Updated 2 hours ago      ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ agent-name-beta                                         ││
│  │ Another agent description...                            ││
│  │ [TypeTag]  [StatusDot Offline]  Updated 5 days ago      ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ ...                                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Showing 1-10 of 24 agents               [< 1 2 3 ... >]  │  ← Pagination
└─────────────────────────────────────────────────────────────┘
```

### Page Header
- **Title**: "Agents" — `h2` (1.5rem, semibold)
- **New Agent button**: Green contained button (`success.emphasis`), right-aligned
  - Text: "New agent"
  - Icon: `+` prefix (AddIcon from MUI)

### Filter/Search Bar
- Full-width search TextField with magnifying glass icon
- Inline filter dropdowns (Type, Status, Sort) as outlined buttons or Select components
- Background: transparent
- Border-bottom: `border.default`
- Padding: 16px 0

### Agent List Item
Each item is a **borderless row** separated by `border.default` dividers (like GitHub repo list):

```
┌──────────────────────────────────────────────────────────────┐
│  [AgentIcon]  agent-name                           [⋯ Menu] │
│              Description of what this agent does             │
│              [Chip: TypeTag]  ● Online   Updated 2h ago     │
└──────────────────────────────────────────────────────────────┘
```

- **Agent name**: `accent.fg` (#58a6ff), semibold, clickable (link to detail page)
  - Font size: 1.25rem (20px)
- **Description**: `fg.muted` (#8b949e), single line with ellipsis overflow
  - Font size: 0.875rem (14px)
  - Max 1 line, text-overflow: ellipsis
- **Metadata row** (bottom):
  - Type tag: Small chip with `accent.subtle` background
  - Status: Colored dot (green=online, gray=offline) + status text in `fg.muted`
  - Timestamp: `fg.subtle`, relative time format ("Updated 2 hours ago")
- **Hover**: Background changes to `rgba(255,255,255,0.04)`
- **Padding**: 16px vertical, 0 horizontal
- **Click target**: Entire row is clickable

### Empty State
When no agents exist:
```
┌─────────────────────────────────────────────┐
│                                             │
│            [Agent illustration]              │
│                                             │
│         No agents found                     │
│   Create your first agent to get started    │
│                                             │
│          [+ Create an agent]                │
│                                             │
└─────────────────────────────────────────────┘
```
- Centered vertically and horizontally
- Icon/illustration: MUI SmartToyOutlined icon, 64px, `fg.subtle` color
- Title: "No agents found" in `fg.default`, 1.25rem
- Subtitle: "Create your first agent..." in `fg.muted`, 0.875rem
- CTA: Green contained button

---

## Page: Create Agent (`/agents/new`)

### Layout Reference
GitHub new repository page (`github.com/new`)

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Create a new agent                                         │  ← Page header
│  An agent manages and executes tasks autonomously.          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ──  │  ← Divider
│                                                             │
│  Agent name *                                               │
│  ┌───────────────────────────────────────────┐              │
│  │ my-agent                                  │              │
│  └───────────────────────────────────────────┘              │
│  Great names are short and memorable.                       │
│                                                             │
│  Description (optional)                                     │
│  ┌───────────────────────────────────────────┐              │
│  │                                           │              │
│  │                                           │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ──  │  ← Divider
│                                                             │
│                               [Cancel]  [Create agent]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Page Header
- **Title**: "Create a new agent" — `h2` (1.5rem, semibold)
- **Subtitle**: Descriptive text in `fg.muted`
- Bottom divider after header section

### Form Layout
- Max-width: 640px (like GitHub's new repo form)
- **No left sidebar** — single column form
- Labels above fields, semibold, `fg.default`

### Fields

#### Agent Name (required)
- **Label**: "Agent name" with red asterisk for required
- **Input**: Standard outlined TextField
  - Background: `canvas.inset` (#010409)
  - Width: 100% (of form max-width)
  - Placeholder: "my-agent"
- **Helper text**: "Great names are short and memorable." in `fg.muted`
- **Validation**:
  - Required field
  - Show red border + error text on empty submit
  - Pattern: lowercase alphanumeric + hyphens

#### Description (optional)
- **Label**: "Description" with "(optional)" in `fg.subtle`
- **Input**: Multiline TextField (3 rows)
  - Background: `canvas.inset`
  - Width: 100%
  - Placeholder: "Describe what this agent does..."

### Actions
- Horizontal divider before actions
- Right-aligned button group with 8px gap
- **Cancel**: Outlined button, navigates back to `/agents`
- **Create agent**: Green contained button (`success.emphasis`)
  - Disabled state when name field is empty
  - Loading state: replace text with CircularProgress (16px, white)

### Form Behavior
- On success: redirect to agent detail page (`/agents/{id}`)
- On error: show MUI Alert (error variant) above the form
- Disable submit button during API call

---

## Component Quick Reference

### StatusDot
A small colored circle indicating agent status:
- `online`: `success.fg` (#3fb950) with subtle glow
- `offline`: `fg.subtle` (#6e7681)
- Size: 8px
- Margin-right: 6px to adjacent text

### AgentIcon
- Default: MUI `SmartToyOutlined`
- Size: 20px for list items, 32px for detail headers
- Color: `fg.muted`

### Monospace Text
For agent IDs, timestamps, and technical values:
- Font: `monoFontFamily` from theme.ts
- Size: 0.75rem
- Color: `fg.muted`

### RoleBadge
Inline colored chip indicating prompt role:
- **system**: bg `#388bfd1a`, border `#388bfd66`, text `#388bfd` — "system"
- **user**: bg `#2ea0431a`, border `#2ea04366`, text `#3fb950` — "user"
- **assistant**: bg `#bc8cff1a`, border `#bc8cff66`, text `#bc8cff` — "assistant"
- Size: 12px font, 20px border-radius (pill shape), 4px vertical / 8px horizontal padding
- Font-weight: 500
- No uppercase transforms

### VersionBadge
Small monospace chip for version numbers (v1, v2, ...):
- bg: `canvas.subtle` (#161b22)
- border: `border.default` (#30363d)
- text: `fg.muted` (#8b949e)
- font: `monoFontFamily`, 0.75rem
- border-radius: 6px
- padding: 2px 8px

### ChainIcon
- MUI `AccountTreeOutlined` or `DeviceHubOutlined`
- Size: 20px for list items, 32px for detail headers
- Color: `fg.muted`

### PromptIcon
- MUI `ChatOutlined` or `ForumOutlined`
- Size: 20px for list items, 28px for section headers
- Color: `fg.muted`

---

## Page: Agent Detail — Chains Section (`/agents/{id}`)

### Layout Update
The Chains section is appended **below** the existing metadata fields in AgentDetailPage, separated by a Divider.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Agents                                           │
│                                                             │
│  [🤖] agent-name-alpha                                      │  ← h2
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Description                                                │
│  Handles all document ingestion tasks                       │
│                                                             │
│  Created                                                    │
│  Jan 15, 2026, 10:30:00 AM                                  │
│                                                             │
│  Last Updated                                               │
│  Feb 20, 2026, 3:00:00 PM                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │  ← Divider
│                                                             │
│  Chains                              [+ New Chain]          │  ← Section header
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ingestion-chain                          3 prompts  2h ago│
│  │ Processes and indexes incoming documents                 ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ summarizer-chain                         1 prompt   5d ago│
│  │ Generates concise summaries of documents                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Chains Section Header
- **Label**: "Chains" — `h3` (1.25rem, semibold), `fg.default`
- **New Chain button**: Outlined small button, right-aligned
  - Icon: `AddIcon` prefix, 16px
  - Text: "New Chain"
  - Navigates to `/agents/{agentId}/chains/new`
- Header row uses `display: flex`, `justifyContent: 'space-between'`, `alignItems: 'center'`
- `mb: 2` below header before list

### Chain List Item
Follows the same divider-separated row pattern as the Agent list:

```
┌──────────────────────────────────────────────────────────────┐
│  [🌿] chain-name                    [3 prompts]  Updated 2h  │
│       Chain description preview (single line ellipsis)       │
└──────────────────────────────────────────────────────────────┘
```

- **Icon**: `ChainIcon` (AccountTreeOutlined), 20px, `fg.subtle`
- **Chain name**: `accent.fg` (#58a6ff), semibold 1rem, clickable link to `/agents/{agentId}/chains/{chainId}`
- **Prompt count chip**: Small outlined chip, right-aligned in name row
  - Text: "3 prompts" or "1 prompt" (singular for 1)
  - Color: `fg.muted`, `border.default` border
  - Height: 20px, font 0.75rem
- **Description**: `fg.muted`, 0.875rem, single line ellipsis, `mb: 0.5`
- **Timestamp**: `fg.subtle`, 0.75rem, relative time ("Updated 2h ago")
- **Padding**: 12px vertical
- **Hover**: `rgba(255,255,255,0.04)` background
- **Click target**: Entire row

### Chains Empty State
When the agent has no chains:
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    [🌿 ChainIcon 48px]                       │
│                                                              │
│             No chains yet                                    │
│     Add a chain to organize prompts for this agent.          │
│                                                              │
│                   [+ New Chain]                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
- Container: `py: 6`, `display: flex`, `flexDirection: column`, `alignItems: center`
- Icon: `AccountTreeOutlined`, 48px, `fg.subtle`
- Title: "No chains yet" — `fg.default`, 1rem, `mt: 2`, `mb: 0.5`
- Subtitle: `fg.muted`, 0.875rem, `mb: 2.5`
- CTA: Outlined button "+ New Chain"

---

## Page: Create Chain (`/agents/{agentId}/chains/new`)

### Layout Reference
Mirrors `AgentCreatePage` — single-column form, max-width 640px.

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to agent-name-alpha                                 │  ← Back nav
│                                                             │
│  Create a new chain                                         │  ← h2
│  Chains group ordered prompts for an agent workflow.        │  ← subtitle
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Chain name *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ my-chain                                            │    │
│  └─────────────────────────────────────────────────────┘    │
│  A short, descriptive name for this prompt chain.           │
│                                                             │
│  Description (optional)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                              [Cancel]  [Create chain]       │
└─────────────────────────────────────────────────────────────┘
```

### Back Navigation
- Text button with `ArrowBackIcon`: "Back to {agentName}"
- Navigates to `/agents/{agentId}`
- `mb: 2`

### Page Header
- **Title**: "Create a new chain" — `h2`
- **Subtitle**: "Chains group ordered prompts for an agent workflow." — `fg.muted`, `body1`
- `mb: 3` then Divider

### Fields

#### Chain Name (required)
- **Label**: "Chain name" with red asterisk `<span style={{ color: colors.danger.fg }}>*</span>`
- **Input**: Outlined TextField, fullWidth, `canvas.inset` background
- **Placeholder**: "my-chain"
- **Helper text**: "A short, descriptive name for this prompt chain." — `fg.muted`
- **Validation**: Required, min 1 char

#### Description (optional)
- **Label**: "Description" + `(optional)` in `fg.subtle` as caption
- **Input**: Multiline TextField, 3 rows, fullWidth
- **Placeholder**: "Describe what this chain does..."

### Actions
- Horizontal Divider before buttons
- Right-aligned row (`justifyContent: flex-end`, `gap: 8px`)
- **Cancel**: Outlined button → navigates to `/agents/{agentId}`
- **Create chain**: Contained green button (`success.emphasis`)
  - Disabled when name is empty
  - Loading state: `CircularProgress` 16px white

### Form Behavior
- On success: redirect to `/agents/{agentId}/chains/{chainId}`
- On error: `Alert` severity="error" above form
- Disable submit during API call

---

## Page: Chain Detail (`/agents/{agentId}/chains/{chainId}`)

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to agent-name-alpha                                 │  ← Back nav
│                                                             │
│  [🌿] ingestion-chain                  [Edit]  [Delete]     │  ← h2 + actions
│  Processes and indexes incoming documents                   │  ← description
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Prompts                              [+ Add Prompt]        │  ← section header
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ #1  [system]  You are a document ingestion assistant... ││  ← prompt row
│  ├─────────────────────────────────────────────────────────┤│
│  │ #2  [user]    Extract and summarize the following doc...││
│  ├─────────────────────────────────────────────────────────┤│
│  │ #3  [assistant] Here is the structured summary:...     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Back Navigation
- Text button with `ArrowBackIcon`: "Back to {agentName}"
- `mb: 2`

### Page Header Row
```
[ChainIcon 32px]  chain-name (h2)          [Edit btn]  [Delete btn]
```
- `display: flex`, `alignItems: center`, `gap: 12px`
- **ChainIcon**: `AccountTreeOutlined`, 32px, `fg.muted`
- **Chain name**: `h2` (1.5rem, semibold, `fg.default`)
- **Action buttons** (pushed to right via `ml: auto`):
  - **Edit**: Outlined small button, `EditOutlined` icon, navigates to edit form or opens inline edit
  - **Delete**: Text small button, `DeleteOutlined` icon, `danger.fg` color
    - Triggers confirmation dialog before deletion
- `mb: 1`

### Description
- `fg.muted`, `body1`, `mb: 3`
- If no description: show "No description" in `fg.subtle`

### Prompts Section Header
- Same pattern as Chains section header in AgentDetailPage
- **Label**: "Prompts" — `h3`
- **Add Prompt button**: Outlined small button "+ Add Prompt"
  - Navigates to `/agents/{agentId}/chains/{chainId}/prompts/new`

### Prompt List Item
```
┌──────────────────────────────────────────────────────────────┐
│  #1  [system]  You are a document ingestion assistant...     │  ← row
└──────────────────────────────────────────────────────────────┘
```
- **Layout**: `display: flex`, `alignItems: flex-start`, `gap: 12px`, `py: 2`
- **Order number**: `fg.subtle`, 0.875rem, monospace, min-width 24px, right-aligned (`text-align: right`)
  - Format: `#1`, `#2`, etc.
- **RoleBadge**: Role-colored chip (see RoleBadge component above), flex-shrink 0
- **Content preview**: `fg.default`, 0.875rem, monospace font, single line ellipsis
  - `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`
  - `flex: 1`, `minWidth: 0`
- **Hover**: `rgba(255,255,255,0.04)` background, cursor pointer
- **Click target**: Entire row → navigates to `/agents/{agentId}/chains/{chainId}/prompts/{promptId}`
- Rows separated by Divider

### Prompts Empty State
When chain has no prompts:
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    [💬 PromptIcon 48px]                      │
│                                                              │
│             No prompts yet                                   │
│       Add prompts to define this chain's behavior.           │
│                                                              │
│                  [+ Add Prompt]                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
- Same empty state pattern as Chains section above

### Delete Chain Confirmation Dialog
```
┌────────────────────────────────────────┐
│  Delete chain                          │  ← DialogTitle
│                                        │
│  Are you sure you want to delete       │  ← DialogContent
│  "ingestion-chain"? This will also     │
│  delete all prompts in this chain.     │
│  This action cannot be undone.         │
│                                        │
│               [Cancel]  [Delete chain] │  ← DialogActions
└────────────────────────────────────────┘
```
- **Dialog**: MUI Dialog, `canvas.overlay` bg, 12px border-radius
- **Delete button**: Contained, `danger.emphasis` (#da3633) bg, white text
- **Cancel**: Outlined button

---

## Page: Prompt Detail (`/agents/{agentId}/chains/{chainId}/prompts/{promptId}`)

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to ingestion-chain                                  │  ← Back nav
│                                                             │
│  [💬] Prompt #1                        [Delete]             │  ← header + delete
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Role *                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ system                                          ▾   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Order *                                                    │
│  ┌───────────────┐                                          │
│  │ 1             │                                          │
│  └───────────────┘                                          │
│                                                             │
│  Content *                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ You are a document ingestion assistant. Your job    │    │
│  │ is to extract structured information from the given │    │
│  │ documents and return them in JSON format.           │    │
│  │                                                     │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                              [Discard]  [Save changes]      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Version History                                            │  ← section
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [v2]  Feb 20, 2026  [system]  You are a document...    ││  ← latest
│  ├─────────────────────────────────────────────────────────┤│
│  │ [v1]  Jan 15, 2026  [system]  You are an assistant...  ││  ← older
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Back Navigation
- Text button with `ArrowBackIcon`: "Back to {chainName}"
- `mb: 2`

### Page Header Row
```
[PromptIcon 28px]  Prompt #1 (h2)                   [Delete btn]
```
- **PromptIcon**: `ChatOutlined`, 28px, `fg.muted`
- **Title**: "Prompt #1" — `h2`, where `#1` is the order number
- **Delete button**: Text small button, `DeleteOutlined` icon, `danger.fg` color, `ml: auto`
- `mb: 2`

### Edit Form

#### Role (required)
- **Label**: "Role" with red asterisk
- **Input**: MUI `Select` (outlined, small), fullWidth
  - Options rendered with inline `RoleBadge` preview:
    - `● system` (blue dot + text)
    - `● user` (green dot + text)
    - `● assistant` (purple dot + text)
  - Selected value also shows the RoleBadge inline in the closed state
- **Width**: 200px (not full-width; role is a short selection)

#### Order (required)
- **Label**: "Order" with red asterisk
- **Input**: Outlined TextField, type="number", min=1
- **Width**: 120px
- **Helper text**: "Position in the chain (1 = first)"

#### Content (required)
- **Label**: "Content" with red asterisk
- **Input**: Multiline TextField, fullWidth
  - **Rows**: `minRows: 8`, `maxRows: 24` (auto-grow)
  - **Font**: `monoFontFamily` via `sx={{ fontFamily: monoFontFamily, fontSize: '0.875rem' }}`
  - **Background**: `canvas.inset` (#010409)
  - **Line height**: 1.6 for readability
  - Placeholder: "Enter prompt content..."

#### Form Layout
- `display: flex`, `flexDirection: column`, `gap: 3` (24px)
- Role + Order on same row: `display: flex`, `gap: 2`, `alignItems: flex-start`

#### Actions
- Horizontal Divider before buttons
- Right-aligned row (`justifyContent: flex-end`, `gap: 8px`)
- **Discard**: Outlined button — resets form to last saved state
- **Save changes**: Contained green button (`success.emphasis`)
  - Disabled when form is unchanged or invalid
  - Loading state: CircularProgress 16px white
  - Text changes to "Saving..." during request

### Version History Section

```
Version History
─────────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────────┐
│ [v2] Feb 20, 2026 3:00 PM  [system]                        │  ← collapsed row
│      You are a document ingestion assistant. Your job...   │
├────────────────────────────────────────────────────────────┤
│ ▶ [v1] Jan 15, 2026 10:30 AM  [system]  (click to expand)  │  ← collapsed row
└────────────────────────────────────────────────────────────┘
```

**Expanded version row:**
```
┌────────────────────────────────────────────────────────────┐
│ ▼ [v2] Feb 20, 2026 3:00 PM  [system]                      │  ← expanded header
│   ┌──────────────────────────────────────────────────────┐ │
│   │ You are a document ingestion assistant. Your job     │ │  ← full content
│   │ is to extract structured information from the given  │ │
│   │ documents and return them in JSON format.            │ │
│   └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

#### Version History Header
- **Label**: "Version History" — `h3`
- No button (read-only section)
- `mb: 2` after label

#### Version Row (collapsed default)
- **Layout**: `display: flex`, `alignItems: center`, `gap: 12px`, `py: 1.5`, `px: 0`
- **Expand icon**: `ChevronRightIcon` / `ChevronDownIcon`, 16px, `fg.subtle`, left edge
- **VersionBadge**: e.g. "v2" (see VersionBadge component spec)
- **Timestamp**: `fg.subtle`, 0.75rem, monospace, format "Feb 20, 2026 3:00 PM"
- **RoleBadge**: role chip
- **Content preview**: `fg.muted`, 0.875rem, monospace, single-line ellipsis, `flex: 1`
- **Hover**: `rgba(255,255,255,0.04)` background, cursor pointer
- Latest version (highest version_number) is **expanded by default**

#### Version Row (expanded)
- Expand icon rotates to `ChevronDownIcon`
- Below the header row, shows a code block for full content:
  - `background: canvas.inset`, `border: 1px solid border.default`, `borderRadius: 6px`
  - `padding: 12px`, `fontFamily: monoFontFamily`, `fontSize: 0.8125rem`
  - `color: fg.default`, `whiteSpace: pre-wrap`, `wordBreak: break-word`
  - `mt: 1`, `mb: 1`
- Animation: smooth expand/collapse using MUI `Collapse` component

#### Version List Ordering
- Sorted by `version_number` descending (newest first)
- Latest version row has a subtle "Current" label badge:
  - Text: "current", `fg.onEmphasis`, `canvas.subtle` bg with `success.fg` border
  - Small pill, 0.625rem font, adjacent to VersionBadge

---

## Page: Create Prompt (`/agents/{agentId}/chains/{chainId}/prompts/new`)

### Structure
Mirrors ChainCreatePage form pattern, max-width 640px.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to ingestion-chain                                  │
│                                                             │
│  Add a prompt                                               │  ← h2
│  Prompts are executed in order within the chain.            │  ← subtitle
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Role *        Order *                                      │
│  ┌──────────┐  ┌────────┐                                   │
│  │ system ▾ │  │ 1      │                                   │
│  └──────────┘  └────────┘                                   │
│                                                             │
│  Content *                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  (monospace, 8+ rows)                               │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                              [Cancel]  [Add prompt]         │
└─────────────────────────────────────────────────────────────┘
```

### Fields
Same spec as PromptDetailPage edit form:
- **Role**: Select with RoleBadge previews, width 200px, default "user"
- **Order**: Number input, width 120px, auto-incremented to next available position
- **Content**: Monospace multiline TextField, minRows 8

### Actions
- **Cancel**: Outlined button → navigates to `/agents/{agentId}/chains/{chainId}`
- **Add prompt**: Contained green button
  - Disabled when content is empty
  - Loading state: CircularProgress

---

## Route Structure Summary

```
/agents                                    → AgentListPage
/agents/new                                → AgentCreatePage
/agents/:agentId                           → AgentDetailPage (+ Chains section)
/agents/:agentId/chains/new                → ChainCreatePage
/agents/:agentId/chains/:chainId           → ChainDetailPage
/agents/:agentId/chains/:chainId/prompts/new          → PromptCreatePage
/agents/:agentId/chains/:chainId/prompts/:promptId    → PromptDetailPage
```

---

## Navigation Breadcrumb Pattern

For deeper pages, use a text back button pattern (not full breadcrumbs) to maintain visual simplicity:

```
← Back to {parentName}
```

- Rendered as MUI `Button` with `variant="text"`, `startIcon={<ArrowBackIcon />}`
- Color: `fg.muted` default, `fg.default` on hover
- Font size: 0.875rem
- `mb: 2` below nav
- Actual navigates one level up in the hierarchy

---

## Interaction States Summary

| Element          | Default             | Hover                        | Active / Selected          |
|------------------|---------------------|------------------------------|----------------------------|
| List row         | transparent bg      | `rgba(255,255,255,0.04)` bg  | —                          |
| Chain name link  | `accent.fg` #58a6ff | underline                    | —                          |
| Expand toggle    | ChevronRight icon   | `fg.default`                 | ChevronDown icon           |
| Role Select      | border.default      | border `fg.subtle`           | border `accent.fg` + glow  |
| Content textarea | border.default      | border `fg.subtle`           | border `accent.fg` + glow  |
| Delete button    | `danger.fg` text    | `danger.subtle` bg           | —                          |
| Save button      | `success.emphasis`  | #2ea043                      | loading state              |
