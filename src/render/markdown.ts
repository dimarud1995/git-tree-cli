import { TreeCliOptions } from '../git/types.js';
import { GraphRenderItem } from '../graph/router.js';
import { TerminalRenderer } from './terminal.js';

/**
 * Renders the graph in a markdown-compatible format, stripping ANSI color codes
 * and wrapping in a fenced code block with repository metadata.
 */
export function renderMarkdown(
  items: GraphRenderItem[],
  options: TreeCliOptions
): string {
  // Use 'never' for color so ANSI escape codes are not emitted in markdown
  const plainOptions: TreeCliOptions = {
    ...options,
    color: 'never',
  };

  const renderer = new TerminalRenderer(plainOptions);
  const treeText = renderer.render(items);

  const lines: string[] = [
    '```text',
    treeText || '(No commits to display)',
    '```',
  ];

  return lines.join('\n');
}
