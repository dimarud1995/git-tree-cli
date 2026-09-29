import { runGit, getHeadInfo } from './runner.js';
import {
  GitCommit,
  GitRef,
  GitStash,
  GitStatusSummary,
  RefType,
  TreeCliOptions,
} from './types.js';

const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x00';

/**
 * Parses Git ref string (from %D format in git log)
 * Example input: "HEAD -> refs/heads/main, origin/main, tag: v1.0.0"
 */
export function parseRefs(refStr: string): GitRef[] {
  if (!refStr || !refStr.trim()) return [];

  const refs: GitRef[] = [];
  const parts = refStr.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('HEAD -> ')) {
      const target = part.replace('HEAD -> ', '').trim();
      refs.push({
        type: 'head',
        name: target.replace(/^refs\/heads\//, ''),
        fullName: part,
      });
    } else if (part === 'HEAD') {
      refs.push({
        type: 'head',
        name: 'HEAD',
        fullName: 'HEAD',
      });
    } else if (part.startsWith('tag: ')) {
      refs.push({
        type: 'tag',
        name: part.replace('tag: ', '').trim(),
        fullName: part,
      });
    } else if (part.startsWith('refs/tags/')) {
      refs.push({
        type: 'tag',
        name: part.replace('refs/tags/', '').trim(),
        fullName: part,
      });
    } else if (part.includes('/') || part.startsWith('origin/')) {
      refs.push({
        type: 'remote',
        name: part.replace(/^refs\/remotes\//, ''),
        fullName: part,
      });
    } else {
      refs.push({
        type: 'branch',
        name: part.replace(/^refs\/heads\//, ''),
        fullName: part,
      });
    }
  }

  return refs;
}

/**
 * Builds the arguments for `git log` based on TreeCliOptions
 */
export function buildGitLogArgs(options: TreeCliOptions): string[] {
  const args = [
    'log',
    '--topo-order',
    '--parents',
    '--format=%H%x00%P%x00%an%x00%ae%x00%at%x00%D%x00%s%x00%b%x1e',
  ];

  // Exclude internal plumbing refs
  args.push('--exclude=refs/stash*');

  if (options.tags === false) {
    args.push('--exclude=refs/tags/*');
  }

  // Scoping
  if (options.branches && options.branches.length > 0) {
    args.push(...options.branches);
  } else if (options.current) {
    args.push('HEAD');
  } else {
    // Default is all branches
    if (options.remotes === false) {
      args.push('--branches');
    } else {
      args.push('--all');
    }
  }

  // Merges filter
  if (options.merges === 'exclude') {
    args.push('--no-merges');
  } else if (options.merges === 'only') {
    args.push('--merges');
  }

  // Filters
  if (options.maxCount !== undefined && options.maxCount > 0) {
    args.push(`-n`, String(options.maxCount));
  }
  if (options.since) {
    args.push(`--since=${options.since}`);
  }
  if (options.until) {
    args.push(`--until=${options.until}`);
  }
  if (options.author) {
    args.push(`--author=${options.author}`);
  }
  if (options.grep) {
    args.push(`--grep=${options.grep}`);
  }

  return args;
}

/**
 * Fetch and parse commits using Git
 */
export async function fetchCommits(
  options: TreeCliOptions,
  headHash?: string
): Promise<GitCommit[]> {
  const args = buildGitLogArgs(options);
  let stdout: string;

  try {
    stdout = await runGit(args, { cwd: options.cwd });
  } catch (err) {
    // If the repo is empty (no commits yet), git log returns error code 128
    return [];
  }

  const records = stdout.split(RECORD_SEP).map((r) => r.trim()).filter(Boolean);
  const commits: GitCommit[] = [];

  for (const record of records) {
    const fields = record.split(FIELD_SEP);
    if (fields.length < 7) continue;

    const [hash, parentsStr, authorName, authorEmail, atStr, refStr, subject, body] = fields;
    const parents = parentsStr ? parentsStr.trim().split(/\s+/).filter(Boolean) : [];
    const authorDate = parseInt(atStr, 10) || 0;
    const refs = parseRefs(refStr);
    const hashLen = options.hashLen || 7;
    const shortHash = hash.substring(0, hashLen);

    commits.push({
      hash,
      shortHash,
      parents,
      authorName: authorName || 'Unknown',
      authorEmail: authorEmail || '',
      authorDate,
      subject: subject || '',
      body: body ? body.trim() : undefined,
      refs,
      isMerge: parents.length > 1,
      isRoot: parents.length === 0,
      isHead: headHash ? hash === headHash : refs.some((r) => r.type === 'head'),
    });
  }

  return commits;
}

/**
 * Fetch and parse working tree status
 */
export async function fetchStatus(cwd?: string): Promise<GitStatusSummary> {
  const headInfo = await getHeadInfo(cwd);

  try {
    const stdout = await runGit(['status', '--porcelain=v1'], { cwd });
    const lines = stdout.split('\n').filter((l) => l.trim().length > 0);

    let stagedCount = 0;
    let unstagedCount = 0;
    let untrackedCount = 0;

    for (const line of lines) {
      const x = line[0];
      const y = line[1];

      if (x === '?' && y === '?') {
        untrackedCount++;
      } else {
        if (x !== ' ' && x !== '?') stagedCount++;
        if (y !== ' ' && y !== '?') unstagedCount++;
      }
    }

    return {
      dirty: stagedCount > 0 || unstagedCount > 0 || untrackedCount > 0,
      stagedCount,
      unstagedCount,
      untrackedCount,
      headHash: headInfo.hash,
      headBranch: headInfo.branch,
    };
  } catch {
    return {
      dirty: false,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      headHash: headInfo.hash,
      headBranch: headInfo.branch,
    };
  }
}

/**
 * Fetch and parse stashes
 */
export async function fetchStashes(cwd?: string): Promise<GitStash[]> {
  try {
    const stdout = await runGit(
      [
        'stash',
        'list',
        '--format=%gd%x00%H%x00%P%x00%at%x00%gs%x1e',
      ],
      { cwd }
    );

    const records = stdout.split(RECORD_SEP).map((r) => r.trim()).filter(Boolean);
    const stashes: GitStash[] = [];

    for (const record of records) {
      const [ref, hash, parentsStr, atStr, message] = record.split(FIELD_SEP);
      if (!ref || !hash) continue;

      const parents = parentsStr ? parentsStr.trim().split(/\s+/) : [];
      const parentHash = parents[0] || '';
      const match = ref.match(/stash@\{(\d+)\}/);
      const index = match ? parseInt(match[1], 10) : 0;
      const date = parseInt(atStr, 10) || 0;

      stashes.push({
        index,
        ref,
        hash,
        parentHash,
        message: message || 'WIP on stash',
        date,
      });
    }

    return stashes;
  } catch {
    return [];
  }
}
