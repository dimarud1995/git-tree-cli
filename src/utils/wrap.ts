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
 * Slices an ANSI-formatted string at a visible character position,
 * cleanly closing active ANSI styles at the end of head and reopening them at the start of tail.
 */
export function sliceAnsiVisible(str: string, maxVisible: number): { head: string; tail: string } {
  let vis = 0;
  let i = 0;
  const ansiRegex = /^\x1b\[[0-9;]*m/;
  let head = '';
  const activeAnsi: string[] = [];

  while (i < str.length) {
    const match = str.slice(i).match(ansiRegex);
    if (match) {
      const code = match[0];
      head += code;
      if (code === '\x1b[0m' || code === '\x1b[39m') {
        const filtered = activeAnsi.filter((a) => !a.startsWith('\x1b[38;') && a !== '\x1b[39m');
        activeAnsi.length = 0;
        activeAnsi.push(...filtered);
      } else {
        activeAnsi.push(code);
      }
      i += code.length;
      continue;
    }

    if (vis >= maxVisible) break;
    head += str[i];
    vis++;
    i++;
  }

  const tailRaw = str.slice(i);
  const headWithReset = activeAnsi.length > 0 ? head + '\x1b[0m' : head;
  const tailWithAnsi =
    activeAnsi.length > 0 && tailRaw.length > 0 ? activeAnsi.join('') + tailRaw : tailRaw;
  return { head: headWithReset, tail: tailWithAnsi };
}

/**
 * Finds a natural break point (like '/', '-', '_', ':', ',') within the first `maxVisible` visible characters.
 */
function findNaturalBreak(plainStr: string, maxVisible: number): number {
  const delimiters = ['/', '-', '_', ':', ','];
  for (let i = Math.min(plainStr.length, maxVisible); i >= 1; i--) {
    if (delimiters.includes(plainStr[i - 1])) {
      // Don't break if it's too close to the start (e.g. within first 3 characters)
      if (i > 3) {
        return i;
      }
    }
  }
  return maxVisible;
}

/**
 * Wraps text into lines not exceeding `maxWidth` visible characters.
 * Handles ANSI codes gracefully by measuring only visible characters,
 * breaks long tokens at punctuation boundaries if needed, and preserves styles across line splits.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const normalize = (s: string) => s.replace(/\u00A0/g, ' ');
  if (maxWidth <= 0) return [normalize(text)];
  if (visibleWidth(text) <= maxWidth) return [normalize(text)];

  // Split on standard ASCII space, preserving non-breaking spaces (\u00A0) inside tokens
  const rawWords = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  let currentVisibleLen = 0;

  for (let i = 0; i < rawWords.length; i++) {
    let word = rawWords[i];
    if (word === '') continue;

    let wordVisLen = visibleWidth(word);

    // If word fits on current line with a preceding space
    if (currentLine !== '' && currentVisibleLen + 1 + wordVisLen <= maxWidth) {
      currentLine += ' ' + word;
      currentVisibleLen += 1 + wordVisLen;
      continue;
    }

    // If current line has content and word doesn't fit, flush current line
    if (currentLine !== '') {
      lines.push(currentLine);
      currentLine = '';
      currentVisibleLen = 0;
    }

    // Now currentLine is empty. If word fits on a fresh line, put it there
    if (wordVisLen <= maxWidth) {
      currentLine = word;
      currentVisibleLen = wordVisLen;
      continue;
    }

    // Word is longer than maxWidth on its own: break at natural delimiters or maxVisible
    while (visibleWidth(word) > maxWidth) {
      const plain = stripAnsi(word);
      const breakAt = findNaturalBreak(plain, maxWidth);
      const { head, tail } = sliceAnsiVisible(word, breakAt);
      lines.push(head);
      word = tail;
      wordVisLen = visibleWidth(word);
    }

    if (word.length > 0) {
      currentLine = word;
      currentVisibleLen = wordVisLen;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Restore non-breaking spaces back to regular spaces for clean terminal output and clipboard copy
  return lines.map((l) => l.replace(/\u00A0/g, ' '));
}
