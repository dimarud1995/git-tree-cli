import { GraphNode } from './dag.js';
import { LinesMode } from '../git/types.js';

export interface LaneTransition {
  fromLane: number;
  toLane: number;
  kind: 'fork' | 'merge';
  branch?: string;
}

export interface NodeRow {
  node: GraphNode;
  lane: number;
  branch: string;
  laneBranches: Record<number, string>;
  activeLanes: number[];
  forkToLanes: number[];
  existingForkLanes?: number[];
  mergeFromLanes: number[];
  portalForks?: number[];
  portalForkBranches?: Record<number, string>;
  portalExits?: number[];
  portalEntries?: number[];
  hasIncomingPortal?: boolean;
}

export interface ConnectorRow {
  activeLanes: number[];
  laneBranches: Record<number, string>;
  transitions: LaneTransition[];
  portalLanes?: number[];
  portalBranches?: Record<number, string>;
}

export type GraphRenderItem =
  | { kind: 'node'; row: NodeRow }
  | { kind: 'connector'; connector: ConnectorRow };

export const PORTAL_DISTANCE_THRESHOLD = 3;

function isLaneBlockedAtItem(item: GraphRenderItem, targetLane: number): boolean {
  if (item.kind === 'node') {
    const row = item.row;
    if (row.lane === targetLane) return true;
    if (row.activeLanes.includes(targetLane)) return true;
    if (row.forkToLanes.includes(targetLane)) return true;
    if (row.portalForks?.includes(targetLane)) return true;
    if (row.portalEntries?.includes(targetLane)) return true;
    for (const fl of row.forkToLanes) {
      if (Math.min(row.lane, fl) <= targetLane && targetLane <= Math.max(row.lane, fl)) {
        return true;
      }
    }
    for (const pf of row.portalForks || []) {
      if (Math.min(row.lane, pf) <= targetLane && targetLane <= Math.max(row.lane, pf)) {
        return true;
      }
    }
    return false;
  } else {
    const conn = item.connector;
    if (conn.activeLanes.includes(targetLane)) return true;
    if (conn.portalLanes?.includes(targetLane)) return true;
    for (const tr of conn.transitions) {
      if (Math.min(tr.fromLane, tr.toLane) <= targetLane && targetLane <= Math.max(tr.fromLane, tr.toLane)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Assigns lanes and generates render items (nodes and transition connector lines).
 * Supports clean 'portal' mode (default) to prevent line spam, and 'full' mode.
 */
export function routeGraph(
  nodes: GraphNode[],
  mode: LinesMode = 'portal'
): GraphRenderItem[] {
  const items: GraphRenderItem[] = [];
  // tracks[i] is the target node id that lane i is waiting for
  let tracks: (string | null)[] = [];
  let trackBranches: (string | null)[] = [];

  const nodeIndex = new Map<string, number>();
  const nodeIndexMap = new Map<string, GraphNode>();
  for (let i = 0; i < nodes.length; i++) {
    nodeIndex.set(nodes[i].id, i);
    nodeIndexMap.set(nodes[i].id, nodes[i]);
  }

  const getTargetDistance = (targetId: string, currentIndex: number): number => {
    if (mode === 'full') return 1;
    const targetIdx = nodeIndex.get(targetId);
    if (targetIdx === undefined) return Infinity;
    return targetIdx - currentIndex;
  };

  const portalTargets = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodeId = node.id;
    const nodeBranch = node.branch || 'main';

    // 1. Identify which lanes were pointing to this node
    const matchingLanes: number[] = [];
    for (let lane = 0; lane < tracks.length; lane++) {
      if (tracks[lane] === nodeId) {
        matchingLanes.push(lane);
      }
    }

    let nodeLane: number;
    const mergeFromLanes: number[] = [];
    const hasIncomingPortal = portalTargets.has(nodeId);

    if (matchingLanes.length === 0) {
      // Find lowest free slot if no active lanes to its right, or tracks.length
      let reuseLane = -1;
      for (let l = 0; l < tracks.length; l++) {
        if (tracks[l] === null) {
          const hasActiveToRight = tracks.slice(l + 1).some((t) => t !== null);
          if (!hasActiveToRight) {
            reuseLane = l;
            break;
          }
        }
      }

      if (reuseLane !== -1) {
        nodeLane = reuseLane;
        trackBranches[nodeLane] = nodeBranch;
      } else {
        nodeLane = tracks.length;
        tracks.push(null);
        trackBranches.push(nodeBranch);
      }
    } else {
      // The node sits on the lowest matching lane
      nodeLane = matchingLanes[0];
      trackBranches[nodeLane] = nodeBranch;
      // Other matching lanes merge into this nodeLane
      for (let m = 1; m < matchingLanes.length; m++) {
        mergeFromLanes.push(matchingLanes[m]);
        tracks[matchingLanes[m]] = null;
        trackBranches[matchingLanes[m]] = null;
      }
      // Trim trailing null tracks immediately
      while (tracks.length > 0 && tracks[tracks.length - 1] === null) {
        tracks.pop();
        trackBranches.pop();
      }
    }

    // 1b. If node has an incoming portal (was targeted by portal from above) and matchingLanes was empty:
    // Display a short connector right above the node with portalLanes: [nodeLane]
    if (hasIncomingPortal && matchingLanes.length === 0) {
      const activeSnapshot: number[] = [];
      const activeBranches: Record<number, string> = {};
      for (let l = 0; l < tracks.length; l++) {
        if (tracks[l] !== null) {
          activeSnapshot.push(l);
          if (trackBranches[l]) activeBranches[l] = trackBranches[l]!;
        }
      }
      activeBranches[nodeLane] = nodeBranch;
      items.push({
        kind: 'connector',
        connector: {
          activeLanes: activeSnapshot,
          laneBranches: activeBranches,
          transitions: [],
          portalLanes: [nodeLane],
          portalBranches: { [nodeLane]: nodeBranch },
        },
      });
    }

    // 2. Active lanes snapshot before forks
    const activeLanes: number[] = [];
    const currentLaneBranches: Record<number, string> = {};
    for (let l = 0; l < tracks.length; l++) {
      if (tracks[l] !== null || l === nodeLane) {
        activeLanes.push(l);
        if (trackBranches[l]) {
          currentLaneBranches[l] = trackBranches[l]!;
        }
      }
    }
    currentLaneBranches[nodeLane] = nodeBranch;

    // 3. Process parents to assign future lane tracks
    const forkToLanes: number[] = [];
    const existingForkLanes: number[] = [];
    const portalForks: number[] = [];
    const portalForkBranches: Record<number, string> = {};
    const portalExits: number[] = [];
    const parents = node.parents;

    if (parents.length === 0) {
      // Root commit terminates this lane
      tracks[nodeLane] = null;
      trackBranches[nodeLane] = null;
    } else {
      // First parent continues on this lane if within threshold
      const p0 = parents[0];
      const dist0 = getTargetDistance(p0, i);

      if (dist0 <= PORTAL_DISTANCE_THRESHOLD) {
        tracks[nodeLane] = p0;
        trackBranches[nodeLane] = nodeBranch;
      } else {
        // Distant parent: enter portal and release lane!
        portalTargets.add(p0);
        portalExits.push(nodeLane);
        tracks[nodeLane] = null;
        trackBranches[nodeLane] = null;
      }

      // Additional parents (e.g. merge commits)
      for (let p = 1; p < parents.length; p++) {
        const parentId = parents[p];
        const distP = getTargetDistance(parentId, i);
        const parentNode = nodeIndexMap.get(parentId);
        const pBranch = node.mergeSourceBranch || parentNode?.branch || nodeBranch;

        if (distP <= PORTAL_DISTANCE_THRESHOLD) {
          const existingLane = tracks.findIndex((t) => t === parentId);
          if (existingLane !== -1) {
            forkToLanes.push(existingLane);
            existingForkLanes.push(existingLane);
            trackBranches[existingLane] = pBranch;
            currentLaneBranches[existingLane] = pBranch;
          } else {
            const newLane = tracks.length;
            tracks.push(parentId);
            trackBranches.push(pBranch);
            forkToLanes.push(newLane);
            currentLaneBranches[newLane] = pBranch;
          }
        } else {
          // Portal fork!
          portalTargets.add(parentId);
          const portalLane = Math.max(nodeLane + 1, tracks.length);
          portalForks.push(portalLane);
          portalForkBranches[portalLane] = pBranch;
          currentLaneBranches[portalLane] = pBranch;
        }
      }
    }

    // Add node item
    items.push({
      kind: 'node',
      row: {
        node,
        lane: nodeLane,
        branch: nodeBranch,
        laneBranches: currentLaneBranches,
        activeLanes: Array.from(new Set([...activeLanes, ...forkToLanes])).sort((a, b) => a - b),
        forkToLanes,
        existingForkLanes,
        mergeFromLanes,
        portalForks,
        portalForkBranches,
        portalExits,
        hasIncomingPortal,
      },
    });

    // 4. Look ahead to check if the next node requires a lane shift/merge connector
    if (i < nodes.length - 1) {
      const nextNode = nodes[i + 1];
      const nextMatchingLanes: number[] = [];
      for (let l = 0; l < tracks.length; l++) {
        if (tracks[l] === nextNode.id) {
          nextMatchingLanes.push(l);
        }
      }

      // If next node has multiple lanes converging into it, generate a merge connector row
      if (nextMatchingLanes.length > 1) {
        const targetLane = nextMatchingLanes[0];
        const transitions: LaneTransition[] = [];
        for (let m = 1; m < nextMatchingLanes.length; m++) {
          const fromL = nextMatchingLanes[m];
          transitions.push({
            fromLane: fromL,
            toLane: targetLane,
            kind: 'merge',
            branch: trackBranches[fromL] || nodeBranch,
          });
        }

        const connectorActiveLanes: number[] = [];
        const connectorLaneBranches: Record<number, string> = {};
        for (let l = 0; l < tracks.length; l++) {
          if (tracks[l] !== null) {
            connectorActiveLanes.push(l);
            if (trackBranches[l]) {
              connectorLaneBranches[l] = trackBranches[l]!;
            }
          }
        }

        items.push({
          kind: 'connector',
          connector: {
            activeLanes: connectorActiveLanes,
            laneBranches: connectorLaneBranches,
            transitions,
          },
        });
      }
    }

    // Trim trailing null tracks
    while (tracks.length > 0 && tracks[tracks.length - 1] === null) {
      tracks.pop();
      trackBranches.pop();
    }
  }

  // Post-processing pass for 'portal' mode:
  // Extend lines from portal exits DOWNWARDS through empty space to the portal at the bottom,
  // keeping a 1-node gap before any obstacle or target parent commit.
  if (mode === 'portal') {
    const nodeItems: { itemIndex: number; row: NodeRow }[] = [];
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      if (it.kind === 'node') {
        nodeItems.push({ itemIndex: j, row: it.row });
      }
    }

    for (let n = 0; n < nodeItems.length; n++) {
      const nodeItem = nodeItems[n];
      const row = nodeItem.row;
      if (!row.portalExits || row.portalExits.length === 0) continue;

      const exits = [...row.portalExits];
      for (const exitLane of exits) {
        const exitBranch = row.laneBranches?.[exitLane] || row.branch;

        // Parent commit ID that triggered this exit
        const p0 = row.node.parents[0];
        const targetNodeIdx = p0 ? nodeItems.findIndex((ni) => ni.row.node.id === p0) : -1;

        // Scan downwards to find where exitLane is blocked or reaches target
        let obstacleNodeIdx = -1;
        for (let k = n + 1; k < nodeItems.length; k++) {
          if (targetNodeIdx !== -1 && k === targetNodeIdx) {
            obstacleNodeIdx = k;
            break;
          }
          const prevItemIdx = nodeItems[k - 1].itemIndex;
          const currItemIdx = nodeItems[k].itemIndex;
          let blocked = false;
          for (let j = prevItemIdx + 1; j <= currItemIdx; j++) {
            if (isLaneBlockedAtItem(items[j], exitLane)) {
              blocked = true;
              break;
            }
          }
          if (blocked) {
            obstacleNodeIdx = k;
            break;
          }
        }

        // Determine how far down exitLane can extend
        let maxEndNodeIdx: number;
        if (obstacleNodeIdx !== -1) {
          // Keep 1-node gap before the obstacle/target commit
          maxEndNodeIdx = obstacleNodeIdx - 2;
        } else {
          // No obstacle found to the end of the node list
          maxEndNodeIdx = nodeItems.length - 1;
        }

        if (maxEndNodeIdx > n) {
          // Remove exitLane from current node's portalExits
          row.portalExits = row.portalExits.filter((l) => l !== exitLane);

          // Add exitLane to activeLanes on intermediate and end nodes
          for (let k = n + 1; k <= maxEndNodeIdx; k++) {
            nodeItems[k].row.activeLanes = Array.from(
              new Set([...nodeItems[k].row.activeLanes, exitLane])
            ).sort((a, b) => a - b);
            nodeItems[k].row.laneBranches[exitLane] = exitBranch;
          }

          // Add exitLane to activeLanes on any connector items in this range
          const firstItemIdx = nodeItem.itemIndex;
          const lastItemIdx = nodeItems[maxEndNodeIdx].itemIndex;
          for (let j = firstItemIdx + 1; j <= lastItemIdx; j++) {
            const item = items[j];
            if (item.kind === 'connector') {
              item.connector.activeLanes = Array.from(
                new Set([...item.connector.activeLanes, exitLane])
              ).sort((a, b) => a - b);
              item.connector.laneBranches[exitLane] = exitBranch;
            }
          }

          // Place portalExits on the final extended node
          const endRow = nodeItems[maxEndNodeIdx].row;
          endRow.portalExits = Array.from(
            new Set([...(endRow.portalExits || []), exitLane])
          );
        }
      }
    }
  }

  return items;
}
