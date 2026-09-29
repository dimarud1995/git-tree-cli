import { TreeCliOptions } from '../git/types.js';

export interface ResolvedColumns {
  showGraph: boolean;
  showHash: boolean;
  showDate: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showAuthor: boolean;
}

/**
 * Normalizes user-specified column names and aliases
 */
export function normalizeColumnName(col: string): string {
  const s = col.trim().toLowerCase();
  if (s === 'tree' || s === 'graph') return 'graph';
  if (s === 'hash' || s === 'id' || s === 'commit') return 'hash';
  if (s === 'date' || s === 'time' || s === 'timestamp') return 'date';
  if (s === 'title' || s === 'subject' || s === 'name' || s === 'message') return 'title';
  if (s === 'description' || s === 'desc' || s === 'body') return 'description';
  if (s === 'author' || s === 'user') return 'author';
  return s;
}

/**
 * Resolves final column visibility given CLI options, whitelists, and skip lists.
 *
 * Rules:
 * 1. By default, tree/graph, hash, date, title, and author are ON. Description (body) is OFF.
 * 2. If `columns` is specified, only the columns explicitly present in `columns` are enabled.
 * 3. Any column in `skipColumns` is disabled.
 * 4. Explicit boolean flags (`showGraph: false`, `showAuthor: false`, etc.) take precedence.
 */
export function resolveColumns(options: Partial<TreeCliOptions>): ResolvedColumns {
  // Base defaults
  let showGraph = options.showGraph !== false;
  let showHash = options.showHash !== false;
  let showDate = options.showDate !== false;
  let showTitle = options.showTitle !== false;
  let showAuthor = options.showAuthor !== false;
  let showDescription = Boolean(options.showDescription);

  // If whitelist is specified via `columns`
  if (options.columns) {
    const list = Array.isArray(options.columns)
      ? options.columns
      : String(options.columns).split(',').map((s) => s.trim()).filter(Boolean);

    if (list.length > 0) {
      const colSet = new Set(list.map(normalizeColumnName));
      showGraph = colSet.has('graph');
      showHash = colSet.has('hash');
      showDate = colSet.has('date');
      showTitle = colSet.has('title');
      showAuthor = colSet.has('author');
      showDescription = colSet.has('description');
    }
  }

  // If blacklist is specified via `skipColumns`
  if (options.skipColumns) {
    const skipList = Array.isArray(options.skipColumns)
      ? options.skipColumns
      : String(options.skipColumns).split(',').map((s) => s.trim()).filter(Boolean);

    for (const skip of skipList) {
      const col = normalizeColumnName(skip);
      if (col === 'graph') showGraph = false;
      if (col === 'hash') showHash = false;
      if (col === 'date') showDate = false;
      if (col === 'title') showTitle = false;
      if (col === 'author') showAuthor = false;
      if (col === 'description') showDescription = false;
    }
  }

  // Individual boolean flags take final precedence
  if (options.showGraph === false) showGraph = false;
  if (options.showHash === false) showHash = false;
  if (options.showDate === false) showDate = false;
  if (options.showTitle === false) showTitle = false;
  if (options.showAuthor === false) showAuthor = false;
  if (options.showDescription === true) showDescription = true;

  return {
    showGraph,
    showHash,
    showDate,
    showTitle,
    showDescription,
    showAuthor,
  };
}
