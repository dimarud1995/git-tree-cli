---
name: git-tree-cli
description: Visualizes Git commit graphs, branch lifecycles, merges, stashes, and dirty states as a gorgeous geometric terminal tree. Use whenever asked to view or explain Git history, branches, recent merges, stashes, or commit graphs.
---

# `git-tree-cli` Skill for AI Agents

When the user asks you questions about their Git repository, history, branches, or stashes, use the `git-tree` CLI tool instead of raw `git log`. `git-tree` produces clean, monospace-aligned geometric trees with curved branch lines and clear metadata.

## Quick Decision & Intent Mapping

| User Query | Recommended Command |
| :--- | :--- |
| "Show me git tree / history" | `git-tree --format markdown` |
| "Show only my current branch commits" | `git-tree --current --format markdown` |
| "What was merged recently?" | `git-tree --only-merges -n 15 --format markdown` |
| "What do I have in my stash?" | `git-tree --only-stashes --format markdown` |
| "What changed in the working tree / status?" | `git-tree --only-status --format markdown` |
| "Show commits by [author] this week" | `git-tree --author "[author]" --since "1 week ago" --format markdown` |
| "Show branches `main` and `develop`" | `git-tree --branches main,develop --format markdown` |
| "Compact summary of last 20 commits" | `git-tree -n 20 --layout compact --format markdown` |
| "Detailed view of recent commits" | `git-tree -n 10 --layout expanded --format markdown` |

> **IMPORTANT FOR AI AGENTS**: When rendering output into a chat response or markdown document, ALWAYS pass `--format markdown`. This strips raw terminal ANSI color escape sequences and wraps the tree in a cleanly formatted fenced code block. When running in an interactive terminal for the user, use the default `--format terminal`.

---

## Geometric Symbol Legend

- `●`: Normal commit
- `◉`: Active HEAD commit
- `◆`: Merge commit
- `■`: Root / initial repository commit
- `▲`: Stashed work (`stash@{0}`)
- `○`: Dirty working tree state (unstaged/staged modifications)
- `⚑`: Tag annotation
- `╭─ ╰─ │`: Rounded smooth branch connection curves

---

## Complete Flag Matrix

### Scoping
- `-a, --all`: Include all local and remote branches (default: true).
- `-c, --current`: Show only commits reachable from current `HEAD`.
- `-b, --branches <b1,b2>`: Restrict to specific comma-separated branch names.
- `--no-remotes`: Omit remote tracking branches.
- `--no-tags`: Omit tag markers.

### Filtering
- `-n, --max-count <N>`: Maximum commits to output.
- `--since <date>`: Show commits more recent than `<date>` (e.g. `2 days ago`, `2026-01-01`).
- `--until <date>`: Show commits older than `<date>`.
- `--author <pattern>`: Filter commits by author name or email regex.
- `--grep <pattern>`: Filter commits by commit message regex.

### Entity Isolation Toggles
- `--merges` / `--no-merges` / `--only-merges`: Toggle merge commits.
- `--stashes` / `--no-stashes` / `--only-stashes`: Toggle stash entries.
- `--status` / `--no-status` / `--only-status`: Toggle working tree status.

### Presentation & Output
- `-f, --format <terminal|markdown|json>`: Output format. Use `markdown` for AI responses, `json` for machine processing.
- `-l, --layout <compact|normal|expanded>`: Density mode.
- `-d, --date <relative|iso|short>`: Date formatting (default: `relative`).
- `-s, --style <curved|straight|ascii>`: Line drawing style (default: `curved`).
- `-t, --theme <tokyo|catppuccin|nord|mono>`: Color theme for terminal output.
- `--no-author`: Omit author column.
- `--no-date`: Omit date column.
- `--no-hash`: Omit commit hash column.
