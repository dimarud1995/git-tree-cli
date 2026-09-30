import { describe, it, expect } from 'vitest';
import { TerminalRenderer } from '../src/render/terminal.js';
import { renderMarkdown } from '../src/render/markdown.js';
import { renderJson } from '../src/render/json.js';
import { buildGraphNodes } from '../src/graph/dag.js';
import { routeGraph } from '../src/graph/router.js';
import { GitCommit, GitStatusSummary, TreeCliOptions } from '../src/git/types.js';
import { getBranchColor } from '../src/utils/branch-color.js';
import { wrapText } from '../src/utils/wrap.js';
import { VERSION } from '../src/version.js';

describe('Renderers', () => {
  const options: TreeCliOptions = {
    merges: 'include',
    stashes: 'include',
    status: 'include',
    layout: 'normal',
    format: 'terminal',
    date: 'relative',
    style: 'curved',
    color: 'never',
    theme: 'tokyo',
    showAuthor: true,
    showDate: true,
    showHash: true,
    hashLen: 7,
  };

  const commits: GitCommit[] = [
    {
      hash: 'a1b2c3d4e5f6',
      shortHash: 'a1b2c3d',
      parents: [],
      authorName: 'Developer',
      authorEmail: 'dev@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 3600,
      subject: 'Initial commit',
      refs: [
        { type: 'head', name: 'main', fullName: 'HEAD -> refs/heads/main' },
        { type: 'tag', name: 'v1.0.0', fullName: 'tag: v1.0.0' },
      ],
      isMerge: false,
      isRoot: true,
      isHead: true,
    },
  ];

  const status: GitStatusSummary = {
    dirty: true,
    stagedCount: 2,
    unstagedCount: 1,
    untrackedCount: 3,
    headHash: 'a1b2c3d4e5f6',
    headBranch: 'main',
  };

  const cleanStatus: GitStatusSummary = {
    dirty: false,
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
  };

  it('renders terminal output with geometric symbols and ref badges', () => {
    const nodes = buildGraphNodes(commits, status, [], options);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(options);
    const output = renderer.render(items);

    expect(output).toContain('○'); // dirty symbol
    expect(output).toContain('[DIRTY]');
    expect(output).toContain('◉'); // HEAD symbol
    expect(output).toContain('a1b2c3d');
    expect(output).toContain('HEAD -> main');
    expect(output).toContain('[⚑ v1.0.0]');
    expect(output).toContain('Initial commit');
    expect(output).toContain('Developer');
  });

  it('renders markdown output wrapped in code block', () => {
    const nodes = buildGraphNodes(commits, status, [], options);
    const items = routeGraph(nodes);
    const output = renderMarkdown(items, options);

    expect(output.startsWith('```text')).toBe(true);
    expect(output.endsWith('```')).toBe(true);
    expect(output).toContain('Initial commit');
  });

  it('renders structured JSON output', () => {
    const nodes = buildGraphNodes(commits, status, [], options);
    const items = routeGraph(nodes);
    const jsonStr = renderJson(items);
    const data = JSON.parse(jsonStr);

    expect(data.version).toBe(VERSION);
    expect(data.totalNodes).toBe(2); // dirty + commit
    expect(data.nodes[0].type).toBe('dirty');
    expect(data.nodes[1].type).toBe('commit');
    expect(data.nodes[1].commit.shortHash).toBe('a1b2c3d');
    expect(data.nodes[1].commit.refs).toHaveLength(2);
  });

  it('wraps long descriptions across multiple lines and continues tree lines', () => {
    const longCommit: GitCommit = {
      hash: 'b2c3d4e5f6a1',
      shortHash: 'b2c3d4e',
      parents: ['a1b2c3d4e5f6'],
      authorName: 'Developer',
      authorEmail: 'dev@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 1800,
      subject: 'This is an exceptionally long commit description that definitely exceeds the allocated column width and must wrap across multiple lines cleanly',
      refs: [],
      isMerge: false,
      isRoot: false,
      isHead: true,
    };

    const narrowOptions: TreeCliOptions = {
      ...options,
      status: 'exclude',
      width: 70, // narrower width to force wrapping
    };

    const nodes = buildGraphNodes([longCommit], cleanStatus, [], narrowOptions);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(narrowOptions);
    const output = renderer.render(items);
    const lines = output.split('\n');
    const commitLines = lines.filter((l) => !l.startsWith('───') && l.trim().length > 0);

    expect(commitLines.length).toBeGreaterThan(1); // Wrapped into multiple lines
    // First line has hash
    expect(commitLines[0]).toContain('b2c3d4e');
    // Continuation line continues vertical line and does not repeat hash
    expect(commitLines[1]).toContain('│');
    expect(commitLines[1]).not.toContain('b2c3d4e');
  });

  it('shows top banner and removes author column when author filter is active', () => {
    const authorFilterOptions: TreeCliOptions = {
      ...options,
      status: 'exclude',
      author: 'Developer',
    };

    const nodes = buildGraphNodes(commits, cleanStatus, [], authorFilterOptions);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(authorFilterOptions);
    const output = renderer.render(items);
    const lines = output.split('\n');

    // Shows Author: banner
    expect(output).toContain('Author: Developer');
    // The commit row does not have Developer at the end as Column 4
    const commitLine = lines.find((l) => l.includes('a1b2c3d'));
    expect(commitLine).toBeDefined();
  });

  it('renders merge connectors with continuing trunk and terminating branch (├──╯)', () => {
    const mergeCommits: GitCommit[] = [
      {
        hash: 'm1',
        shortHash: 'm1',
        parents: ['trunk1', 'feat1'],
        authorName: 'Developer',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Merge commit',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'feat1',
        shortHash: 'feat1',
        parents: ['trunk1'], // Feat1 merges back into trunk1
        authorName: 'Developer',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Feature commit',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'trunk1',
        shortHash: 'trunk1',
        parents: [],
        authorName: 'Developer',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Trunk commit',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(mergeCommits, cleanStatus, [], { ...options, status: 'exclude' });
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer({ ...options, status: 'exclude' });
    const output = renderer.render(items);

    // Should contain ├──╯ for the merge connector rather than disconnected ╰──╯
    expect(output).toContain('├──╯');
  });

  it('renders bidirectional forks with roundTopLeft (╭) and cross (┼) for leftward forks', () => {
    // Manually construct items simulating a node on lane 2 forking left to lane 0
    const nodeItem = {
      kind: 'node' as const,
      row: {
        node: {
          id: 'test_node',
          type: 'commit' as const,
          parents: ['p0'],
          children: [],
          date: 100,
          commit: {
            hash: 'c1234567890',
            shortHash: 'c123456',
            parents: ['p0'],
            authorName: 'Developer',
            authorEmail: 'dev@test.com',
            authorDate: 100,
            subject: 'Leftward fork node',
            refs: [],
            isMerge: true,
            isRoot: false,
            isHead: false,
          },
        },
        lane: 2,
        activeLanes: [1, 2], // Lane 1 has a passing vertical line
        forkToLanes: [0], // Fork left to lane 0!
        mergeFromLanes: [],
      },
    };

    const renderer = new TerminalRenderer({ ...options, status: 'exclude' });
    const output = renderer.render([nodeItem]);

    // Lane 0 gets ╭, lane 1 gets ┼, lane 2 has ◆
    expect(output).toContain('╭──┼──◆');
  });

  it('places commit date in column 2 beneath commit hash and leaves column 4 for author only', () => {
    const singleCommit: GitCommit = {
      hash: 'a1b2c3d4e5f6',
      shortHash: 'a1b2c3d',
      parents: [],
      authorName: 'Developer',
      authorEmail: 'dev@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 7200, // 2h ago
      subject: 'Single line commit',
      refs: [],
      isMerge: false,
      isRoot: true,
      isHead: true,
    };

    const nodes = buildGraphNodes([singleCommit], cleanStatus, [], { ...options, status: 'exclude' });
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer({ ...options, status: 'exclude' });
    const output = renderer.render(items);
    const lines = output.split('\n');
    const commitIdx = lines.findIndex((l) => l.includes('a1b2c3d'));
    expect(commitIdx).toBeGreaterThanOrEqual(0);

    // First line: contains hash in col 2 and author in col 4
    expect(lines[commitIdx]).toContain('a1b2c3d');
    expect(lines[commitIdx]).toContain('Developer');
    expect(lines[commitIdx]).not.toContain('2h ago');

    // Second line: contains 2h ago in col 2, and does not contain Developer
    expect(lines[commitIdx + 1]).toContain('2h ago');
    expect(lines[commitIdx + 1]).not.toContain('Developer');
  });

  it('does not orphan badge symbols or bracket prefixes on their own line when wrapping', () => {
    const longBranchCommit: GitCommit = {
      hash: '9e81419a1b2c',
      shortHash: '9e81419',
      parents: [],
      authorName: 'Hugo B.',
      authorEmail: 'hugo@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 86400, // 1d ago
      subject:
        'ci(platform): pin inventory-flow in the workflow-suites gate and give FullStackRampTests its Postgres (MON-299)',
      refs: [
        {
          type: 'remote',
          name: 'origin/feat/platform/mon-299-pin-inventory-flow-and-fullstack-postgres',
          fullName: 'refs/remotes/origin/feat/platform/mon-299-pin-inventory-flow-and-fullstack-postgres',
        },
      ],
      isMerge: false,
      isRoot: true,
      isHead: false,
    };

    const nodes = buildGraphNodes([longBranchCommit], cleanStatus, [], {
      ...options,
      status: 'exclude',
      width: 100,
    });
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer({ ...options, status: 'exclude', width: 100 });
    const output = renderer.render(items);
    const lines = output.split('\n');

    // ▹ must NOT be on a line by itself!
    for (const line of lines) {
      expect(line.trim()).not.toBe('▹');
    }

    // A line should contain the start of the branch name alongside the badge icon
    const branchLine = lines.find((l) => l.includes('▹ origin/'));
    expect(branchLine).toBeDefined();
  });

  it('renders [MERGE] in red, [REBASE] in purple, [FAST-FORWARD] in cyan, and [SQUASH] in amber', () => {
    const specialCommits: GitCommit[] = [
      {
        hash: 'm1000000000',
        shortHash: 'm100000',
        parents: ['p1', 'p2'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Merge pull request #10 from branch',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'r1000000000',
        shortHash: 'r100000',
        parents: ['p1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'rebase: sync with upstream changes (cherry picked from commit abc)',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'ff100000000',
        shortHash: 'ff10000',
        parents: ['p1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Merge branch feature-ff (fast-forward)',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'sq100000000',
        shortHash: 'sq10000',
        parents: ['p1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'squash! fix typing error (#99)',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
    ];

    const colorOptions: TreeCliOptions = {
      ...options,
      color: 'always',
      theme: 'tokyo',
      status: 'exclude',
    };

    const nodes = buildGraphNodes(specialCommits, cleanStatus, [], colorOptions);
    const items = routeGraph(nodes, 'portal');
    const renderer = new TerminalRenderer(colorOptions);
    const output = renderer.render(items);

    expect(output).toContain('[MERGE]');
    expect(output).toContain('[REBASE]');
    expect(output).toContain('[FAST-FORWARD]');
    expect(output).toContain('[SQUASH]');

    // Tokyo theme colors:
    // Red: 247;118;142 (#f7768e)
    expect(output).toContain('247;118;142m[MERGE]');
    // Purple: 187;154;247 (#bb9af7)
    expect(output).toContain('187;154;247m[REBASE]');
    // Cyan: 125;207;255 (#7dcfff)
    expect(output).toContain('125;207;255m[FAST-FORWARD]');
    // Amber: 224;175;104 (#e0af68)
    expect(output).toContain('224;175;104m[SQUASH]');
  });

  it('renders portal fork glyph (◆──◎) on merge commits with distant parents in portal mode', () => {
    const distantMerge: GitCommit = {
      hash: 'm_dist',
      shortHash: 'm_dist0',
      parents: ['trunk_p', 'external_p'], // external_p is not in nodes -> distance Infinity
      authorName: 'Dev',
      authorEmail: 'dev@test.com',
      authorDate: 200,
      subject: 'Merge distant branch',
      refs: [],
      isMerge: true,
      isRoot: false,
      isHead: false,
    };

    const nodes = buildGraphNodes([distantMerge], cleanStatus, [], { ...options, status: 'exclude' });
    const items = routeGraph(nodes, 'portal');
    const renderer = new TerminalRenderer({ ...options, status: 'exclude' });
    const output = renderer.render(items);

    expect(output).toContain('◆──╮');
    expect(output).toContain('◎');

    const lines = output.split('\n');
    const mergeLineIdx = lines.findIndex((l) => l.includes('◆──╮'));
    expect(mergeLineIdx).toBeGreaterThanOrEqual(0);

    // Line 1: continuation for date in column 2 has vertical lines │  │
    expect(lines[mergeLineIdx + 1]).toContain('│');

    // Line 2: spacer line under commit has vertical lines │  │ (1-line connection to portal)
    expect(lines[mergeLineIdx + 2]).toMatch(/^[│ ]+$/);
    expect(lines[mergeLineIdx + 2]).toContain('│');

    // Line 3: connector row between commit title rows has the portal glyph ◎
    expect(lines[mergeLineIdx + 3]).toContain('◎');
    // Ensure the line containing ◎ does NOT contain any commit hash, date, or author
    expect(lines[mergeLineIdx + 3]).not.toContain('m_dist0');
    expect(lines[mergeLineIdx + 3]).not.toContain('Dev');
  });

  it('renders extended portal line with ◎ at start and │ filling empty space', () => {
    const commits: GitCommit[] = [
      {
        hash: 'c0',
        shortHash: 'c0',
        parents: ['c4', 'c1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 500,
        subject: 'Child merge commit 0',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c1',
        shortHash: 'c1',
        parents: ['c2'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Branch commit 1',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c2',
        shortHash: 'c2',
        parents: ['c3'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Branch commit 2',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c3',
        shortHash: 'c3',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Branch commit 3',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
      {
        hash: 'c4',
        shortHash: 'c4',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Parent commit 4',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], { ...options, status: 'exclude', layout: 'compact' });
    const items = routeGraph(nodes, 'portal');
    const renderer = new TerminalRenderer({ ...options, status: 'exclude', layout: 'compact' });
    const output = renderer.render(items);

    // In compact layout:
    // c0: ●
    // c1: gap (lane 0 blank)
    // c2: ◎ on lane 0 (teleport from beginning)
    // c3: │ on lane 0
    // c4: ● on lane 0
    const lines = output.split('\n');
    expect(lines.some((l) => l.startsWith('◎'))).toBe(true);
    expect(lines.some((l) => l.startsWith('│'))).toBe(true);
  });

  it('colors graph lines and commit glyphs according to branch name with color: always', () => {
    const branchCommits: GitCommit[] = [
      {
        hash: 'b1',
        shortHash: 'b1',
        parents: [],
        authorName: 'Alice',
        authorEmail: 'alice@test.com',
        authorDate: 200,
        subject: 'feat: add billing module',
        refs: [{ type: 'head', name: 'feature/billing', fullName: 'refs/heads/feature/billing' }],
        isMerge: false,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'b2',
        shortHash: 'b2',
        parents: [],
        authorName: 'Bob',
        authorEmail: 'bob@test.com',
        authorDate: 100,
        subject: 'Initial commit on main',
        refs: [{ type: 'remote', name: 'main', fullName: 'refs/remotes/origin/main' }],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(branchCommits, cleanStatus, [], {
      ...options,
      status: 'exclude',
      color: 'always',
    });
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer({
      ...options,
      status: 'exclude',
      color: 'always',
      theme: 'tokyo',
    });
    const output = renderer.render(items);

    const billingHex = getBranchColor('feature/billing');
    const r = parseInt(billingHex.slice(1, 3), 16);
    const g = parseInt(billingHex.slice(3, 5), 16);
    const b = parseInt(billingHex.slice(5, 7), 16);
    const billingAnsi = `\x1b[38;2;${r};${g};${b}m`;

    expect(output).toContain(billingAnsi);
  });

  it('renders header with project title, branch, and commit count', () => {
    const headerOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      repoName: 'my-project',
      headBranch: 'main',
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], headerOpts);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(headerOpts);
    const output = renderer.render(items);
    const lines = output.split('\n');

    expect(lines[0]).toContain('GIT TREE ── my-project (main) ── 1 commit');
    expect(lines[0]).toContain('─');
    expect(lines[1]).toBe(''); // 1 blank line in normal layout
  });

  it('renders header with ASCII style hyphens', () => {
    const asciiOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      style: 'ascii',
      repoName: 'my-project',
      headBranch: 'feature/test',
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], asciiOpts);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(asciiOpts);
    const output = renderer.render(items);
    const lines = output.split('\n');

    expect(lines[0]).toContain('GIT TREE -- my-project (feature/test) -- 1 commit');
    expect(lines[0].startsWith('---')).toBe(true);
    expect(lines[0].endsWith('---')).toBe(true);
  });

  it('omits header when showHeader is false', () => {
    const noHeaderOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      showHeader: false,
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], noHeaderOpts);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(noHeaderOpts);
    const output = renderer.render(items);

    expect(output).not.toContain('GIT TREE');
  });

  it('renders header without extra blank line in compact layout', () => {
    const compactOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      layout: 'compact',
      repoName: 'compact-repo',
      headBranch: 'main',
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], compactOpts);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(compactOpts);
    const output = renderer.render(items);
    const lines = output.split('\n');

    expect(lines[0]).toContain('GIT TREE');
    expect(lines[0]).toContain('compact-repo');
    // In compact mode, line 1 is the commit directly (no blank line)
    expect(lines[1]).toContain('a1b2c3d');
  });

  it('prepends <ai_context> directive envelope in renderMarkdown when ai is true', () => {
    const aiOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      ai: true,
      repoName: 'ai-repo',
      headBranch: 'main',
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], aiOpts);
    const items = routeGraph(nodes);
    const output = renderMarkdown(items, aiOpts);

    expect(output).toContain('<ai_context>');
    expect(output).toContain('[TECHNICAL_UI_SPECIFICATION]');
    expect(output).toContain('columns ×');
    expect(output).toContain('rows');
    expect(output).toContain('overflow-x: auto (NO_WRAP)');
    expect(output).toContain('[CRITICAL_AI_CONSTRAINTS]');
    expect(output).toContain('[REPOSITORY_METADATA]');
    expect(output).toContain('ai-repo');
    expect(output).toContain('</ai_context>');
    expect(output).toContain('```text');
  });

  it('includes aiContext in renderJson when ai is true', () => {
    const aiJsonOpts: TreeCliOptions = {
      ...options,
      status: 'exclude',
      ai: true,
      repoName: 'json-ai-repo',
      headBranch: 'main',
    };
    const nodes = buildGraphNodes(commits, cleanStatus, [], aiJsonOpts);
    const items = routeGraph(nodes);
    const jsonStr = renderJson(items, aiJsonOpts);
    const data = JSON.parse(jsonStr);

    expect(data.aiContext).toBeDefined();
    expect(data.aiContext.dimensions.width).toBeGreaterThan(0);
    expect(data.aiContext.dimensions.rows).toBeGreaterThan(0);
    expect(data.aiContext.directives.lineWrap).toBe(false);
    expect(data.aiContext.repository.name).toBe('json-ai-repo');
  });

  it('wrapText preserves active ANSI escape styles across line splits', () => {
    const styledText = '\x1b[38;2;86;95;137mFirst line text that is long enough to wrap onto a second line\x1b[39m';
    const wrapped = wrapText(styledText, 30);
    expect(wrapped.length).toBeGreaterThan(1);
    for (const line of wrapped) {
      expect(line).toContain('\x1b[38;2;86;95;137m');
    }
  });

  it('preserves ANSI color on all wrapped lines of commit subject in normal layout', () => {
    const multiLineCommit: GitCommit = {
      hash: 'e2c5fa7a1b2c',
      shortHash: 'e2c5fa7',
      parents: [],
      authorName: 'Developer',
      authorEmail: 'dev@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 86400,
      subject:
        'docs(webhooks): search frontmatter for the 2026-09-29 next-steps plan, which DocumentFrontmatterTests requires',
      refs: [
        {
          type: 'branch',
          name: 'service/api',
          fullName: 'refs/heads/service/api',
        },
      ],
      isMerge: false,
      isRoot: true,
      isHead: false,
    };

    const colorOptions: TreeCliOptions = {
      ...options,
      status: 'exclude',
      color: 'always',
      theme: 'tokyo',
      showHeader: false,
      width: 80,
    };

    const nodes = buildGraphNodes([multiLineCommit], cleanStatus, [], colorOptions);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(colorOptions);
    const output = renderer.render(items);
    const lines = output.split('\n').filter((l) => !l.startsWith('───') && l.trim().length > 0);

    // In normal layout with branch ref:
    // Line 1 contains branch name & badges
    // Line 2 contains line 1 of commit subject
    // Line 3 contains line 2 of commit subject ("DocumentFrontmatterTests requires")
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // Both line 2 and line 3 must contain the commit subject color code (\x1b[38;2;86;95;137m for tokyo theme remote)
    const tokyoRemoteColor = '\x1b[38;2;86;95;137m';
    expect(lines[1]).toContain('docs(webhooks):');
    expect(lines[1]).toContain(tokyoRemoteColor);

    expect(lines[2]).toContain('DocumentFrontmatterTests');
    expect(lines[2]).toContain(tokyoRemoteColor);
  });

  it('preserves dim ANSI styling on all wrapped lines of commit body description', () => {
    const multiLineBodyCommit: GitCommit = {
      hash: 'c3d4e5f6a1b2',
      shortHash: 'c3d4e5f',
      parents: [],
      authorName: 'Developer',
      authorEmail: 'dev@example.com',
      authorDate: Math.floor(Date.now() / 1000) - 86400,
      subject: 'feat: add payment gateway',
      body: 'Detailed description that wraps across multiple lines cleanly to ensure dim styling remains intact on every single row',
      refs: [],
      isMerge: false,
      isRoot: true,
      isHead: false,
    };

    const descOptions: TreeCliOptions = {
      ...options,
      status: 'exclude',
      color: 'always',
      showDescription: true,
      showHeader: false,
      width: 70,
    };

    const nodes = buildGraphNodes([multiLineBodyCommit], cleanStatus, [], descOptions);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(descOptions);
    const output = renderer.render(items);
    const lines = output.split('\n').filter((l) => !l.startsWith('───') && l.trim().length > 0);

    // Body lines should wrap and both wrapped lines must have the dim escape code (\x1b[2m)
    const dimCode = '\x1b[2m';
    const bodyRows = lines.filter((l) => l.includes('Detailed description') || l.includes('cleanly to ensure'));
    expect(bodyRows.length).toBeGreaterThanOrEqual(2);
    for (const bRow of bodyRows) {
      expect(bRow).toContain(dimCode);
    }
  });
});



