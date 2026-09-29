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

    const nodes = buildGraphNodes(commits, cleanStatus, [], { ...defaultOptions, lines: 'full' });
    const items = routeGraph(nodes, 'full');

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

  it('routes distant merge parents to portalForks instead of open tracks in portal mode', () => {
    const commits: GitCommit[] = [
      {
        hash: 'm1',
        shortHash: 'm1',
        parents: ['trunk1', 'external_branch'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 500,
        subject: 'Merge distant branch',
        refs: [],
        isMerge: true,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'trunk1',
        shortHash: 'trunk1',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Trunk commit',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes, 'portal');

    const m1Item = items.find((it) => it.kind === 'node' && it.row.node.id === 'm1');
    expect(m1Item).toBeDefined();
    if (m1Item && m1Item.kind === 'node') {
      // Merge commit is on lane 0
      expect(m1Item.row.lane).toBe(0);
      // External/distant parent is in portalForks, NOT kept open in forkToLanes
      expect(m1Item.row.portalForks).toBeDefined();
      expect(m1Item.row.portalForks!.length).toBeGreaterThan(0);
      expect(m1Item.row.forkToLanes).toHaveLength(0);
    }
  });

  it('routes dormant branches with distance > threshold into portalExits to prevent line spam', () => {
    // Commit c1 on branch A, parent is c5 (4 rows away > PORTAL_DISTANCE_THRESHOLD 3)
    const commits: GitCommit[] = [
      {
        hash: 'c1',
        shortHash: 'c1',
        parents: ['c5'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 500,
        subject: 'Branch A commit',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: true,
      },
      {
        hash: 'c2',
        shortHash: 'c2',
        parents: ['c3'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 400,
        subject: 'Branch B commit 1',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c3',
        shortHash: 'c3',
        parents: ['c4'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Branch B commit 2',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c4',
        shortHash: 'c4',
        parents: ['c5'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Branch B commit 3',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c5',
        shortHash: 'c5',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Common base commit',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes, 'portal');

    const c1Item = items.find((it) => it.kind === 'node' && it.row.node.id === 'c1');
    expect(c1Item).toBeDefined();
    if (c1Item && c1Item.kind === 'node') {
      // Because c5 is distance 4 (> 3), c1 enters a portal to not spam lines during c2, c3, c4
      expect(c1Item.row.portalExits).toContain(c1Item.row.lane);
    }
  });

  it('extends portal lines downwards through empty space to the bottom with 1-node gap before target commit', () => {
    // c0 is on lane 0, distant parent is c5 (distance 5 > 3)
    // c1, c2, c3, c4 are on lane 1
    // c5 is on lane 0
    const commits: GitCommit[] = [
      {
        hash: 'c0',
        shortHash: 'c0',
        parents: ['c5', 'c1'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 600,
        subject: 'Child merge commit on lane 0',
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
        authorDate: 500,
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
        authorDate: 400,
        subject: 'Branch commit 2',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c3',
        shortHash: 'c3',
        parents: ['c4'],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 300,
        subject: 'Branch commit 3',
        refs: [],
        isMerge: false,
        isRoot: false,
        isHead: false,
      },
      {
        hash: 'c4',
        shortHash: 'c4',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 200,
        subject: 'Branch commit 4',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
      {
        hash: 'c5',
        shortHash: 'c5',
        parents: [],
        authorName: 'Dev',
        authorEmail: 'dev@test.com',
        authorDate: 100,
        subject: 'Parent commit on lane 0',
        refs: [],
        isMerge: false,
        isRoot: true,
        isHead: false,
      },
    ];

    const nodes = buildGraphNodes(commits, cleanStatus, [], defaultOptions);
    const items = routeGraph(nodes, 'portal');

    const nodeItems = items.filter((it): it is { kind: 'node'; row: any } => it.kind === 'node');
    expect(nodeItems).toHaveLength(6);

    // c0: commit in the future on lane 0
    expect(nodeItems[0].row.lane).toBe(0);
    // Line continues downwards, so portalExits was moved to the bottom of the empty space
    expect(nodeItems[0].row.portalExits || []).not.toContain(0);

    // c1 and c2: extended line continues downwards with │ on lane 0
    expect(nodeItems[1].row.activeLanes).toContain(0);
    expect(nodeItems[2].row.activeLanes).toContain(0);

    // c3: bottom of extended line, exits with portal!
    expect(nodeItems[3].row.activeLanes).toContain(0);
    expect(nodeItems[3].row.portalExits).toContain(0);

    // c4: 1-node gap! lane 0 is completely empty
    expect(nodeItems[4].row.activeLanes).not.toContain(0);

    // c5: target commit sits on lane 0
    expect(nodeItems[5].row.lane).toBe(0);

    // Connector with short teleport line right above c5
    const connectorBeforeC5 = items.find(
      (it, idx) => it.kind === 'connector' && items[idx + 1]?.kind === 'node' && (items[idx + 1] as any).row.node.id === 'c5'
    );
    expect(connectorBeforeC5).toBeDefined();
    if (connectorBeforeC5 && connectorBeforeC5.kind === 'connector') {
      expect(connectorBeforeC5.connector.portalLanes).toContain(0);
    }
  });
});

