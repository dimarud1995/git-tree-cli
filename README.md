# git-tree-cli

> **AI-First, Visually Stunning Terminal Git Tree Visualizer**  
> *Written in TypeScript • Geometric Unicode Curves • 24-bit TrueColor • Orthogonal Attribute Engine • Bundled AI Skill*

---

## Why `git-tree`?

Standard `git log --graph` produces narrow, hard-to-read ASCII text with minimal visual separation. Existing third-party tools are either heavyweight interactive TUIs (like `lazygit` or `tig` which block script/AI execution) or rigid one-off scripts.

**`git-tree`** is built from the ground up to solve this:
- 🎨 **Visual Perfection**: Monospace geometric glyphs (`●`, `◉`, `◆`, `■`, `▲`, `○`) and smooth rounded curves (`╭─`, `╰─`, `│`, `├─`). **No messy emojis** that cause font misalignment.
- 🌈 **24-bit TrueColor Branch Routing**: Multi-branch graphs are colored with curated high-contrast palettes (Tokyo Night, Catppuccin, Nord, or Mono) with automatic fallback.
- 📐 **Wider, Generous Spacing**: Eliminates cramped 1-character graph columns in favor of clear, readable branch spacing.
- 🤖 **AI-First Tooling**: Designed so AI coding assistants can effortlessly inspect and render Git history for users via an ultra-flexible, orthogonal CLI flag matrix.
- 📦 **Multi-Format Output**:
  - `terminal` (ANSI TrueColor for direct terminal use)
  - `markdown` (clean fenced code blocks for AI chat responses and documentation)
  - `json` (structured graph data for automated pipelines)
- 🧠 **Bundled AI Skill**: Ships with an embedded `SKILL.md` and an auto-installer (`git-tree install-skill`) so AI assistants (Antigravity, Claude, Cursor) immediately know how to use it.

---

## Visual Example

```text
─────────────── GIT TREE ── payment-service (feature/payments) ── 4 commits ───────────────

○       [DIRTY]    Working tree dirty (+2 staged, 1 unstaged)
│
◉       42a805f    (HEAD -> feature/payments) Implement Stripe payment processor                Dmitry R.
│       10m ago
│
◆──╮    f284b8c    [⚑ v1.0.0] (main) ◆ Merge branch feature/login into main                     Dmitry R.
│  │    1h ago
│  │
│  ●    55083e6    (▹ feature/login) Add user login service                                     Dmitry R.
│  │    2h ago
│  │
│  │ ▲  stash@{0}  On main: WIP on database config                                              Dmitry R.
│  │ │  3h ago
│  │
●──╯ │  7271f8e    Add application configuration                                                Dmitry R.
│    │  4h ago
│    │
╰────╯
■       cf4f01a    [⚑ v0.1.0] Initial commit                                                    Dmitry R.
        1d ago
```

---

## Installation

### Via npm (Global)
```bash
# From GitHub repository:
npm install -g git+https://github.com/dimarud1995/git-tree-cli.git

# Or via npm registry:
npm install -g git-tree-cli
```
Run anywhere in any Git repository:
```bash
git-tree
```

### Instant Execution without Installation (npx)
```bash
# Run directly via npx:
npx -y git-tree-cli -10

# Or directly from GitHub:
npx -y git+https://github.com/dimarud1995/git-tree-cli.git -10
```

---

## 🤖 AI Agent Setup (Zero-Friction Prompt)

`git-tree-cli` is engineered from the ground up for AI coding assistants (Google Antigravity, Claude, Cursor, OpenAI Codex).

### Give Your AI Just the Repo Name
You can tell your AI assistant:
> *"Install and use `git-tree-cli` from repository `dimarud1995/git-tree-cli`. Whenever I ask to view commits, show last 10 commits, or inspect git history, always prioritize `git-tree-cli` over standard `git log`."*

### AI Agent Execution Steps
AI assistants can install both the CLI package and the skill in one command:
```bash
npm install -g git+https://github.com/dimarud1995/git-tree-cli.git && git-tree install-skill
```
Or without global package installation:
```bash
npx -y git+https://github.com/dimarud1995/git-tree-cli.git install-skill
```

