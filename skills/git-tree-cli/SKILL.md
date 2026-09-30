---
name: git-tree-cli
description: Visualizes Git commit graphs, branch lifecycles, merges, stashes, and dirty states as a gorgeous geometric terminal tree. Use whenever asked to view or explain Git history, branches, recent merges, stashes, or commit graphs.
---

# `git-tree-cli` Skill for AI Agents

When the user asks you questions about their Git repository, history, branches, or stashes, use the `git-tree` CLI tool instead of raw `git log`. `git-tree` produces clean, monospace-aligned geometric trees with curved branch lines and clear metadata.

## Quick Decision & Intent Mapping

| User Query | Recommended Command |
| :--- | :--- |
| "Show me git tree / history" | `git-tree --ai` |
| "Show last 10 / 50 / 100 commits" | `git-tree -10 --ai` (or `-50`, `-100`) |
| "Show only my current branch commits" | `git-tree --current --ai` |
| "What was merged recently?" | `git-tree --only-merges -15 --ai` |
| "What do I have in my stash?" | `git-tree --only-stashes --ai` |
| "What changed in the working tree / status?" | `git-tree --only-status --ai` |
| "Show commits by [author] this week" | `git-tree --author "[author]" --since "1 week ago" --ai` |
| "Show commits by email" | `git-tree --email "[email]" -100 --ai` |
| "Show commits by multiple emails" | `git-tree --email "[email1],[email2]" -100 --ai` |
| "Show branches `main` and `develop`" | `git-tree --branches main,develop --ai` |
| "Show commits without graph tree (plain table)" | `git-tree --no-graph --ai` |
| "Show only commit titles and authors" | `git-tree --columns title,author --ai` |
| "Show commits with full body descriptions" | `git-tree --description -10 --ai` |
| "Compact summary of last 20 commits" | `git-tree -20 --layout compact --ai` |
| "Detailed view of recent commits" | `git-tree -10 --layout expanded --ai` |

> **IMPORTANT FOR AI AGENTS**: When fetching history for a user, ALWAYS pass `--ai` (or `--format markdown`). Passing `--ai` automatically sets markdown mode, wraps the tree in a clean ```` ```text ```` code block, and prepends `<ai_context>` containing exact table character widths, row counts, and strict zero-wrap directives. Always present the enclosed monospace code block **VERBATIM** to the user without altering characters, summarizing, or reformatting into markdown tables. When running directly in an interactive terminal for the user, use the default `--format terminal`.

---

## Geometric Symbol Legend

- `●`: Normal commit
- `◉`: Active HEAD commit
- `◆`: Merge commit
- `■`: Root / initial repository commit
- `▲`: Stashed work (`stash@{0}`)
- `○`: Dirty working tree state (unstaged/staged modifications)
- `⚑`: Tag annotation
- `◎`: Portal glyph (branch departs to or emerges from distant commit on dedicated connector rows between commits, avoiding line spam)
- `╭─ ╰─ │`: Rounded smooth branch connection curves

### Commit Type Badges (Title Column)
- `[MERGE]`: Dedicated **red** badge on merge commits (2+ parents)
- `[REBASE]`: Dedicated **purple** badge on rebase / cherry-picked commits
- `[FAST-FORWARD]`: Dedicated **cyan** badge on fast-forward merges
- `[SQUASH]`: Dedicated **amber** badge on squashed commits

---

## Complete Flag Matrix

### Scoping
- `-a, --all`: Include all local and remote branches (default: true).
- `-c, --current`: Show only commits reachable from current `HEAD`.
- `-b, --branches <b1,b2>`: Restrict to specific comma-separated branch names.
- `--no-remotes`: Omit remote tracking branches.
- `--no-tags`: Omit tag markers.

### Filtering
- `-<N>, -n <N>, --limit <N>, --max-count <N>`: Maximum commits to output (e.g. `-10`, `-50`, `-n 20`).
- `--since <date>`: Show commits more recent than `<date>` (e.g. `2 days ago`, `2026-01-01`).
- `--until <date>`: Show commits older than `<date>`.
- `--author <pattern>`: Filter commits by author name or regex (comma-separated for multiple).
- `--email <pattern>`: Filter commits by author email (comma-separated for multiple, e.g. `--email "dmr@aryze.io, dev@example.com"`).
- `--grep <pattern>`: Filter commits by commit message regex.

### Entity Isolation Toggles
- `--merges` / `--no-merges` / `--only-merges`: Toggle merge commits.
- `--stashes` / `--no-stashes` / `--only-stashes`: Toggle stash entries.
- `--status` / `--no-status` / `--only-status`: Toggle working tree status.

### Presentation & Output
- `--lines <portal|full>`: Graph lines mode. `portal` (default) uses `◎` portals on dedicated connector rows between commit rows for distant branches to prevent line clutter, branching with corners (`◆──╮`), providing an exact 1-line connection into portals, and filling empty space from teleports; `full` renders continuous vertical lines.
- `--full-lines`: Shortcut for `--lines full` (legacy continuous line graph).
- `-f, --format <terminal|markdown|json>`: Output format. Use `markdown` for AI responses, `json` for machine processing.
- `-l, --layout <compact|normal|expanded>`: Density mode.
- `-d, --date <relative|iso|short>`: Date formatting (default: `relative`).
- `-s, --style <curved|straight|ascii>`: Line drawing style (default: `curved`).
- `-t, --theme <tokyo|catppuccin|nord|mono>`: Color theme for terminal output.
- `-w, --width <columns>`: Target table width (auto-detected in TTY, default: 120).
- `--columns <list>`: Explicit whitelist of columns to show: `graph,hash,date,title,description,author`.
- `--skip-columns <list>`: Blacklist of columns to skip (e.g. `--skip-columns graph,date`).
- `--no-graph` / `--hide-graph`: Omit graph tree column.
- `--no-title` / `--hide-title`: Omit commit title column.
- `--no-author` / `--hide-author`: Omit author column.
- `--no-date` / `--hide-date`: Omit date under commit hash.
- `--no-hash` / `--hide-hash`: Omit commit hash column.
- `--no-header` / `--hide-header`: Omit top repository header banner rule (shows repo name, branch, and commit count by default).
- `--repo-name <name>`: Override repository display title in header.
- `--ai`: AI-first output mode. Prepends `<ai_context>` envelope with exact table dimensions, monospace code block guidelines, strict zero-wrap directives, and repository state (aliases: `--extra-details-for-ai`, `--ai-hints`, `--ai-format`). Automatically defaults to markdown format.
- `--description` / `--body`: Show commit message body description (default: false, only titles shown).
- `--explain-flags`: Outputs machine-readable JSON schema of all flags.
