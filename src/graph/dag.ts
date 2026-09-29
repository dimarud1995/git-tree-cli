import {
  GitCommit,
  GitStash,
  GitStatusSummary,
  TreeCliOptions,
} from '../git/types.js';

export type NodeType = 'commit' | 'dirty' | 'stash';

export interface GraphNode {
  id: string;
  type: NodeType;
  commit?: GitCommit;
  stash?: GitStash;
  dirtySummary?: GitStatusSummary;
  parents: string[];
  children: string[];
  date: number;
}

/**
 * Builds an unified topological list of GraphNodes including virtual nodes
 * (Dirty worktree and Stashes) according to options.
 */
export function buildGraphNodes(
  commits: GitCommit[],
  status: GitStatusSummary,
  stashes: GitStash[],
  options: TreeCliOptions
): GraphNode[] {
  // If only-stashes is specified, return only stashes
  if (options.stashes === 'only') {
    return stashes.map((s) => ({
      id: s.ref,
      type: 'stash',
      stash: s,
      parents: [s.parentHash],
      children: [],
      date: s.date,
    }));
  }

  // If only-status is specified
  if (options.status === 'only') {
    if (!status.dirty) return [];
    return [
      {
        id: 'DIRTY',
        type: 'dirty',
        dirtySummary: status,
        parents: status.headHash ? [status.headHash] : [],
        children: [],
        date: Math.floor(Date.now() / 1000),
      },
    ];
  }

  const nodes: GraphNode[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // 1. Add dirty worktree if dirty and status is not excluded, and not only-merges
  if (options.status !== 'exclude' && options.merges !== 'only' && status.dirty) {
    const dirtyNode: GraphNode = {
      id: 'DIRTY',
      type: 'dirty',
      dirtySummary: status,
      parents: status.headHash ? [status.headHash] : [],
      children: [],
      date: Math.floor(Date.now() / 1000),
    };
    nodes.push(dirtyNode);
    nodeMap.set('DIRTY', dirtyNode);
  }

  // 2. Index all commits
  for (const c of commits) {
    const node: GraphNode = {
      id: c.hash,
      type: 'commit',
      commit: c,
      parents: [...c.parents],
      children: [],
      date: c.authorDate,
    };
    nodes.push(node);
    nodeMap.set(c.hash, node);
  }

  // 3. Stashes: insert stashes associated with their parent commits
  if (options.stashes !== 'exclude' && options.merges !== 'only' && stashes.length > 0) {
    // For each stash, insert it just before its parent in the list or near top
    for (const s of stashes) {
      const stashNode: GraphNode = {
        id: s.ref,
        type: 'stash',
        stash: s,
        parents: [s.parentHash],
        children: [],
        date: s.date,
      };

      // Find the position of its parent commit
      const parentIdx = nodes.findIndex((n) => n.id === s.parentHash);
      if (parentIdx !== -1) {
        // Insert right before parent commit
        nodes.splice(parentIdx, 0, stashNode);
      } else {
        // Or append if parent is outside the current window
        nodes.push(stashNode);
      }
      nodeMap.set(s.ref, stashNode);
    }
  }

  // 4. Calculate children relationships
  for (const node of nodes) {
    for (const pId of node.parents) {
      const parent = nodeMap.get(pId);
      if (parent && !parent.children.includes(node.id)) {
        parent.children.push(node.id);
      }
    }
  }

  return nodes;
}