`git-tree install-skill` automatically detects and installs `SKILL.md` to all supported AI environments:
- **Google Antigravity**: `~/.gemini/skills/git-tree-cli/SKILL.md`, `~/.gemini/config/skills/`, and project `.agents/skills/`
- **Claude**: `~/.claude/skills/git-tree-cli/SKILL.md`
- **Cursor**: `.cursor/skills/git-tree-cli/SKILL.md`
- **Standard Agent Skill Hubs**: `~/.agents/skills/git-tree-cli/SKILL.md`
- **Global AI configs**: `~/.config/ai-skills/git-tree-cli/SKILL.md`

You can also target a specific platform:
```bash
git-tree install-skill antigravity
git-tree install-skill claude
git-tree install-skill cursor
git-tree install-skill agents
```

### Strict Priority Over Standard `git log`
Once installed, the AI skill enforces that whenever you ask:
- *"Show me last 10 commits"* (or any number N)
- *"Show commit history / git tree"*
- *"What was merged recently?"*
- *"What do I have in stash?"*

The AI **always prioritizes `git-tree -<N> --ai`** and outputs the clean monospace block verbatim, instead of falling back to standard `git log`.

---

## Geometric Symbol Legend

| Symbol | Glyph | Description |
| :--- | :---: | :--- |
| **Commit** | `●` | Standard Git commit |
| **Active HEAD** | `◉` | Current checkout HEAD commit |
| **Merge Commit** | `◆` | Commit merging two or more branches |
| **Root Commit** | `■` | Initial repository root commit |
| **Stashed State** | `▲` | Git stash (`stash@{0}`) plotted atop base commit |
| **Dirty Worktree** | `○` | Uncommitted / unstaged changes |
| **Tag Reference** | `⚑` | Annotated or lightweight tag (e.g. `[⚑ v1.0.0]`) |
| **Remote Branch** | `▹` | Remote-tracking branch (e.g. `▹ origin/main`) |
| **Branch Connectors**| `╭─ ╰─ │` | Rounded smooth box-drawing curves |
| **Portal (Branch Exit/Entry)** | `◎` | Clean portal on connector rows between commits eliminating line spam |

---

## Usage & Flag Matrix

`git-tree` provides an orthogonal flag system where flags can be freely combined without conflict.

### 1. Scoping (Which branches to show)
```bash
git-tree                       # All local and remote branches (default)
git-tree --current             # Only commits reachable from current HEAD
git-tree --branches main,dev   # Specific branches
git-tree --no-remotes          # Hide remote tracking branches
git-tree --no-tags             # Hide tag references
```

### 2. Filtering (Which commits to show)
```bash
git-tree -100                                # Shorthand: limit to last 100 commits (-n 100, --limit 100)
git-tree --email "dmr@aryze.io"              # Filter by author email
git-tree --email "dmr@aryze.io, alice@co.com"# Multiple comma-separated emails
git-tree --author "Dmitry, Alice"            # Multiple comma-separated author names or regexes
git-tree --since "2 weeks ago"               # Commits newer than date
git-tree --until "2026-01-01"                # Commits older than date
git-tree --grep "auth"                       # Filter by commit message regex
```

### 3. Entity Toggles (Tri-state isolation)
```bash
# Merges
git-tree --merges              # Include merges (default)
git-tree --no-merges           # Exclude merges
git-tree --only-merges         # Show ONLY merge commits

# Stashes
git-tree --stashes             # Include stashes (default)
git-tree --no-stashes          # Exclude stashes
git-tree --only-stashes        # Show ONLY stashes

# Dirty Worktree Status
git-tree --status              # Include uncommitted changes (default)
git-tree --no-status           # Exclude dirty changes
git-tree --only-status         # Show ONLY uncommitted status
```

