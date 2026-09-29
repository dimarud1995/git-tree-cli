/**
 * Regular expression to match ANSI escape codes
 */
export const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

/**
 * Strips ANSI color codes to compute visible string length
 */
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Returns visible display width of a string (ignoring ANSI escape codes)
 */
export function visibleWidth(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Pads a string with spaces until its visible width reaches `targetWidth`
 */
export function padVisible(str: string, targetWidth: number, align: 'left' | 'right' = 'left'): string {
  const currentWidth = visibleWidth(str);
  if (currentWidth >= targetWidth) return str;
  const padding = ' '.repeat(targetWidth - currentWidth);
  return align === 'left' ? `${str}${padding}` : `${padding}${str}`;
}

/**
 * Wraps text into lines not exceeding `maxWidth` visible characters.
 * Handles ANSI codes gracefully by measuring only visible characters.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  if (visibleWidth(text) <= maxWidth) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  let currentVisibleLen = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordVisLen = visibleWidth(word);

    if (currentLine === '') {
      if (wordVisLen > maxWidth) {
        // Hard-break very long words if needed
        let remainingWord = word;
        while (visibleWidth(remainingWord) > maxWidth) {
          // Slice visible characters
          const sliceIndex = Math.min(maxWidth, remainingWord.length);
          lines.push(remainingWord.slice(0, sliceIndex));
          remainingWord = remainingWord.slice(sliceIndex);
        }
        currentLine = remainingWord;
        currentVisibleLen = visibleWidth(currentLine);
      } else {
        currentLine = word;
        currentVisibleLen = wordVisLen;
      }
    } else {
      // Check if word fits with space
      if (currentVisibleLen + 1 + wordVisLen <= maxWidth) {
        currentLine += ' ' + word;
        currentVisibleLen += 1 + wordVisLen;
      } else {
        lines.push(currentLine);
        currentLine = word;
        currentVisibleLen = wordVisLen;
      }
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
