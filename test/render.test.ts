import { describe, it, expect } from 'vitest';
import { TerminalRenderer } from '../src/render/terminal.js';
import { renderMarkdown } from '../src/render/markdown.js';
import { renderJson } from '../src/render/json.js';
import { buildGraphNodes } from '../src/graph/dag.js';
import { routeGraph } from '../src/graph/router.js';
import { GitCommit, GitStatusSummary, TreeCliOptions } from '../src/git/types.js';

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

  it('renders terminal output with geometric symbols and ref badges', () => {
    const nodes = buildGraphNodes(commits, status, [], options);
    const items = routeGraph(nodes);
    const renderer = new TerminalRenderer(options);
    const output = renderer.render(items);

    expect(output).toContain('○'); // dirty symbol
    expect(output).toContain('[DIRTY WORKTREE]');
    expect(output).toContain('◉'); // HEAD symbol
    expect(output).toContain('a1b2c3d');
    expect(output).toContain('(HEAD -> main)');
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

    expect(data.version).toBe('1.0.0');
    expect(data.totalNodes).toBe(2); // dirty + commit
    expect(data.nodes[0].type).toBe('dirty');
    expect(data.nodes[1].type).toBe('commit');
    expect(data.nodes[1].commit.shortHash).toBe('a1b2c3d');
    expect(data.nodes[1].commit.refs).toHaveLength(2);
  });
});
