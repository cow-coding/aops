# AgentOps UI Design Specifications

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
