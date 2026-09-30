import { GitCommit, GitRef, GitStatusSummary, TreeCliOptions } from '../git/types.js';
import { GraphRenderItem, NodeRow, ConnectorRow } from '../graph/router.js';
import { Colorizer } from './theme.js';
import { SYMBOLS, SymbolsDefinition, getBoxChar } from './symbols.js';
import { formatDate } from '../utils/date.js';
import { padVisible, wrapText, visibleWidth } from '../utils/wrap.js';
import { resolveColumns, ResolvedColumns } from '../utils/columns.js';
import { getAuthorColor } from '../utils/author-color.js';

const LANE_WIDTH = 3;
const COLUMN_GAP = 2; // 2 spaces between columns

export class TerminalRenderer {
  private colorizer: Colorizer;
  private symbols: SymbolsDefinition;
  private options: TreeCliOptions;
  private columns: ResolvedColumns;

  constructor(options: TreeCliOptions) {
    this.options = options;
    this.columns = resolveColumns(options);
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
        maxLane = Math.max(
          maxLane,
          row.lane,
          ...row.activeLanes,
          ...row.forkToLanes,
          ...(row.portalForks || []),
          ...(row.portalEntries || [])
        );
      } else {
        const conn = item.connector;
        maxLane = Math.max(
          maxLane,
          ...conn.activeLanes,
          ...(conn.portalLanes || []),
          ...conn.transitions.map((t) => Math.max(t.fromLane, t.toLane))
        );
      }
    }

    let col1Width = 0;
    if (this.columns.showGraph) {
      col1Width = Math.max((maxLane + 1) * LANE_WIDTH, 4);
    }

    // 2. Calculate Column 2 (Commit ID & Date) Width dynamically
    let col2Width = 0;
    if (this.columns.showHash || this.columns.showDate) {
      let maxCol2Len = this.columns.showHash ? Math.max(this.options.hashLen || 7, 7) : 0;
      for (const item of items) {
        if (item.kind !== 'node') continue;
        const node = item.row.node;
        if (this.columns.showHash) {
          if (node.type === 'stash' && node.stash) {
            maxCol2Len = Math.max(maxCol2Len, visibleWidth(node.stash.ref));
          } else if (node.type === 'dirty') {
            maxCol2Len = Math.max(maxCol2Len, visibleWidth('[DIRTY]'));
          } else if (node.commit) {
            maxCol2Len = Math.max(maxCol2Len, visibleWidth(node.commit.shortHash));
          }
        }
        if (this.columns.showDate && this.options.layout !== 'compact') {
          if (node.type === 'stash' && node.stash) {
            const d = formatDate(node.stash.date, this.options.date);
            if (d) maxCol2Len = Math.max(maxCol2Len, visibleWidth(d));
          } else if (node.commit) {
            const d = formatDate(node.commit.authorDate, this.options.date);
            if (d) maxCol2Len = Math.max(maxCol2Len, visibleWidth(d));
          }
        }
      }
      col2Width = Math.max(maxCol2Len, 1);
    }

    // 3. Determine Author Column Visibility
    const authorFilters = [
      ...(this.options.author ? this.options.author.split(',') : []),
      ...(this.options.email ? this.options.email.split(',') : []),
    ].map((s) => s.trim()).filter(Boolean);

    const hasAuthorFilter = authorFilters.length > 0;
    const isSingleAuthor = authorFilters.length === 1;

    // If single author filter, hide Column 4 by default (since all commits belong to that author).
    // If multiple author filters, KEEP Column 4 visible so the user can distinguish between them!
    const showAuthorCol = (!isSingleAuthor || this.options.columns !== undefined) && this.columns.showAuthor;

    // 4. Calculate Author Column Width (Column 4)
    let col4Width = 0;
    if (showAuthorCol) {
      let maxAuthorLen = 8;
      for (const item of items) {
        if (item.kind !== 'node') continue;
        const node = item.row.node;
        let authorText = '';
        if (node.commit) {
          authorText = node.commit.authorName;
        } else if (node.type === 'dirty') {
          authorText = 'Working Tree';
        } else if (node.type === 'stash') {
          authorText = 'Stash';
        }
        maxAuthorLen = Math.max(maxAuthorLen, visibleWidth(authorText));
      }
      col4Width = Math.min(Math.max(maxAuthorLen, 8), 24);
    }

    // 5. Calculate Dynamic Description Column Width (Column 3)
    const showCol3 = this.columns.showTitle || this.columns.showDescription;
    const targetTotalWidth = this.options.width || 120;
    const activeCols = [
      this.columns.showGraph,
      (this.columns.showHash || this.columns.showDate),
      showCol3,
      showAuthorCol,
    ].filter(Boolean).length;
    const totalGaps = Math.max(0, activeCols - 1) * COLUMN_GAP;
    const otherWidths = col1Width + col2Width + col4Width;
    const col3Width = showCol3 ? Math.max(20, targetTotalWidth - otherWidths - totalGaps) : 0;

    const gapStr = ' '.repeat(COLUMN_GAP);

    // Top Repository Header
    const showHeader = this.options.showHeader !== false;
    if (showHeader) {
      const headerLine = this.renderHeader(items, targetTotalWidth);
      lines.push(headerLine);
      if (this.options.layout !== 'compact') {
        lines.push('');
      }
    }

    // Top Author Banner when author filter is active
    if (hasAuthorFilter) {
      let bannerText = '';
      let authorColor = this.colorizer.theme.author;

      if (isSingleAuthor) {
        let firstCommit: GitCommit | undefined;
        for (const it of items) {
          if (it.kind === 'node' && it.row.node.commit) {
            firstCommit = it.row.node.commit;
            break;
          }
        }
        const authorDisplayName = firstCommit
          ? `${firstCommit.authorName} <${firstCommit.authorEmail}>`
          : authorFilters[0];
        authorColor = firstCommit
          ? getAuthorColor(firstCommit.authorName)
          : this.colorizer.theme.author;
        bannerText = `Author: ${authorDisplayName}`;
      } else {
        bannerText = `Authors: ${authorFilters.join(', ')}`;
      }

      const banner = this.colorizer.bold(
        this.colorizer.color(bannerText, authorColor)
      );
      lines.push(banner);
      lines.push('');
    }

    // 6. Render Rows
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'connector') {
        if (this.columns.showGraph) {
          const connLine = this.renderConnectorRow(item.connector, col1Width);
          if (connLine) {
            lines.push(connLine);
          }
        }
      } else {
        const nodeLines = this.renderNodeTableMultiLine(
          item.row,
          col1Width,
          col2Width,
          col3Width,
          col4Width,
          showAuthorCol,
          gapStr
        );
        lines.push(...nodeLines);

        // Add spacer line between commits (in normal/expanded layout)
        if (this.options.layout !== 'compact' && i < items.length - 1) {
          if (this.columns.showGraph) {
            const spacerCol1 = this.renderGraphSpacer(item.row, col1Width).trimEnd();
            if (spacerCol1) {
              lines.push(spacerCol1);
            }
          } else {
            lines.push('');
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Render connector line (e.g. ├──┴──╯) padded to Column 1 width
   */
  private renderConnectorRow(connector: ConnectorRow, col1Width: number): string {
    const { activeLanes, transitions, portalLanes = [] } = connector;
    if (transitions.length === 0 && portalLanes.length === 0) return '';

    const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];
    for (let c = 0; c < col1Width; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    const fromLanes = new Set(transitions.map((t) => t.fromLane));
    const toLanes = new Set(transitions.map((t) => t.toLane));

    for (let c = 0; c < col1Width; c++) {
      const isLaneCol = c % LANE_WIDTH === 0;
      const lane = Math.floor(c / LANE_WIDTH);

      let up = false;
      let down = false;
      let left = false;
      let right = false;
      let charLaneIndex = lane;

      if (isLaneCol) {
        if (activeLanes.includes(lane)) {
          up = true;
          // Continues downwards if it's not terminating as a fromLane, OR if it's a toLane
          if (!fromLanes.has(lane) || toLanes.has(lane)) {
            down = true;
          }
        } else if (toLanes.has(lane)) {
          down = true;
        }
      }

      // Check horizontal spans of transitions
      for (const tr of transitions) {
        const start = Math.min(tr.fromLane, tr.toLane);
        const end = Math.max(tr.fromLane, tr.toLane);
        const spanStart = start * LANE_WIDTH;
        const spanEnd = end * LANE_WIDTH;

        if (c > spanStart && c <= spanEnd) {
          left = true;
        }
        if (c >= spanStart && c < spanEnd) {
          right = true;
        }
        if (c >= spanStart && c <= spanEnd) {
          if (!isLaneCol || fromLanes.has(lane)) {
            charLaneIndex = tr.fromLane;
          }
        }
      }

      const char = getBoxChar(up, right, down, left, this.symbols);
      if (char !== ' ') {
        const branch = connector.laneBranches?.[charLaneIndex];
        const customColor = this.colorizer.branchColor(branch);
        charArray[c] = { char, laneIndex: charLaneIndex, customColor };
      }
    }

    // Render portal glyphs on portalLanes
    for (const pl of portalLanes) {
      const idx = pl * LANE_WIDTH;
      if (idx < col1Width) {
        const branch = connector.portalBranches?.[pl] || connector.laneBranches?.[pl];
        const customColor = this.colorizer.branchColor(branch);
        charArray[idx] = { char: this.symbols.portal, laneIndex: pl, customColor };
      }
    }

    return this.charsToString(charArray).trimEnd();
  }

  /**
   * Render a node as a multi-line wrapped table row with 4 columns
   */
  private renderNodeTableMultiLine(
    row: NodeRow,
    col1Width: number,
    col2Width: number,
    col3Width: number,
    col4Width: number,
    showAuthorCol: boolean,
    gapStr: string
  ): string[] {
    const { node, lane, activeLanes, forkToLanes } = row;

    let col1FirstLine = '';
    let col1ContLine = '';

    if (this.columns.showGraph) {
      // --- Column 1: Graph line 1 ---
      const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];
      for (let c = 0; c < col1Width; c++) {
        charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
      }

      for (const l of activeLanes) {
        if (l !== lane && l * LANE_WIDTH < col1Width) {
          const branch = row.laneBranches?.[l];
          const customColor = this.colorizer.branchColor(branch);
          charArray[l * LANE_WIDTH] = { char: this.symbols.vLine, laneIndex: l, customColor };
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
        } else if (node.commit.isRoot) {
          symbolChar = this.symbols.root;
        }
      }

      const nodeIdx = lane * LANE_WIDTH;
      if (nodeIdx < col1Width) {
        const symbolColor = customColor || this.colorizer.branchColor(row.branch);
        charArray[nodeIdx] = { char: symbolChar, laneIndex: lane, customColor: symbolColor };
      }

      // Render forks (both rightward and leftward)
      if (forkToLanes.length > 0) {
        for (const forkLane of forkToLanes) {
          const startLane = Math.min(lane, forkLane);
          const endLane = Math.max(lane, forkLane);
          const startIdx = startLane * LANE_WIDTH;
          const endIdx = endLane * LANE_WIDTH;

          const forkBranch = row.laneBranches?.[forkLane] || row.branch;
          const forkColor = this.colorizer.branchColor(forkBranch);

          // Draw horizontal line between commit node and fork target
          for (let c = startIdx + 1; c < endIdx && c < col1Width; c++) {
            const l = Math.floor(c / LANE_WIDTH);
            const isLaneCol = c % LANE_WIDTH === 0;

            if (isLaneCol && charArray[c].char === this.symbols.vLine) {
              const crossBranch = row.laneBranches?.[l];
              const crossColor = this.colorizer.branchColor(crossBranch);
              charArray[c] = { char: this.symbols.cross[0], laneIndex: l, customColor: crossColor };
            } else if (charArray[c].char === ' ') {
              charArray[c] = { char: this.symbols.hLine, laneIndex: forkLane, customColor: forkColor };
            }
          }

          // Draw the corner or junction at the fork target
          const forkIdx = forkLane * LANE_WIDTH;
          if (forkIdx < col1Width) {
            const isExistingLane = (row.existingForkLanes || []).includes(forkLane);
            let cornerChar: string;
            if (forkLane > lane) {
              // Coming from the left, turning down
              if (isExistingLane) {
                cornerChar = this.symbols.teeLeft;
              } else {
                const hasFurtherRight = forkToLanes.some((fl) => fl > forkLane);
                cornerChar = hasFurtherRight ? this.symbols.teeDown : this.symbols.roundTopRight;
              }
            } else {
              // Coming from the right, turning down
              if (isExistingLane) {
                cornerChar = this.symbols.teeRight;
              } else {
                const hasFurtherLeft = forkToLanes.some((fl) => fl < forkLane);
                cornerChar = hasFurtherLeft ? this.symbols.teeDown : this.symbols.roundTopLeft;
              }
            }
            charArray[forkIdx] = {
              char: cornerChar,
              laneIndex: forkLane,
              customColor: forkColor,
            };
          }
        }
      }



      col1FirstLine = padVisible(this.charsToString(charArray), col1Width);
      col1ContLine = padVisible(this.renderGraphContinuation(row, col1Width), col1Width);
    }

    // --- Column 2: Commit ID & Date on second row ---
    let col2IdStr = '';
    if (this.columns.showHash) {
      if (node.type === 'commit' && node.commit) {
        col2IdStr = this.colorizer.color(node.commit.shortHash, this.colorizer.theme.commitHash);
      } else if (node.type === 'dirty') {
        col2IdStr = this.colorizer.color('[DIRTY]', this.colorizer.theme.dirty);
      } else if (node.type === 'stash' && node.stash) {
        col2IdStr = this.colorizer.color(node.stash.ref, this.colorizer.theme.stash);
      }
    }

    let dateText = '';
    if (this.columns.showDate && this.options.layout !== 'compact') {
      if (node.commit) {
        dateText = formatDate(node.commit.authorDate, this.options.date);
      } else if (node.type === 'stash' && node.stash) {
        dateText = formatDate(node.stash.date, this.options.date);
      }
    }
    const col2DateStr = dateText
      ? this.colorizer.color(dateText, this.colorizer.theme.date)
      : '';

    const col2PaddedBlank = ' '.repeat(col2Width);

    // --- Column 3: Title & Description ---
    const showCol3 = this.columns.showTitle || this.columns.showDescription;
    const descLines: string[] = [];

    if (showCol3) {
      if (node.type === 'dirty') {
        const summary = node.dirtySummary;
        const stats: string[] = [];
        if (summary) {
          if (summary.stagedCount > 0) stats.push(`+${summary.stagedCount} staged`);
          if (summary.unstagedCount > 0) stats.push(`${summary.unstagedCount} unstaged`);
          if (summary.untrackedCount > 0) stats.push(`${summary.untrackedCount} untracked`);
        }
        const fullDescription = stats.length > 0 ? stats.join(', ') : 'No uncommitted changes';
        descLines.push(...wrapText(fullDescription, col3Width));
      } else if (node.type === 'stash' && node.stash) {
        descLines.push(...wrapText(node.stash.message, col3Width));
      } else if (node.commit) {
        if (this.columns.showTitle) {
          const parts: string[] = [];
          if (node.commit.refs.length > 0) {
            const badges = this.renderRefs(node.commit.refs);
            if (badges) parts.push(badges);
          }

          // Dedicated commit type badge: [MERGE] in bold red, [REBASE] in purple,
          // [FAST-FORWARD] in cyan, [SQUASH] in amber
          const typeBadge = getCommitTypeBadge(node.commit, this.colorizer);
          if (typeBadge) {
            parts.push(typeBadge);
          }

          parts.push(this.colorizer.color(node.commit.subject, this.colorizer.theme.subject));
          descLines.push(...wrapText(parts.join(' '), col3Width));
        }

        // If description (body) is enabled and present, wrap and append below title
        if (this.columns.showDescription && node.commit.body) {
          const bodyLines = wrapText(this.colorizer.dim(node.commit.body), col3Width);
          descLines.push(...bodyLines);
        }
      }
    }

    // --- Column 4: Author (if enabled) ---
    let col4AuthorStr = '';
    if (showAuthorCol) {
      if (node.commit) {
        const authorColor = getAuthorColor(node.commit.authorName);
        col4AuthorStr = this.colorizer.color(node.commit.authorName, authorColor);
      } else if (node.type === 'dirty') {
        col4AuthorStr = this.colorizer.dim('Working Tree');
      } else if (node.type === 'stash') {
        col4AuthorStr = this.colorizer.dim('Stash');
      }
    }

    const col3PaddedBlank = ' '.repeat(col3Width);
    const col4PaddedFirst = showAuthorCol ? padVisible(col4AuthorStr, col4Width) : '';
    const col4PaddedBlank = showAuthorCol ? ' '.repeat(col4Width) : '';

    const hasCol2TwoLines = this.columns.showHash && this.columns.showDate && Boolean(dateText);
    const rowLineCount = Math.max(descLines.length, hasCol2TwoLines ? 2 : 1, 1);

    // --- Build Multi-line Table Rows ---
    const resultLines: string[] = [];
    for (let k = 0; k < rowLineCount; k++) {
      const rowParts: string[] = [];

      // Col 1: Graph
      if (this.columns.showGraph) {
        const c1 = k === 0 ? col1FirstLine : col1ContLine;
        rowParts.push(c1);
      }

      // Col 2: Hash & Date
      if (this.columns.showHash || this.columns.showDate) {
        let c2: string;
        if (!this.columns.showHash) {
          c2 = k === 0 ? col2DateStr : '';
        } else {
          c2 = k === 0 ? col2IdStr : (k === 1 && col2DateStr ? col2DateStr : '');
        }
        rowParts.push(padVisible(c2, col2Width));
      }

      // Col 3: Title / Description
      if (showCol3) {
        const c3 = k < descLines.length ? padVisible(descLines[k], col3Width) : col3PaddedBlank;
        rowParts.push(c3);
      }

      // Col 4: Author
      if (showAuthorCol) {
        const c4 = k === 0 ? col4PaddedFirst : col4PaddedBlank;
        rowParts.push(c4);
      }

      resultLines.push(rowParts.join(gapStr).trimEnd());
    }

    return resultLines;
  }

  /**
   * Helper to render vertical continuation lines for Column 1 when description wraps within the same node
   */
  private renderGraphContinuation(row: NodeRow, col1Width: number): string {
    const { node, lane, activeLanes, forkToLanes } = row;
    const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];

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
        const branch = row.laneBranches?.[l] || (l === lane ? row.branch : undefined);
        const customColor = this.colorizer.branchColor(branch);
        charArray[idx] = { char: this.symbols.vLine, laneIndex: l, customColor };
      }
    }

    return this.charsToString(charArray);
  }

  /**
   * Helper to render spacer line between commits in normal/expanded layout
   */
  private renderGraphSpacer(row: NodeRow, col1Width: number): string {
    const { node, lane, activeLanes, forkToLanes, portalExits = [] } = row;
    const charArray: { char: string; laneIndex: number; customColor?: string }[] = [];

    for (let c = 0; c < col1Width; c++) {
      charArray.push({ char: ' ', laneIndex: Math.floor(c / LANE_WIDTH) });
    }

    const allContinuingLanes = new Set([...activeLanes, ...forkToLanes]);
    if (node.commit?.isRoot) {
      allContinuingLanes.delete(lane);
    } else {
      allContinuingLanes.add(lane);
    }

    // Portal exit lanes continue through the spacer line as vertical lines,
    // ensuring a clean 1-line connection from the commit into the portal!
    for (const pe of portalExits) {
      allContinuingLanes.add(pe);
    }

    for (const l of allContinuingLanes) {
      const idx = l * LANE_WIDTH;
      if (idx < col1Width) {
        const branch = row.laneBranches?.[l] || (l === lane ? row.branch : undefined);
        const customColor = this.colorizer.branchColor(branch);
        charArray[idx] = { char: this.symbols.vLine, laneIndex: l, customColor };
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
        const text = ref.name === 'HEAD' ? 'HEAD' : `HEAD\u00A0->\u00A0${ref.name}`;
        badges.push(
          this.colorizer.color(this.colorizer.bold(`(${text})`), this.colorizer.theme.head)
        );
      } else if (ref.type === 'tag') {
        const text = `${this.symbols.tag}\u00A0${ref.name}`;
        badges.push(
          this.colorizer.color(this.colorizer.bold(`[${text}]`), this.colorizer.theme.tag)
        );
      } else if (ref.type === 'remote') {
        const text = `${this.symbols.remote}\u00A0${ref.name}`;
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

  /**
   * Renders the top-level repository header rule with centered content
   */
  public renderHeader(items: GraphRenderItem[], tableWidth: number): string {
    const ruleChar = this.symbols.hLine || '─';
    const repoName = this.options.repoName;
    const headBranch = this.options.headBranch;

    // Count commits displayed
    const commitCount = items.filter(
      (it) => it.kind === 'node' && it.row.node.type === 'commit'
    ).length;
    const totalNodes = items.filter((it) => it.kind === 'node').length;
    const count = commitCount > 0 ? commitCount : totalNodes;
    const countUnit = commitCount > 0 ? (count === 1 ? 'commit' : 'commits') : (count === 1 ? 'item' : 'items');
    const countStr = `${count} ${countUnit}`;

    // Styled text segments
    const titleStyled = this.colorizer.bold(this.colorizer.color('GIT TREE', this.colorizer.theme.head));
    const sepStyled = ' ' + this.colorizer.dim(ruleChar.repeat(2)) + ' ';
    const sepUnstyled = ` ${ruleChar.repeat(2)} `;

    let projectInfoStyled = '';
    let projectInfoUnstyled = '';
    if (repoName) {
      projectInfoStyled = this.colorizer.bold(this.colorizer.color(repoName, this.colorizer.theme.branch));
      projectInfoUnstyled = repoName;
      if (headBranch) {
        projectInfoStyled += ' ' + this.colorizer.color(`(${headBranch})`, this.colorizer.theme.head);
        projectInfoUnstyled += ` (${headBranch})`;
      }
    }

    const countStyled = this.colorizer.color(countStr, this.colorizer.theme.date);

    // Tier 1: Full centered text (GIT TREE ── repo (branch) ── N commits)
    const fullSegmentsStyled = [titleStyled];
    const fullSegmentsUnstyled = ['GIT TREE'];
    if (projectInfoStyled) {
      fullSegmentsStyled.push(projectInfoStyled);
      fullSegmentsUnstyled.push(projectInfoUnstyled);
    }
    fullSegmentsStyled.push(countStyled);
    fullSegmentsUnstyled.push(countStr);

    const fullUnstyledText = fullSegmentsUnstyled.join(sepUnstyled);
    const fullVisibleLen = visibleWidth(fullUnstyledText);

    if (tableWidth - fullVisibleLen - 2 >= 4) {
      const totalDashes = tableWidth - fullVisibleLen - 2;
      const leftDashes = Math.floor(totalDashes / 2);
      const rightDashes = totalDashes - leftDashes;
      const leftRule = this.colorizer.dim(ruleChar.repeat(leftDashes)) + ' ';
      const rightRule = ' ' + this.colorizer.dim(ruleChar.repeat(rightDashes));
      return leftRule + fullSegmentsStyled.join(sepStyled) + rightRule;
    }

    // Tier 2: Medium display (drop commit count: GIT TREE ── repo (branch))
    if (projectInfoStyled) {
      const medSegmentsStyled = [titleStyled, projectInfoStyled];
      const medSegmentsUnstyled = ['GIT TREE', projectInfoUnstyled];
      const medUnstyledText = medSegmentsUnstyled.join(sepUnstyled);
      const medVisibleLen = visibleWidth(medUnstyledText);

      if (tableWidth - medVisibleLen - 2 >= 4) {
        const totalDashes = tableWidth - medVisibleLen - 2;
        const leftDashes = Math.floor(totalDashes / 2);
        const rightDashes = totalDashes - leftDashes;
        const leftRule = this.colorizer.dim(ruleChar.repeat(leftDashes)) + ' ';
        const rightRule = ' ' + this.colorizer.dim(ruleChar.repeat(rightDashes));
        return leftRule + medSegmentsStyled.join(sepStyled) + rightRule;
      }
    }

    // Tier 3: Compact / narrow display (GIT TREE only)
    const minVisibleLen = visibleWidth('GIT TREE');
    if (tableWidth - minVisibleLen - 2 >= 2) {
      const totalDashes = tableWidth - minVisibleLen - 2;
      const leftDashes = Math.floor(totalDashes / 2);
      const rightDashes = totalDashes - leftDashes;
      const leftRule = this.colorizer.dim(ruleChar.repeat(leftDashes)) + ' ';
      const rightRule = ' ' + this.colorizer.dim(ruleChar.repeat(rightDashes));
      return leftRule + titleStyled + rightRule;
    }

    return titleStyled;
  }
}

/**
 * Resolves a dedicated badge for special commit types:
 * - [MERGE] in bold red for merge commits
 * - [REBASE] in bold purple for rebased/cherry-picked commits
 * - [FAST-FORWARD] in bold cyan for fast-forward commits
 * - [SQUASH] in bold amber for squashed commits
 */
export function getCommitTypeBadge(commit: GitCommit, colorizer: Colorizer): string | null {
  if (commit.isMerge) {
    return colorizer.bold(colorizer.color('[MERGE]', colorizer.theme.mergeBadge));
  }

  const subject = commit.subject || '';
  const body = commit.body || '';

  // Check for squash
  if (
    /squash and merge/i.test(subject) ||
    /^squash!/i.test(subject) ||
    /\(squash\)/i.test(subject)
  ) {
    return colorizer.bold(colorizer.color('[SQUASH]', colorizer.theme.squashBadge));
  }

  // Check for rebase / cherry-pick
  if (
    /^rebase(\b|:)/i.test(subject) ||
    /^fixup!/i.test(subject) ||
    /cherry picked from/i.test(subject) ||
    /cherry picked from/i.test(body)
  ) {
    return colorizer.bold(colorizer.color('[REBASE]', colorizer.theme.rebaseBadge));
  }

  // Check for fast-forward
  if (
    /fast-forward/i.test(subject) ||
    /fast forward/i.test(subject) ||
    (/^Merge (branch|pull request)/i.test(subject) && commit.parents.length <= 1)
  ) {
    return colorizer.bold(colorizer.color('[FAST-FORWARD]', colorizer.theme.fastForwardBadge));
  }

  return null;
}
