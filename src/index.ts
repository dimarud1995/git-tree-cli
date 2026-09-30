import { isGitRepository, getHeadInfo, getRepoName } from './git/runner.js';
import { fetchCommits, fetchStatus, fetchStashes } from './git/parser.js';
import { buildGraphNodes } from './graph/dag.js';
import { routeGraph } from './graph/router.js';
import { TerminalRenderer } from './render/terminal.js';
import { renderMarkdown } from './render/markdown.js';
import { renderJson } from './render/json.js';
import { TreeCliOptions } from './git/types.js';

export * from './git/types.js';
export * from './git/runner.js';
export * from './git/parser.js';
export * from './graph/dag.js';
export * from './graph/router.js';
export * from './render/terminal.js';
export * from './render/markdown.js';
export * from './render/json.js';
export * from './render/theme.js';
export * from './render/symbols.js';

/**
 * Main programmatic entry point for git-tree
 */
export async function generateGitTree(options: TreeCliOptions): Promise<string> {
  const isRepo = await isGitRepository(options.cwd);
  if (!isRepo) {
    throw new Error(`Fatal: not a git repository (cwd: ${options.cwd || process.cwd()})`);
  }

  const [headInfo, repoName] = await Promise.all([
    getHeadInfo(options.cwd),
    options.repoName !== undefined ? Promise.resolve(options.repoName) : getRepoName(options.cwd),
  ]);

  const headBranch = options.headBranch !== undefined ? options.headBranch : headInfo.branch;

  const resolvedOptions: TreeCliOptions = {
    ...options,
    repoName,
    headBranch,
  };

  // Parallel fetch of commits, status, and stashes
  const [commits, status, stashes] = await Promise.all([
    fetchCommits(resolvedOptions, headInfo.hash),
    resolvedOptions.status !== 'exclude' ? fetchStatus(resolvedOptions.cwd) : { dirty: false, stagedCount: 0, unstagedCount: 0, untrackedCount: 0 },
    resolvedOptions.stashes !== 'exclude' ? fetchStashes(resolvedOptions.cwd) : [],
  ]);

  // Build DAG & route lanes
  const nodes = buildGraphNodes(commits, status, stashes, resolvedOptions);
  if (nodes.length === 0) {
    if (resolvedOptions.format === 'json') {
      return JSON.stringify({ version: '1.0.0', totalNodes: 0, nodes: [] }, null, 2);
    }
    if (resolvedOptions.format === 'markdown') {
      return '```text\n(No commits found)\n```';
    }
    return '(No commits found matching criteria)';
  }

  const items = routeGraph(nodes, resolvedOptions.lines || 'portal');

  // Render according to requested format
  if (resolvedOptions.format === 'json') {
    return renderJson(items);
  }
  if (resolvedOptions.format === 'markdown') {
    return renderMarkdown(items, resolvedOptions);
  }

  const renderer = new TerminalRenderer(resolvedOptions);
  return renderer.render(items);
}