### 4. Layout & Styling
```bash
# Graph Lines Routing (Line Spam Prevention)
git-tree                       # Portal mode (default): uses ◎ portals on dedicated connector rows between commit rows for distant merges/branches to eliminate line spam, with 1-line exit connections and space-filling teleport lines
git-tree --full-lines          # Full lines mode: draws continuous vertical lines across all rows (legacy mode)
git-tree --lines full          # Same as --full-lines
git-tree --lines portal        # Explicit portal mode

# Layout modes
git-tree --layout compact      # Dense single-line mode (omits author/date)
git-tree --layout normal       # Default balanced view (4 columns, date below hash)
git-tree --layout expanded     # Multi-line cards with full author and dates

# Output format
git-tree --format terminal     # ANSI TrueColor (default)
git-tree --format markdown     # Fenced code block (ideal for AI chat responses)
git-tree --format json         # Structured JSON graph for machine processing

# Column toggles & Width
git-tree -w 140                           # Target table width in characters (auto-detected in TTY, default 120)
git-tree --columns title,author           # Dedicated whitelist: show only specified columns
git-tree --columns tree,hash,title        # Show graph, hash, and title (skip date and author)
git-tree --skip-columns graph,date        # Dedicated blacklist: skip specified columns
git-tree --no-graph                       # Hide graph tree column (clean borderless table)
git-tree --no-author                      # Hide author column (or --hide-author)
git-tree --no-date                        # Hide date under hash (or --hide-date)
git-tree --no-hash                        # Hide commit hash (or --hide-hash)
git-tree --no-title                       # Hide commit title (or --hide-title)
git-tree --description                    # Include commit message body description (off by default, only titles on)

# Themes & Line Styles
git-tree --theme tokyo         # Tokyo Night palette (default)
git-tree --theme catppuccin    # Catppuccin Mocha palette
git-tree --theme nord          # Nord palette
git-tree --theme mono          # Plain monochrome
git-tree --style curved        # Rounded corners (╭─ ╰─) (default)
git-tree --style straight      # Sharp corners (┌─ └─)
git-tree --style ascii         # Pure ASCII (| / \ *)

# Repository Header Rule
git-tree                       # Header enabled by default (shows repo name, active branch, and commit count)
git-tree --no-header           # Hide repository header rule (or --hide-header)
git-tree --repo-name <name>    # Override repository display title in header
```

### 5. Dedicated Commit Type Badges
Non-regular commits display high-visibility badges in the title column to instantly identify repository operations:
- **`[MERGE]`**: Dedicated **bold red** badge on merge commits (2+ parents).
- **`[REBASE]`**: Dedicated **bold purple** badge on rebase and cherry-picked commits.
- **`[FAST-FORWARD]`**: Dedicated **bold cyan** badge on fast-forward merges.
- **`[SQUASH]`**: Dedicated **bold amber** badge on squash-and-merge commits.
- Regular commits display clean titles with 0 badge clutter.

### 6. Smart Perceptual Author Color Engine
Every author is automatically assigned a unique, deterministic 24-bit TrueColor hex color using a fast FNV-1a hash with bit avalanche mixing. The colors are dynamically calibrated against WCAG relative luminance ($Y \approx 0.22 \pm 0.02$) to mathematically guarantee high contrast and effortless readability on **both dark and light terminal backgrounds** ($\ge 5.0:1$ contrast against black, $\ge 3.8:1$ against white). All of this happens under the hood with 0 configuration.

### 7. AI Directives & Discovery
```bash
git-tree --ai                  # AI-first output: attaches <ai_context> envelope with exact character dimensions, rows, strict zero-wrap directives, and repository state (aliases: --extra-details-for-ai, --ai-hints, --ai-format)
git-tree --explain-flags       # Machine-readable JSON schema of all capabilities
```

---

## Programmatic TypeScript API

You can also import and use `git-tree-cli` directly in your TypeScript/JavaScript projects:

```ts
import { generateGitTree, TreeCliOptions } from 'git-tree-cli';

const output = await generateGitTree({
  merges: 'include',
  stashes: 'include',
  status: 'include',
  layout: 'normal',
  format: 'markdown',
  date: 'relative',
  style: 'curved',
  color: 'never',
  theme: 'tokyo',
  showAuthor: true,
  showDate: true,
  showHash: true,
  hashLen: 7,
});

console.log(output);
```

---

## Development & Testing

```bash
# Install dependencies
npm install

# Run unit and integration tests (Vitest)
npm test

# Build production bundle (tsup)
npm run build
```

---

## License

MIT © Dmytro Rud
