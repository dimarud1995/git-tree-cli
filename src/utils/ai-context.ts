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
 * Formats a rigorous, technical XML directive envelope for AI agents (<ai_context> ... </ai_context>)
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
  const codeTag = options.color === 'always' ? 'ansi' : 'text';

  const lines: string[] = [
    '<ai_context>',
    '[TECHNICAL_UI_SPECIFICATION]',
    `- container_syntax: "\`\`\`${codeTag}\\n<PAYLOAD>\\n\`\`\`"`,
    '- font_requirement: strict monospace',
    `- exact_grid_dimensions: ${ctx.dimensions.width} columns × ${ctx.dimensions.rows} lines`,
    `- overflow_rule: overflow-x: auto (NO_WRAP). NEVER soft-wrap table rows; line-wrapping breaks vertical graph connectivity.`,
    `- character_integrity: Box-drawing curves (╭─, ╰─, │, ├─) and geometric glyphs (●, ◉, ◆, ■, ▲, ○, ◎) require exact column coordinate alignment.`,
    '',
    '[CRITICAL_AI_CONSTRAINTS]',
    '1. ZERO-MODIFICATION: Output the enclosed code block byte-for-byte verbatim.',
    '2. DO NOT CONVERT into Markdown tables (| col |), bulleted lists, or narrative text.',
    '3. DO NOT STRIP or normalize leading/trailing whitespace or inter-column gaps.',
    '4. DO NOT SUBSTITUTE Unicode glyphs or badges with emojis or ASCII simplifications.',
    '5. CONTEXT USAGE: Use the repository metadata below to answer user queries conversationally, but always keep the visual tree code block intact.',
    '',
    '[REPOSITORY_METADATA]',
    `- repository: "${ctx.repository.name || 'git-repo'}"`,
    `- branch: "${ctx.repository.headBranch || 'HEAD'}"`,
    `- displayed_nodes: ${commitText}${stashText}${dirtyText}`,
    '</ai_context>',
  ];

  return lines.join('\n');
}
