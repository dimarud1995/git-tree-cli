import { GitCommit, GitRef, GitStatusSummary, TreeCliOptions } from '../git/types.js';
import { GraphRenderItem, NodeRow, ConnectorRow } from '../graph/router.js';
import { Colorizer } from './theme.js';
import { SYMBOLS, SymbolsDefinition } from './symbols.js';
import { formatDate } from '../utils/date.js';
import { padVisible, wrapText, visibleWidth } from '../utils/wrap.js';

const LANE_WIDTH = 3;
const COLUMN_GAP = 2; // 2 spaces between columns

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
    if (items.length === 0) return '';

    const lines: string[] = [];

    // 1. Calculate maxLane across all items for Column 1
    let maxLane = 0;
    for (const item of items) {
      if (item.kind === 'node') {
        const row = item.row;
        maxLane = Math.max(maxLane, row.lane, ...row.activeLanes, ...row.forkToLanes);
      } else {
        const conn = item.connector;
        maxLane = Math.max(
          maxLane,
          ...conn.activeLanes,
          ...conn.transitions.map((t) => Math.max(t.fromLane, t.toLane))
        );
      }
    }

    const col1Width = Math.max((maxLane + 1) * LANE_WIDTH, 4);

    // 2. Calculate Column 2 (Commit ID) Width dynamically
    let maxIdLen = Math.max(this.options.hashLen || 7, 7);
    for (const item of items) {
      if (item.kind !== 'node') continue;
      const node = item.row.node;
      if (node.type === 'stash' && node.stash) {
        maxIdLen = Math.max(maxIdLen, visibleWidth(node.stash.ref));
      } else if (node.type === 'dirty') {
        maxIdLen = Math.max(maxIdLen, visibleWidth('[DIRTY]'));
      }
    }
    const col2Width = maxIdLen;

    // 2. Determine Author Column Visibility
    // If author filter is specified, show author banner at top and remove Column 4
    const hasAuthorFilter = Boolean(this.options.author && this.options.author.trim());
    const showAuthorCol = !hasAuthorFilter && this.options.showAuthor !== false;

    // Top Author Banner when author filter is active
    if (hasAuthorFilter) {
      let firstCommit: GitCommit | undefined;
      for (const it of items) {
        if (it.kind === 'node' && it.row.node.commit) {
          firstCommit = it.row.node.commit;
          break;
        }
      }
      const authorDisplayName = firstCommit ? `${firstCommit.authorName} <${firstCommit.authorEmail}>` : this.options.author!;
      const banner = this.colorizer.bold(
        this.colorizer.color(`Author: ${authorDisplayName}`, this.colorizer.theme.author)
      );
      lines.push(banner);
      lines.push('');
    }

    // 3. Calculate Author Column Width (Column 4)
    let col4Width = 0;
    if (showAuthorCol) {
      let maxAuthorLen = 12;
      for (const item of items) {
        if (item.kind !== 'node') continue;
        const node = item.row.node;
        let authorText = '';
        if (node.commit) {
          authorText = node.commit.authorName;
          if (this.options.showDate && this.options.layout !== 'compact') {
            const d = formatDate(node.commit.authorDate, this.options.date);
            if (d) authorText += `  ${d}`;
          }
        } else if (node.type === 'dirty') {
          authorText = 'Working Tree';
        } else if (node.type === 'stash') {
          authorText = 'Stash';
          if (this.options.showDate && node.stash) {
            const d = formatDate(node.stash.date, this.options.date);
            if (d) authorText += `  ${d}`;
          }
        }
        maxAuthorLen = Math.max(maxAuthorLen, visibleWidth(authorText));
      }
      col4Width = Math.min(Math.max(maxAuthorLen, 12), 30);
    }

    // 4. Calculate Dynamic Description Column Width (Column 3)
    const targetTotalWidth = this.options.width || 120;
    const gapsCount = showAuthorCol ? 3 : 2;
    const totalGaps = gapsCount * COLUMN_GAP;
    const col3Width = Math.max(25, targetTotalWidth - col1Width - col2Width - col4Width - totalGaps);

    const gapStr = ' '.repeat(COLUMN_GAP);

    // 5. Render Rows
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'connector') {
        const connLine = this.renderConnectorRow(item.connector, col1Width);
        if (connLine) {
          lines.push(connLine);
        }
      } else {
        const nodeLines = this.renderNodeTableMultiLine(
          item.row,
          maxLane,
          col1Width,
          col2Width,
          col3Width,
          col4Width,
          showAuthorCol,
          gapStr
        );
        lines.push(...nodeLines);

        // Add spacer line between commits (in normal/expanded layout)
        // First column continues active vertical branch lines, other columns are empty
        if (this.options.layout !== 'compact' && i < items.length - 1) {
          const spacerCol1 = this.renderGraphContinuation(item.row, col1Width).trimEnd();
          if (spacerCol1) {
            lines.push(spacerCol1);
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Render connector line (e.g. ╰──╯) padded to Column 1 width
   */
  private renderConnectorRow(connector: ConnectorRow, col1Width: number): string {
    const { activeLanes, transitions } = connector;
    if (transitions.length === 0) return '';

    const charArray: { char: string; laneIndex: number }[] = [];
    for (let c = 0; c < col1Width; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    // Active vertical lanes
    for (const l of activeLanes) {
      const idx = l * LANE_WIDTH;
      if (idx < col1Width) {
        charArray[idx] = { char: this.symbols.vLine, laneIndex: l };
      }
    }

    // Transitions
    for (const tr of transitions) {
      const start = Math.min(tr.fromLane, tr.toLane);
      const end = Math.max(tr.fromLane, tr.toLane);
      const startIdx = start * LANE_WIDTH;
      const endIdx = end * LANE_WIDTH;

      if (startIdx < col1Width) {
        charArray[startIdx] = {
          char: this.symbols.roundBottomRight === '╯' ? '╰' : this.symbols.mergeLeft,
          laneIndex: start,
        };
      }

      for (let c = startIdx + 1; c < endIdx && c < col1Width; c++) {
        const lane = Math.floor(c / LANE_WIDTH);
        if (charArray[c].char === this.symbols.vLine) {
          charArray[c] = { char: this.symbols.cross[0], laneIndex: lane };
        } else {
          charArray[c] = { char: this.symbols.hLine, laneIndex: start };
        }
      }

      if (endIdx < col1Width) {
        charArray[endIdx] = {
          char: this.symbols.roundBottomRight,
          laneIndex: end,
        };
      }
    }

    return this.charsToString(charArray).trimEnd();
  }

  /**
   * Render a node as a multi-line wrapped table row with 4 columns
   */
  private renderNodeTableMultiLine(
    row: NodeRow,
    maxLane: number,
    col1Width: number,
    col2Width: number,
    col3Width: number,
    col4Width: number,
    showAuthorCol: boolean,
    gapStr: string
  ): string[] {
    const { node, lane, activeLanes, forkToLanes } = row;

    // --- Column 1: Graph line 1 ---
    const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];
    for (let c = 0; c < col1Width; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    for (const l of activeLanes) {
      if (l !== lane && l * LANE_WIDTH < col1Width) {
        charArray[l * LANE_WIDTH] = { char: this.symbols.vLine, laneIndex: l };
      }
    }

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
    if (nodeIdx < col1Width) {
      charArray[nodeIdx] = { char: symbolChar, laneIndex: lane, customColor };
    }

    if (forkToLanes.length > 0) {
      const maxForkLane = Math.max(...forkToLanes);
      const forkIdx = maxForkLane * LANE_WIDTH;

      for (let c = nodeIdx + 1; c < forkIdx && c < col1Width; c++) {
        const l = Math.floor(c / LANE_WIDTH);
        if (charArray[c].char === this.symbols.vLine) {
          charArray[c] = { char: this.symbols.teeRight[0], laneIndex: l };
        } else {
          charArray[c] = { char: this.symbols.hLine, laneIndex: lane };
        }
      }

      if (forkIdx < col1Width) {
        charArray[forkIdx] = {
          char: this.symbols.roundTopRight,
          laneIndex: maxForkLane,
        };
      }
    }

    const col1FirstLine = padVisible(this.charsToString(charArray), col1Width);

    // --- Column 1: Continuation lines (for wrapped rows) ---
    const col1ContLine = padVisible(this.renderGraphContinuation(row, col1Width), col1Width);

    // --- Column 2: Commit ID ---
    let col2IdStr = '';
    if (node.type === 'commit' && node.commit) {
      col2IdStr = this.colorizer.color(node.commit.shortHash, this.colorizer.theme.commitHash);
    } else if (node.type === 'dirty') {
      col2IdStr = this.colorizer.color('[DIRTY]', this.colorizer.theme.dirty);
    } else if (node.type === 'stash' && node.stash) {
      col2IdStr = this.colorizer.color(node.stash.ref, this.colorizer.theme.stash);
    }
    const col2PaddedFirst = padVisible(col2IdStr, col2Width);
    const col2PaddedBlank = ' '.repeat(col2Width);

    // --- Column 3: Description ---
    let fullDescription = '';
    if (node.type === 'dirty') {
      const summary = node.dirtySummary;
      const stats: string[] = [];
      if (summary) {
        if (summary.stagedCount > 0) stats.push(`+${summary.stagedCount} staged`);
        if (summary.unstagedCount > 0) stats.push(`${summary.unstagedCount} unstaged`);
        if (summary.untrackedCount > 0) stats.push(`${summary.untrackedCount} untracked`);
      }
      fullDescription = stats.length > 0 ? stats.join(', ') : 'No uncommitted changes';
    } else if (node.type === 'stash' && node.stash) {
      fullDescription = node.stash.message;
    } else if (node.commit) {
      const parts: string[] = [];
      if (node.commit.refs.length > 0) {
        const badges = this.renderRefs(node.commit.refs);
        if (badges) parts.push(badges);
      }
      if (node.commit.isMerge) {
        parts.push(this.colorizer.color(this.symbols.merge, this.colorizer.theme.merge));
      }
      parts.push(this.colorizer.color(node.commit.subject, this.colorizer.theme.subject));
      fullDescription = parts.join(' ');
    }

    const descLines = wrapText(fullDescription, col3Width);

    // --- Column 4: Author (if enabled) ---
    let col4AuthorStr = '';
    if (showAuthorCol) {
      if (node.commit) {
        col4AuthorStr = this.colorizer.color(node.commit.authorName, this.colorizer.theme.author);
        if (this.options.showDate && this.options.layout !== 'compact') {
          const d = formatDate(node.commit.authorDate, this.options.date);
          if (d) {
            col4AuthorStr += '  ' + this.colorizer.dim(d);
          }
        }
      } else if (node.type === 'dirty') {
        col4AuthorStr = this.colorizer.dim('Working Tree');
      } else if (node.type === 'stash') {
        col4AuthorStr = this.colorizer.dim('Stash');
        if (this.options.showDate && node.stash) {
          const d = formatDate(node.stash.date, this.options.date);
          if (d) {
            col4AuthorStr += '  ' + this.colorizer.dim(d);
          }
        }
      }
    }

    const col4PaddedFirst = showAuthorCol ? padVisible(col4AuthorStr, col4Width) : '';
    const col4PaddedBlank = showAuthorCol ? ' '.repeat(col4Width) : '';

    // --- Build Multi-line Table Rows ---
    const resultLines: string[] = [];
    for (let k = 0; k < descLines.length; k++) {
      const c1 = k === 0 ? col1FirstLine : col1ContLine;
      const c2 = k === 0 ? col2PaddedFirst : col2PaddedBlank;
      const c3 = padVisible(descLines[k], col3Width);

      if (showAuthorCol) {
        const c4 = k === 0 ? col4PaddedFirst : col4PaddedBlank;
        resultLines.push(`${c1}${gapStr}${c2}${gapStr}${c3}${gapStr}${c4}`.trimEnd());
      } else {
        resultLines.push(`${c1}${gapStr}${c2}${gapStr}${c3}`.trimEnd());
      }
    }

    return resultLines;
  }

  /**
   * Helper to render vertical continuation lines for Column 1 when description wraps
   */
  private renderGraphContinuation(row: NodeRow, col1Width: number): string {
    const { node, lane, activeLanes, forkToLanes } = row;
    const charArray: { char: string; laneIndex: number }[] = [];

    for (let c = 0; c < col1Width; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    const allContinuingLanes = new Set([...activeLanes, ...forkToLanes]);
    if (node.commit?.isRoot) {
      allContinuingLanes.delete(lane);
    } else {
      allContinuingLanes.add(lane);
    }

    for (const l of allContinuingLanes) {
      const idx = l * LANE_WIDTH;
      if (idx < col1Width) {
        charArray[idx] = { char: this.symbols.vLine, laneIndex: l };
      }
    }

    return this.charsToString(charArray);
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
