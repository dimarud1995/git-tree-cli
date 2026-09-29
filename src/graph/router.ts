import { GraphNode } from './dag.js';
import { LinesMode } from '../git/types.js';

export interface LaneTransition {
  fromLane: number;
  toLane: number;
  kind: 'fork' | 'merge';
}

export interface NodeRow {
  node: GraphNode;
  lane: number;
  activeLanes: number[];
  forkToLanes: number[];
  existingForkLanes?: number[];
  mergeFromLanes: number[];
  portalForks?: number[];
  portalExits?: number[];
  portalEntries?: number[];
  hasIncomingPortal?: boolean;
}

export interface ConnectorRow {
  activeLanes: number[];
  transitions: LaneTransition[];
  portalLanes?: number[];
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

  const nodeIndex = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    nodeIndex.set(nodes[i].id, i);
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
      } else {
        nodeLane = tracks.length;
        tracks.push(null);
      }
    } else {
      // The node sits on the lowest matching lane
      nodeLane = matchingLanes[0];
      // Other matching lanes merge into this nodeLane
      for (let m = 1; m < matchingLanes.length; m++) {
        mergeFromLanes.push(matchingLanes[m]);
        tracks[matchingLanes[m]] = null;
      }
      // Trim trailing null tracks immediately
      while (tracks.length > 0 && tracks[tracks.length - 1] === null) {
        tracks.pop();
      }
    }

    // If node has an incoming portal (was targeted by portal from above) and matchingLanes was empty:
    // Try to extend the line upwards through empty space with a 1-node gap from previous commit.
    if (hasIncomingPortal && matchingLanes.length === 0) {
      const nodeItems: { itemIndex: number; row: NodeRow }[] = [];
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        if (it.kind === 'node') {
          nodeItems.push({ itemIndex: j, row: it.row });
        }
      }

      let obstacleItemIdx = -1;
      for (let j = items.length - 1; j >= 0; j--) {
        if (isLaneBlockedAtItem(items[j], nodeLane)) {
          obstacleItemIdx = j;
          break;
        }
      }

      let startNodeIdx = 0;
      if (obstacleItemIdx !== -1) {
        let obsNodeIdx = -1;
        for (let n = 0; n < nodeItems.length; n++) {
          if (nodeItems[n].itemIndex <= obstacleItemIdx) {
            obsNodeIdx = n;
          }
        }
        // Keep 1-node gap from previous commit/obstacle if it exists there
        startNodeIdx = obsNodeIdx + 2;
      }

      if (startNodeIdx < nodeItems.length) {
        // Extend nodeLane upwards to fill empty space!
        // Teleport from the beginning (startNodeIdx)
        const startItem = nodeItems[startNodeIdx];
        startItem.row.portalEntries = Array.from(
          new Set([...(startItem.row.portalEntries || []), nodeLane])
        );

        // Add nodeLane to activeLanes from startNodeIdx to current node
        for (let n = startNodeIdx; n < nodeItems.length; n++) {
          nodeItems[n].row.activeLanes = Array.from(
            new Set([...nodeItems[n].row.activeLanes, nodeLane])
          ).sort((a, b) => a - b);
        }

        // Add nodeLane to any connector rows in this range
        const firstItemIdx = startItem.itemIndex;
        for (let j = firstItemIdx; j < items.length; j++) {
          const item = items[j];
          if (item.kind === 'connector') {
            item.connector.activeLanes = Array.from(
              new Set([...item.connector.activeLanes, nodeLane])
            ).sort((a, b) => a - b);
          }
        }
      } else {
        // Not enough room for extended line with 1-node gap; fallback to connector row right above node
        const activeSnapshot: number[] = [];
        for (let l = 0; l < tracks.length; l++) {
          if (tracks[l] !== null) activeSnapshot.push(l);
        }
        items.push({
          kind: 'connector',
          connector: {
            activeLanes: activeSnapshot,
            transitions: [],
            portalLanes: [nodeLane],
          },
        });
      }
    }

    // 2. Active lanes snapshot before forks
    const activeLanes: number[] = [];
    for (let l = 0; l < tracks.length; l++) {
      if (tracks[l] !== null || l === nodeLane) {
        activeLanes.push(l);
      }
    }

    // 3. Process parents to assign future lane tracks
    const forkToLanes: number[] = [];
    const existingForkLanes: number[] = [];
    const portalForks: number[] = [];
    const portalExits: number[] = [];
    const parents = node.parents;

    if (parents.length === 0) {
      // Root commit terminates this lane
      tracks[nodeLane] = null;
    } else {
      // First parent continues on this lane if within threshold
      const p0 = parents[0];
      const dist0 = getTargetDistance(p0, i);

      if (dist0 <= PORTAL_DISTANCE_THRESHOLD) {
        tracks[nodeLane] = p0;
      } else {
        // Distant parent: enter portal and release lane!
        portalTargets.add(p0);
        portalExits.push(nodeLane);
        tracks[nodeLane] = null;
      }

      // Additional parents (e.g. merge commits)
      for (let p = 1; p < parents.length; p++) {
        const parentId = parents[p];
        const distP = getTargetDistance(parentId, i);

        if (distP <= PORTAL_DISTANCE_THRESHOLD) {
          const existingLane = tracks.findIndex((t) => t === parentId);
          if (existingLane !== -1) {
            forkToLanes.push(existingLane);
            existingForkLanes.push(existingLane);
          } else {
            const newLane = tracks.length;
            tracks.push(parentId);
            forkToLanes.push(newLane);
          }
        } else {
          // Portal fork!
          portalTargets.add(parentId);
          const portalLane = Math.max(nodeLane + 1, tracks.length);
          portalForks.push(portalLane);
        }
      }
    }

    // Add node item
    items.push({
      kind: 'node',
      row: {
        node,
        lane: nodeLane,
        activeLanes: Array.from(new Set([...activeLanes, ...forkToLanes])).sort((a, b) => a - b),
        forkToLanes,
        existingForkLanes,
        mergeFromLanes,
        portalForks,
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
          transitions.push({
            fromLane: nextMatchingLanes[m],
            toLane: targetLane,
            kind: 'merge',
          });
        }

        const connectorActiveLanes: number[] = [];
        for (let l = 0; l < tracks.length; l++) {
          if (tracks[l] !== null) {
            connectorActiveLanes.push(l);
          }
        }

        items.push({
          kind: 'connector',
          connector: {
            activeLanes: connectorActiveLanes,
            transitions,
          },
        });
      }
    }

    // Trim trailing null tracks
    while (tracks.length > 0 && tracks[tracks.length - 1] === null) {
      tracks.pop();
    }
  }

  return items;
}
