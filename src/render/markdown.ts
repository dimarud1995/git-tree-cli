import { TreeCliOptions } from '../git/types.js';
import { GraphRenderItem } from '../graph/router.js';
import { TerminalRenderer } from './terminal.js';
import { formatAiContextEnvelope } from '../utils/ai-context.js';

/**
 * Renders the graph in a markdown-compatible format, stripping ANSI color codes
 * and wrapping in a fenced code block with repository metadata.
 */
export function renderMarkdown(
  items: GraphRenderItem[],
  options: TreeCliOptions
): string {
  const codeTag = options.color === 'always' ? 'ansi' : 'text';
  // Use 'never' for color by default so ANSI escape codes are not emitted in markdown,
  // unless explicitly requested with --color always (e.g. for GitHub ```ansi blocks)
  const plainOptions: TreeCliOptions = {
    ...options,
    color: options.color === 'always' ? 'always' : 'never',
  };

  const renderer = new TerminalRenderer(plainOptions);
  const treeText = renderer.render(items);

  const lines: string[] = [];

  // If AI mode is enabled, prepend the structured AI rendering directive envelope
  if (options.ai) {
    lines.push(formatAiContextEnvelope(items, treeText, options));
    lines.push('');
  }

  lines.push(`\`\`\`${codeTag}`);
  lines.push(treeText || '(No commits to display)');
  lines.push('```');

  return lines.join('\n');
}
