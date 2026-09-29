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
  roundBottomRight: string;
  teeRight: string;
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
    roundBottomRight: '╯',
    teeRight: '├─',
    cross: '┼─',
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
    roundBottomRight: '┘',
    teeRight: '├─',
    cross: '┼─',
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
    roundBottomRight: '\'',
    teeRight: '|-',
    cross: '+-',
    slashDownRight: '\\',
    slashDownLeft: '/',
  },
};
