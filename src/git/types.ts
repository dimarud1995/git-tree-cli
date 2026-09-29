export type RefType = 'head' | 'branch' | 'remote' | 'tag' | 'stash';

export interface GitRef {
  type: RefType;
  name: string;
  fullName: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  authorDate: number; // epoch in seconds
  subject: string;
  body?: string;
  refs: GitRef[];
  isMerge: boolean;
  isRoot: boolean;
  isHead: boolean;
}

export interface GitStash {
  index: number;
  ref: string;
  hash: string;
  parentHash: string;
  message: string;
  date: number;
}

export interface GitStatusSummary {
  dirty: boolean;
  stagedCount: number;
  unstagedCount: number;
  untrackedCount: number;
  headHash?: string;
  headBranch?: string;
}

export type EntityFilter = 'include' | 'exclude' | 'only';
export type LayoutMode = 'compact' | 'normal' | 'expanded';
export type OutputFormat = 'terminal' | 'markdown' | 'json';
export type DateStyle = 'relative' | 'iso' | 'short';
export type LineStyle = 'curved' | 'straight' | 'ascii';
export type ColorMode = 'always' | 'auto' | 'never';
export type ColorTheme = 'tokyo' | 'catppuccin' | 'nord' | 'mono';

export interface TreeCliOptions {
  // Scoping
  all?: boolean;
  current?: boolean;
  branches?: string[];
  remotes?: boolean;
  tags?: boolean;

  // Filtering
  maxCount?: number;
  since?: string;
  until?: string;
  author?: string;
  grep?: string;

  // Entity toggles
  merges: EntityFilter;
  stashes: EntityFilter;
  status: EntityFilter;

  // Display & layout
  layout: LayoutMode;
  format: OutputFormat;
  date: DateStyle;
  style: LineStyle;
  color: ColorMode;
  theme: ColorTheme;
  showAuthor?: boolean;
  showDate?: boolean;
  showHash?: boolean;
  showGraph?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  columns?: string[];
  skipColumns?: string[];
  hashLen: number;
  width?: number;

  // Repository path
  cwd?: string;
}
