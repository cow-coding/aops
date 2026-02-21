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
