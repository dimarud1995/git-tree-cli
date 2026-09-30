import { TreeCliOptions } from '../git/types.js';
import { GraphRenderItem } from '../graph/router.js';
import { visibleWidth } from './wrap.js';

export interface AiDimensions {
  width: number;
  rows: number;
}

export interface AiContextData {
  dimensions: AiDimensions;
  directives: {
    container: string;
    lineWrap: boolean;
    horizontalScrollRecommended: boolean;
    instruction: string;
  };
  repository: {
    name?: string;
    headBranch?: string;
    commitsDisplayed: number;
    stashesDisplayed: number;
    dirtyWorktree: boolean;
  };
}

/**
 * Computes layout dimensions, character widths, and repository metadata for AI agents
 */
export function computeAiContext(
  items: GraphRenderItem[],
  renderedText: string,
  options: TreeCliOptions
): AiContextData {
  const lines = renderedText ? renderedText.split('\n') : [];
  const rows = lines.length;
  let maxLineWidth = 0;
  for (const line of lines) {
    const w = visibleWidth(line);
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const commitCount = items.filter(
    (it) => it.kind === 'node' && it.row.node.type === 'commit'
  ).length;
  const stashCount = items.filter(
    (it) => it.kind === 'node' && it.row.node.type === 'stash'
  ).length;
  const dirtyCount = items.filter(
    (it) => it.kind === 'node' && it.row.node.type === 'dirty'
  ).length;

  return {
    dimensions: {
      width: maxLineWidth,
      rows,
    },
    directives: {
      container: '```text (strict monospace code block)',
      lineWrap: false,
      horizontalScrollRecommended: maxLineWidth > 80,
      instruction:
        'Present the rendered git tree below VERBATIM inside a ```text code block. Do NOT alter characters, reformat into markdown tables, truncate lines, or summarize the graph.',
    },
    repository: {
      name: options.repoName,
      headBranch: options.headBranch,
      commitsDisplayed: commitCount,
      stashesDisplayed: stashCount,
      dirtyWorktree: dirtyCount > 0,
    },
  };
}

/**
 * Formats an XML directive envelope for AI agents (<ai_context> ... </ai_context>)
 */
export function formatAiContextEnvelope(
  items: GraphRenderItem[],
  renderedText: string,
  options: TreeCliOptions
): string {
  const ctx = computeAiContext(items, renderedText, options);

  const commitText = `${ctx.repository.commitsDisplayed} ${ctx.repository.commitsDisplayed === 1 ? 'commit' : 'commits'}`;
  const stashText = ctx.repository.stashesDisplayed > 0 ? `, ${ctx.repository.stashesDisplayed} ${ctx.repository.stashesDisplayed === 1 ? 'stash' : 'stashes'}` : '';
  const dirtyText = ctx.repository.dirtyWorktree ? ', dirty worktree' : ', clean worktree';

  const lines: string[] = [
    '<ai_context>',
    '[UI_RENDERING_DIRECTIVES]',
    `- container: "${ctx.directives.container}"`,
    `- dimensions: ${ctx.dimensions.width} columns × ${ctx.dimensions.rows} rows`,
    `- line_wrap: false (preserve vertical monospace alignment; enable horizontal scroll if viewport < ${ctx.dimensions.width}ch)`,
    `- instruction: "${ctx.directives.instruction}"`,
    '',
    '[REPOSITORY_CONTEXT]',
    `- repo: "${ctx.repository.name || 'git-repo'}"`,
    `- branch: "${ctx.repository.headBranch || 'HEAD'}"`,
    `- displayed_nodes: ${commitText}${stashText}${dirtyText}`,
    '</ai_context>',
  ];

  return lines.join('\n');
}
