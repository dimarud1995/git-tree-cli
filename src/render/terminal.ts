import { GitCommit, GitRef, GitStatusSummary, TreeCliOptions } from '../git/types.js';
import { GraphRenderItem, NodeRow, ConnectorRow } from '../graph/router.js';
import { Colorizer } from './theme.js';
import { SYMBOLS, SymbolsDefinition } from './symbols.js';
import { formatDate } from '../utils/date.js';

const LANE_WIDTH = 3;

export class TerminalRenderer {
  private colorizer: Colorizer;
  private symbols: SymbolsDefinition;
  private options: TreeCliOptions;

  constructor(options: TreeCliOptions) {
    this.options = options;
    this.colorizer = new Colorizer(options.color, options.theme);
    this.symbols = SYMBOLS[options.style] || SYMBOLS.curved;
  }

  /**
   * Renders the full graph items to an array of output strings
   */
  public render(items: GraphRenderItem[]): string {
    const lines: string[] = [];

    for (const item of items) {
      if (item.kind === 'connector') {
        const connLine = this.renderConnectorRow(item.connector);
        if (connLine) lines.push(connLine);
      } else {
        const nodeLines = this.renderNodeRow(item.row);
        lines.push(...nodeLines);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render a connector line representing branch transitions (e.g. ╰──╯)
   */
  private renderConnectorRow(connector: ConnectorRow): string {
    const { activeLanes, transitions } = connector;
    if (transitions.length === 0) return '';

    const maxLane = Math.max(
      ...activeLanes,
      ...transitions.map((t) => Math.max(t.fromLane, t.toLane))
    );

    const charArray: { char: string; laneIndex: number }[] = [];
    const totalChars = (maxLane + 1) * LANE_WIDTH;

    for (let c = 0; c < totalChars; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    // Active vertical lanes
    for (const l of activeLanes) {
      const idx = l * LANE_WIDTH;
      charArray[idx] = { char: this.symbols.vLine, laneIndex: l };
    }

    // Transitions
    for (const tr of transitions) {
      const start = Math.min(tr.fromLane, tr.toLane);
      const end = Math.max(tr.fromLane, tr.toLane);
      const startIdx = start * LANE_WIDTH;
      const endIdx = end * LANE_WIDTH;

      // Start corner
      charArray[startIdx] = {
        char: this.symbols.roundBottomRight === '╯' ? '╰' : this.symbols.mergeLeft,
        laneIndex: start,
      };

      // Fill horizontal line between start and end
      for (let c = startIdx + 1; c < endIdx; c++) {
        const lane = Math.floor(c / LANE_WIDTH);
        if (charArray[c].char === this.symbols.vLine) {
          charArray[c] = { char: this.symbols.cross[0], laneIndex: lane };
        } else {
          charArray[c] = { char: this.symbols.hLine, laneIndex: start };
        }
      }

      // End corner
      charArray[endIdx] = {
        char: this.symbols.roundBottomRight,
        laneIndex: end,
      };
    }

    // Convert to colored string
    return this.charsToString(charArray).trimEnd();
  }

  /**
   * Render a graph node row (commit, dirty, or stash)
   */
  private renderNodeRow(row: NodeRow): string[] {
    const { node, lane, activeLanes, forkToLanes } = row;
    const maxLane = Math.max(lane, ...activeLanes, ...forkToLanes, 0);
    const totalChars = (maxLane + 1) * LANE_WIDTH;
    const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];

    for (let c = 0; c < totalChars; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    // Draw active vertical lanes
    for (const l of activeLanes) {
      if (l !== lane) {
        charArray[l * LANE_WIDTH] = { char: this.symbols.vLine, laneIndex: l };
      }
    }

    // Pick symbol and color for the node
    let symbolChar = this.symbols.commit;
    let customColor: string | undefined;

    if (node.type === 'dirty') {
      symbolChar = this.symbols.dirty;
      customColor = this.colorizer.theme.dirty;
    } else if (node.type === 'stash') {
      symbolChar = this.symbols.stash;
      customColor = this.colorizer.theme.stash;
    } else if (node.commit) {
      if (node.commit.isHead) {
        symbolChar = this.symbols.head;
        customColor = this.colorizer.theme.head;
      } else if (node.commit.isMerge) {
        symbolChar = this.symbols.merge;
        customColor = this.colorizer.theme.merge;
      } else if (node.commit.isRoot) {
        symbolChar = this.symbols.root;
      }
    }

    const nodeIdx = lane * LANE_WIDTH;
    charArray[nodeIdx] = { char: symbolChar, laneIndex: lane, customColor };

    // Handle forks (e.g. merge commits branching to secondary parents)
    if (forkToLanes.length > 0) {
      const maxForkLane = Math.max(...forkToLanes);
      const forkIdx = maxForkLane * LANE_WIDTH;

      for (let c = nodeIdx + 1; c < forkIdx; c++) {
        const l = Math.floor(c / LANE_WIDTH);
        if (charArray[c].char === this.symbols.vLine) {
          charArray[c] = { char: this.symbols.teeRight[0], laneIndex: l };
        } else {
          charArray[c] = { char: this.symbols.hLine, laneIndex: lane };
        }
      }

      charArray[forkIdx] = {
        char: this.symbols.roundTopRight,
        laneIndex: maxForkLane,
      };
    }

    const treePrefix = this.charsToString(charArray);
    const content = this.renderNodeContent(node, lane);

    const lines = [`${treePrefix} ${content}`];

    // Expanded layout secondary details
    if (this.options.layout === 'expanded' && node.commit) {
      const indent = this.renderVerticalIndent(activeLanes, maxLane);
      const dateStr = formatDate(node.commit.authorDate, this.options.date);
      const subInfo = this.colorizer.dim(
        `Author: ${node.commit.authorName} <${node.commit.authorEmail}> • ${dateStr}`
      );
      lines.push(`${indent}    ${subInfo}`);
    }

    return lines;
  }

  /**
   * Helper to render vertical continuation indentation for expanded cards
   */
  private renderVerticalIndent(activeLanes: number[], maxLane: number): string {
    const totalChars = (maxLane + 1) * LANE_WIDTH;
    const charArray: { char: string; laneIndex: number }[] = [];

    for (let c = 0; c < totalChars; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    for (const l of activeLanes) {
      charArray[l * LANE_WIDTH] = { char: this.symbols.vLine, laneIndex: l };
    }

    return this.charsToString(charArray);
  }

  /**
   * Render the text columns of a node (hash, refs, message, author, date)
   */
  private renderNodeContent(
    node: NodeRow['node'],
    lane: number
  ): string {
    const parts: string[] = [];

    if (node.type === 'dirty') {
      const summary = node.dirtySummary;
      const label = this.colorizer.color(
        this.colorizer.bold('[DIRTY WORKTREE]'),
        this.colorizer.theme.dirty
      );
      const stats: string[] = [];
      if (summary) {
        if (summary.stagedCount > 0) stats.push(`+${summary.stagedCount} staged`);
        if (summary.unstagedCount > 0) stats.push(`${summary.unstagedCount} unstaged`);
        if (summary.untrackedCount > 0) stats.push(`${summary.untrackedCount} untracked`);
      }
      const statText = stats.length > 0 ? this.colorizer.dim(`(${stats.join(', ')})`) : '';
      return `${label}  ${statText}`.trim();
    }

    if (node.type === 'stash') {
      const stash = node.stash!;
      const refLabel = this.colorizer.color(
        this.colorizer.bold(stash.ref),
        this.colorizer.theme.stash
      );
      const msg = this.colorizer.color(stash.message, this.colorizer.theme.subject);
      const dateStr = this.options.showDate
        ? this.colorizer.dim(`(${formatDate(stash.date, this.options.date)})`)
        : '';
      return `${refLabel}  ${msg}  ${dateStr}`.trim();
    }

    const commit = node.commit!;

    // 1. Commit Hash
    if (this.options.showHash) {
      const hashStr = this.colorizer.color(
        commit.shortHash,
        this.colorizer.theme.commitHash
      );
      parts.push(hashStr);
    }

    // 2. Ref Badges (branches, HEAD, tags, remotes)
    if (commit.refs.length > 0) {
      const badgeStr = this.renderRefs(commit.refs);
      if (badgeStr) parts.push(badgeStr);
    }

    // 3. Commit Subject / Message
    let subject = commit.subject;
    if (commit.isMerge) {
      subject = `${this.colorizer.color(this.symbols.merge, this.colorizer.theme.merge)} ${subject}`;
    }
    parts.push(this.colorizer.color(subject, this.colorizer.theme.subject));

    // 4. Date (if not compact)
    if (this.options.showDate && this.options.layout !== 'compact') {
      const dateStr = formatDate(commit.authorDate, this.options.date);
      parts.push(this.colorizer.dim(dateStr));
    }

    // 5. Author (if not compact)
    if (this.options.showAuthor && this.options.layout !== 'compact') {
      const authorStr = this.colorizer.color(
        commit.authorName,
        this.colorizer.theme.author
      );
      parts.push(authorStr);
    }

    return parts.join('  ');
  }

  /**
   * Render git references (HEAD, branches, tags, remotes) with clean badges
   */
  private renderRefs(refs: GitRef[]): string {
    const badges: string[] = [];

    for (const ref of refs) {
      if (ref.type === 'head') {
        const text = ref.name === 'HEAD' ? 'HEAD' : `HEAD -> ${ref.name}`;
        badges.push(
          this.colorizer.color(this.colorizer.bold(`(${text})`), this.colorizer.theme.head)
        );
      } else if (ref.type === 'tag') {
        const text = `${this.symbols.tag} ${ref.name}`;
        badges.push(
          this.colorizer.color(this.colorizer.bold(`[${text}]`), this.colorizer.theme.tag)
        );
      } else if (ref.type === 'remote') {
        const text = `${this.symbols.remote} ${ref.name}`;
        badges.push(this.colorizer.color(`(${text})`, this.colorizer.theme.remote));
      } else {
        // Local branch
        badges.push(
          this.colorizer.color(this.colorizer.bold(`(${ref.name})`), this.colorizer.theme.branch)
        );
      }
    }

    return badges.join(' ');
  }

  private charsToString(
    charArray: { char: string; laneIndex: number; customColor?: string }[]
  ): string {
    return charArray
      .map(({ char, laneIndex, customColor }) => {
        if (char === ' ') return char;
        if (customColor) return this.colorizer.color(char, customColor);
        return this.colorizer.colorLane(char, laneIndex);
      })
      .join('');
  }
}
