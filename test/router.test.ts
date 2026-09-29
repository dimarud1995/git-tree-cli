import { describe, it, expect } from 'vitest';
import { buildGraphNodes, GraphNode } from '../src/graph/dag.js';
import { routeGraph } from '../src/graph/router.js';
import { GitCommit, GitStatusSummary, TreeCliOptions } from '../src/git/types.js';

describe('Graph Router', () => {
  const defaultOptions: TreeCliOptions = {
    merges: 'include',
    stashes: 'include',
    status: 'include',
    layout: 'normal',
    format: 'terminal',
    date: 'relative',
    style: 'curved',
    color: 'auto',
    theme: 'tokyo',
    showAuthor: true,
    showDate: true,
    showHash: true,
    hashLen: 7,
  };

  const cleanStatus: GitStatusSummary = {
    dirty: false,
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
  };

  it('routes linear commit history on a single lane', () => {
    const commits: GitCommit[] = [
      {
        hash: 'c3',
        shortHash: 'c3',
        parents: ['c2'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Commit 3',
        refs: [{ type: 'head', name: 'main', fullName: 'HEAD -> refs/heads/main' }],
        isMerge: false,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'c2',
        shortHash: 'c2',
        parents: ['c1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Commit 2',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c1',
        shortHash: 'c1',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Initial commit',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes);

    const nodeItems = items.filter((item) => item.kind === 'node');
    expect(nodeItems).toHaveLength(3);
    for (const item of nodeItems) {
      if (item.kind === 'node') {
        expect(item.row.lane).toBe(0);
      }
    }
  });

  it('routes merge commits across multiple lanes', () => {
    const commits: GitCommit[] = [
      {
        hash: 'm1',
        shortHash: 'm1',
        parents: ['b2', 'f1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Merge branch feature',
        refs: [{ type: 'head', name: 'main', fullName: 'HEAD -> refs/heads/main' }],
        isMerge: true,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'f1',
        shortHash: 'f1',
        parents: ['b1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Feature commit',
        refs: [{ type: 'branch', name: 'feature', fullName: 'feature' }],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'b2',
        shortHash: 'b2',
        parents: ['b1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Main commit',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'b1',
        shortHash: 'b1',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Root commit',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes);

    const nodeItems = items.filter((item) => item.kind === 'node');
    expect(nodeItems).toHaveLength(4);

    // Merge commit m1 should fork to lane 1
    const m1Item = nodeItems[0];
    if (m1Item.kind === 'node') {
      expect(m1Item.row.lane).toBe(0);
      expect(m1Item.row.forkToLanes).toContain(1);
    }
  });

  it('does not reuse interior dead lanes when outer lanes remain active', () => {
    // Commit graph:
    // m1 (lane 0) forks to branch A (b1) and branch B (b2)
    // branch A terminates early
    // branch B continues
    // branch B then forks a new branch C (b3)
    // Branch C must get a new lane (lane 3) instead of reusing vacated lane 1
    const commits: GitCommit[] = [
      {
        hash: 'm1',
        shortHash: 'm1',
        parents: ['trunk1', 'b1', 'b2'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 500,
        subject: 'Merge commit',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'b1',
        shortHash: 'b1',
        parents: [], // Root commit: terminates lane 1!
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Branch A terminates',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
      {
        hash: 'b2',
        shortHash: 'b2',
        parents: ['b2_parent', 'b3'], // Forks a second parent (branch C)
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Branch B forks branch C',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes);

    const b2Item = items.find(
      (it) => it.kind === 'node' && it.row.node.id === 'b2'
    );
    expect(b2Item).toBeDefined();
    if (b2Item && b2Item.kind === 'node') {
      // b2 sits on lane 2
      expect(b2Item.row.lane).toBe(2);
      // b3 must be assigned lane 3 (or higher), NOT lane 1
      expect(b2Item.row.forkToLanes).not.toContain(1);
      expect(b2Item.row.forkToLanes).toContain(3);
    }
  });
});

