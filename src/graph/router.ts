import { GraphNode } from './dag.js';

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
}

export interface ConnectorRow {
  activeLanes: number[];
  transitions: LaneTransition[];
}

export type GraphRenderItem =
  | { kind: 'node'; row: NodeRow }
  | { kind: 'connector'; connector: ConnectorRow };

/**
 * Assigns lanes and generates render items (nodes and transition connector lines)
 */
export function routeGraph(nodes: GraphNode[]): GraphRenderItem[] {
  const items: GraphRenderItem[] = [];
  // tracks[i] is the target node id that lane i is waiting for
  let tracks: (string | null)[] = [];

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

    if (matchingLanes.length === 0) {
      // Always allocate a new lane at tracks.length so new branches never reuse
      // an interior vacated slot while other branches are active to its right
      nodeLane = tracks.length;
      tracks.push(null);
    } else {
      // The node sits on the lowest matching lane
      nodeLane = matchingLanes[0];
      // Other matching lanes merge into this nodeLane
      for (let m = 1; m < matchingLanes.length; m++) {
        mergeFromLanes.push(matchingLanes[m]);
        tracks[matchingLanes[m]] = null;
      }
      // Trim trailing null tracks immediately so new forks do not skip pruned outer lanes
      while (tracks.length > 0 && tracks[tracks.length - 1] === null) {
        tracks.pop();
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
    const parents = node.parents;

    if (parents.length === 0) {
      // Root commit terminates this lane
      tracks[nodeLane] = null;
    } else {
      // First parent continues on this lane
      tracks[nodeLane] = parents[0];

      // Additional parents (e.g. merge commits)
      for (let p = 1; p < parents.length; p++) {
        const parentId = parents[p];
        // Check if another lane is already waiting for this parent
        const existingLane = tracks.findIndex((t) => t === parentId);
        if (existingLane !== -1) {
          forkToLanes.push(existingLane);
          existingForkLanes.push(existingLane);
        } else {
          // Always allocate a new lane at tracks.length so parents never reuse
          // interior dead slots, keeping lanes contiguous and avoiding gaps
          const newLane = tracks.length;
          tracks.push(parentId);
          forkToLanes.push(newLane);
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
      },
    });

    // 4. If there are merge convergences or forks, we can emit a connector row if needed
    // Look ahead to check if the next node requires a lane shift/merge connector
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
