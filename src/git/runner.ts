import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitExecOptions {
  cwd?: string;
  maxBuffer?: number;
}

export class GitError extends Error {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Execute a git command with arguments safely and fast
 */
export async function runGit(
  args: string[],
  options: GitExecOptions = {}
): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const maxBuffer = options.maxBuffer || 10 * 1024 * 1024; // 10MB default buffer

  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer,
      encoding: 'utf8',
    });
    return stdout;
  } catch (err: unknown) {
    const execErr = err as { code?: number; stderr?: string; message?: string };
    const stderr = execErr.stderr?.trim() || execErr.message || 'Unknown git error';
    throw new GitError(stderr, execErr.code, execErr.stderr);
  }
}

/**
 * Check if the given directory is inside a valid git repository
 */
export async function isGitRepository(cwd?: string): Promise<boolean> {
  try {
    const result = await runGit(['rev-parse', '--is-inside-work-tree'], { cwd });
    return result.trim() === 'true';
  } catch {
    return false;
  }
}

/**
 * Get the current HEAD commit hash and branch name
 */
export async function getHeadInfo(cwd?: string): Promise<{ hash: string; branch?: string }> {
  try {
    const hash = (await runGit(['rev-parse', 'HEAD'], { cwd })).trim();
    let branch: string | undefined;
    try {
      const ref = (await runGit(['symbolic-ref', '--short', 'HEAD'], { cwd })).trim();
      if (ref) branch = ref;
    } catch {
      // Detached HEAD or similar
    }
    return { hash, branch };
  } catch {
    return { hash: '' };
  }
}

/**
 * Get the repository name (root directory name)
 */
export async function getRepoName(cwd?: string): Promise<string> {
  try {
    const toplevel = (await runGit(['rev-parse', '--show-toplevel'], { cwd })).trim();
    if (toplevel) {
      const normalized = toplevel.replace(/[/\\]+$/, '');
      const parts = normalized.split(/[/\\]/);
      return parts[parts.length - 1] || '';
    }
  } catch {
    // Fallback if not inside work tree or bare repo
  }
  return '';
}
