import { GraphRenderItem } from '../graph/router.js';

export interface JsonGraphNode {
  id: string;
  type: 'commit' | 'dirty' | 'stash';
  lane: number;
  parents: string[];
  date?: number;
  commit?: {
    hash: string;
    shortHash: string;
    subject: string;
    authorName: string;
    authorEmail: string;
    isMerge: boolean;
    isRoot: boolean;
    isHead: boolean;
    refs: Array<{ type: string; name: string }>;
  };
  stash?: {
    ref: string;
    message: string;
    parentHash: string;
  };
  dirtySummary?: {
    stagedCount: number;
    unstagedCount: number;
    untrackedCount: number;
  };
}

export interface JsonGraphOutput {
  version: string;
  totalNodes: number;
  nodes: JsonGraphNode[];
}

export function renderJson(items: GraphRenderItem[]): string {
  const nodes: JsonGraphNode[] = [];

  for (const item of items) {
    if (item.kind !== 'node') continue;
    const { node, lane } = item.row;

    const jsonNode: JsonGraphNode = {
      id: node.id,
      type: node.type,
      lane,
      parents: node.parents,
      date: node.date,
    };

    if (node.commit) {
      jsonNode.commit = {
        hash: node.commit.hash,
        shortHash: node.commit.shortHash,
        subject: node.commit.subject,
        authorName: node.commit.authorName,
        authorEmail: node.commit.authorEmail,
        isMerge: node.commit.isMerge,
        isRoot: node.commit.isRoot,
        isHead: node.commit.isHead,
        refs: node.commit.refs.map((r) => ({ type: r.type, name: r.name })),
      };
    } else if (node.stash) {
      jsonNode.stash = {
        ref: node.stash.ref,
        message: node.stash.message,
        parentHash: node.stash.parentHash,
      };
    } else if (node.dirtySummary) {
      jsonNode.dirtySummary = {
        stagedCount: node.dirtySummary.stagedCount,
        unstagedCount: node.dirtySummary.unstagedCount,
        untrackedCount: node.dirtySummary.untrackedCount,
      };
    }

    nodes.push(jsonNode);
  }

  const output: JsonGraphOutput = {
    version: '1.0.0',
    totalNodes: nodes.length,
    nodes,
  };

  return JSON.stringify(output, null, 2);
}
