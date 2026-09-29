import { LineStyle } from '../git/types.js';

export interface SymbolsDefinition {
  commit: string;
  head: string;
  merge: string;
  root: string;
  stash: string;
  dirty: string;
  tag: string;
  remote: string;
  vLine: string;
  hLine: string;
  forkRight: string;
  mergeLeft: string;
  roundTopRight: string;
  roundTopLeft: string;
  roundBottomRight: string;
  roundBottomLeft: string;
  teeRight: string;
  teeLeft: string;
  teeDown: string;
  teeUp: string;
  cross: string;
  slashDownRight: string;
  slashDownLeft: string;
}

export const SYMBOLS: Record<LineStyle, SymbolsDefinition> = {
  curved: {
    commit: '●',
    head: '◉',
    merge: '◆',
    root: '■',
    stash: '▲',
    dirty: '○',
    tag: '⚑',
    remote: '▹',
    vLine: '│',
    hLine: '─',
    forkRight: '╭─',
    mergeLeft: '╰─',
    roundTopRight: '╮',
    roundTopLeft: '╭',
    roundBottomRight: '╯',
    roundBottomLeft: '╰',
    teeRight: '├',
    teeLeft: '┤',
    teeDown: '┬',
    teeUp: '┴',
    cross: '┼',
    slashDownRight: '╲',
    slashDownLeft: '╱',
  },
  straight: {
    commit: '●',
    head: '◉',
    merge: '◆',
    root: '■',
    stash: '▲',
    dirty: '○',
    tag: '⚑',
    remote: '▹',
    vLine: '│',
    hLine: '─',
    forkRight: '┌─',
    mergeLeft: '└─',
    roundTopRight: '┐',
    roundTopLeft: '┌',
    roundBottomRight: '┘',
    roundBottomLeft: '└',
    teeRight: '├',
    teeLeft: '┤',
    teeDown: '┬',
    teeUp: '┴',
    cross: '┼',
    slashDownRight: '\\',
    slashDownLeft: '/',
  },
  ascii: {
    commit: '*',
    head: '@',
    merge: 'M',
    root: '#',
    stash: '^',
    dirty: 'o',
    tag: 'T',
    remote: '>',
    vLine: '|',
    hLine: '-',
    forkRight: '.-',
    mergeLeft: '\'-',
    roundTopRight: '.',
    roundTopLeft: '.',
    roundBottomRight: '\'',
    roundBottomLeft: '\'',
    teeRight: '|',
    teeLeft: '|',
    teeDown: '-',
    teeUp: '-',
    cross: '+',
    slashDownRight: '\\',
    slashDownLeft: '/',
  },
};

/**
 * Resolves the appropriate Unicode box-drawing character given 4-directional connections
 */
export function getBoxChar(
  up: boolean,
  right: boolean,
  down: boolean,
  left: boolean,
  symbols: SymbolsDefinition
): string {
  if (up && down && left && right) return symbols.cross;
  if (up && down && right) return symbols.teeRight;
  if (up && down && left) return symbols.teeLeft;
  if (up && left && right) return symbols.teeUp;
  if (down && left && right) return symbols.teeDown;
  if (down && right) return symbols.roundTopLeft;
  if (down && left) return symbols.roundTopRight;
  if (up && right) return symbols.roundBottomLeft;
  if (up && left) return symbols.roundBottomRight;
  if (up && down) return symbols.vLine;
  if (left && right) return symbols.hLine;
  if (up || down) return symbols.vLine;
  if (left || right) return symbols.hLine;
  return ' ';
}
