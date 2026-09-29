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
npm install -g git-tree-cli
```
Run anywhere:
```bash
git-tree
```

### Instant Execution without Installation (npx)
```bash
npx git-tree-cli
```

---

## AI Agent Skill Setup

`git-tree-cli` includes a bundled AI agent skill that enables your AI assistant to automatically run the right commands when you ask questions like *"Show me git tree"*, *"What merges happened this week?"*, or *"What do I have in stash?"*.

To install the skill into your AI environment globally:

```bash
git-tree install-skill
```

This automatically detects and installs `SKILL.md` to:
- **Google Antigravity**: `~/.gemini/skills/git-tree-cli/SKILL.md`
- **Claude**: `~/.claude/skills/git-tree-cli/SKILL.md`
- **Cursor**: `.cursor/skills/git-tree-cli/SKILL.md`
- **Global AI configs**: `~/.config/ai-skills/git-tree-cli/SKILL.md`

You can also target a specific platform:
```bash
git-tree install-skill antigravity
git-tree install-skill claude
```

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
| **Portal (Branch Exit/Entry)** | `◎` | Clean portal eliminating line spam for distant/dormant branches |

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
git-tree                       # Portal mode (default): uses ◎ portals for distant merges/branches to eliminate line clutter
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

### 7. AI Discovery
```bash
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
