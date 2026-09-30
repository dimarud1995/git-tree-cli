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
 * Updates the list of active ANSI codes based on an ANSI escape code.
 */
function updateActiveAnsi(activeAnsi: string[], code: string): void {
  if (code === '\x1b[0m') {
    activeAnsi.length = 0;
  } else if (code === '\x1b[39m') {
    // Reset foreground color
    for (let i = activeAnsi.length - 1; i >= 0; i--) {
      const a = activeAnsi[i];
      if (
        a.startsWith('\x1b[38;') ||
        /^\x1b\[3[0-7]m/.test(a) ||
        /^\x1b\[9[0-7]m/.test(a)
      ) {
        activeAnsi.splice(i, 1);
      }
    }
  } else if (code === '\x1b[49m') {
    // Reset background color
    for (let i = activeAnsi.length - 1; i >= 0; i--) {
      const a = activeAnsi[i];
      if (
        a.startsWith('\x1b[48;') ||
        /^\x1b\[4[0-7]m/.test(a) ||
        /^\x1b\[10[0-7]m/.test(a)
      ) {
        activeAnsi.splice(i, 1);
      }
    }
  } else if (code === '\x1b[22m') {
    // Reset bold / dim
    for (let i = activeAnsi.length - 1; i >= 0; i--) {
      if (activeAnsi[i] === '\x1b[1m' || activeAnsi[i] === '\x1b[2m') {
        activeAnsi.splice(i, 1);
      }
    }
  } else {
    // New foreground color replaces existing foreground color
    if (
      code.startsWith('\x1b[38;') ||
      /^\x1b\[3[0-7]m/.test(code) ||
      /^\x1b\[9[0-7]m/.test(code)
    ) {
      for (let i = activeAnsi.length - 1; i >= 0; i--) {
        const a = activeAnsi[i];
        if (
          a.startsWith('\x1b[38;') ||
          /^\x1b\[3[0-7]m/.test(a) ||
          /^\x1b\[9[0-7]m/.test(a)
        ) {
          activeAnsi.splice(i, 1);
        }
      }
    }
    // New background color replaces existing background color
    if (
      code.startsWith('\x1b[48;') ||
      /^\x1b\[4[0-7]m/.test(code) ||
      /^\x1b\[10[0-7]m/.test(code)
    ) {
      for (let i = activeAnsi.length - 1; i >= 0; i--) {
        const a = activeAnsi[i];
        if (
          a.startsWith('\x1b[48;') ||
          /^\x1b\[4[0-7]m/.test(a) ||
          /^\x1b\[10[0-7]m/.test(a)
        ) {
          activeAnsi.splice(i, 1);
        }
      }
    }
    // New bold/dim replaces existing intensity
    if (code === '\x1b[1m' || code === '\x1b[2m') {
      for (let i = activeAnsi.length - 1; i >= 0; i--) {
        if (activeAnsi[i] === '\x1b[1m' || activeAnsi[i] === '\x1b[2m') {
          activeAnsi.splice(i, 1);
        }
      }
    }
    activeAnsi.push(code);
  }
}

/**
 * Scans a string for ANSI escape codes and updates the active ANSI state.
 */
function scanAnsiCodes(str: string, activeAnsi: string[]): void {
  const matches = str.match(/\x1b\[[0-9;]*m/g);
  if (!matches) return;
  for (const m of matches) {
    updateActiveAnsi(activeAnsi, m);
  }
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
      updateActiveAnsi(activeAnsi, code);
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
  const activeAnsi: string[] = [];

  const flushLine = () => {
    if (currentLine === '') return;
    if (activeAnsi.length > 0 && !currentLine.endsWith('\x1b[0m') && !currentLine.endsWith('\x1b[39m')) {
      lines.push(currentLine + '\x1b[0m');
    } else {
      lines.push(currentLine);
    }
    currentLine = '';
    currentVisibleLen = 0;
  };

  const startNewLineWithActiveStyles = () => {
    if (activeAnsi.length > 0) {
      currentLine = activeAnsi.join('');
    }
  };

  for (let i = 0; i < rawWords.length; i++) {
    let word = rawWords[i];
    if (word === '') continue;

    let wordVisLen = visibleWidth(word);

    // If word fits on current line with a preceding space (if line already has visible text)
    const needsSpace = currentVisibleLen > 0;
    const additionalLen = needsSpace ? 1 + wordVisLen : wordVisLen;

    if (currentVisibleLen + additionalLen <= maxWidth) {
      if (needsSpace) {
        currentLine += ' ' + word;
      } else {
        currentLine += word;
      }
      currentVisibleLen += additionalLen;
      scanAnsiCodes(word, activeAnsi);
      continue;
    }

    // If current line has visible content and word doesn't fit, flush current line
    if (currentVisibleLen > 0) {
      flushLine();
      startNewLineWithActiveStyles();
    }

    // Now currentLine has 0 visible characters. If word fits on a fresh line, put it there
    if (wordVisLen <= maxWidth) {
      currentLine += word;
      currentVisibleLen = wordVisLen;
      scanAnsiCodes(word, activeAnsi);
      continue;
    }

    // Word is longer than maxWidth on its own: break at natural delimiters or maxVisible
    while (visibleWidth(word) > maxWidth) {
      const plain = stripAnsi(word);
      const breakAt = findNaturalBreak(plain, maxWidth);
      const { head, tail } = sliceAnsiVisible(word, breakAt);
      currentLine += head;
      flushLine();
      startNewLineWithActiveStyles();
      word = tail;
      wordVisLen = visibleWidth(word);
    }

    if (word.length > 0) {
      currentLine += word;
      currentVisibleLen = wordVisLen;
      scanAnsiCodes(word, activeAnsi);
    }
  }

  if (currentVisibleLen > 0) {
    flushLine();
  }

  // Restore non-breaking spaces back to regular spaces for clean terminal output and clipboard copy
  return lines.map((l) => l.replace(/\u00A0/g, ' '));
}
