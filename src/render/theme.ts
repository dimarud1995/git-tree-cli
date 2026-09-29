import { ColorMode, ColorTheme } from '../git/types.js';

export interface ThemePalette {
  lanes: string[]; // hex codes for branch lanes
  commitHash: string;
  author: string;
  date: string;
  subject: string;
  head: string;
  branch: string;
  remote: string;
  tag: string;
  stash: string;
  dirty: string;
  merge: string;
  mergeBadge: string;
  rebaseBadge: string;
  fastForwardBadge: string;
  squashBadge: string;
}

export const THEMES: Record<ColorTheme, ThemePalette> = {
  tokyo: {
    lanes: ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#f7768e', '#7dcfff', '#ff9e64'],
    commitHash: '#ff9e64',
    author: '#7dcfff',
    date: '#565f89',
    subject: '#c0caf5',
    head: '#7aa2f7',
    branch: '#9ece6a',
    remote: '#565f89',
    tag: '#e0af68',
    stash: '#ff9e64',
    dirty: '#f7768e',
    merge: '#bb9af7',
    mergeBadge: '#f7768e',
    rebaseBadge: '#bb9af7',
    fastForwardBadge: '#7dcfff',
    squashBadge: '#e0af68',
  },
  catppuccin: {
    lanes: ['#89b4fa', '#a6e3a1', '#f9e2af', '#cba6f7', '#f38ba8', '#94e2d5', '#fab387'],
    commitHash: '#fab387',
    author: '#94e2d5',
    date: '#6c7086',
    subject: '#cdd6f4',
    head: '#89b4fa',
    branch: '#a6e3a1',
    remote: '#7f849c',
    tag: '#f9e2af',
    stash: '#fab387',
    dirty: '#f38ba8',
    merge: '#cba6f7',
    mergeBadge: '#f38ba8',
    rebaseBadge: '#cba6f7',
    fastForwardBadge: '#94e2d5',
    squashBadge: '#f9e2af',
  },
  nord: {
    lanes: ['#88c0d0', '#a3be8c', '#ebcb8b', '#b48ead', '#bf616a', '#81a1c1', '#d08770'],
    commitHash: '#d08770',
    author: '#88c0d0',
    date: '#4c566a',
    subject: '#eceff4',
    head: '#88c0d0',
    branch: '#a3be8c',
    remote: '#4c566a',
    tag: '#ebcb8b',
    stash: '#d08770',
    dirty: '#bf616a',
    merge: '#b48ead',
    mergeBadge: '#bf616a',
    rebaseBadge: '#b48ead',
    fastForwardBadge: '#88c0d0',
    squashBadge: '#ebcb8b',
  },
  mono: {
    lanes: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
    commitHash: '#ffffff',
    author: '#ffffff',
    date: '#ffffff',
    subject: '#ffffff',
    head: '#ffffff',
    branch: '#ffffff',
    remote: '#ffffff',
    tag: '#ffffff',
    stash: '#ffffff',
    dirty: '#ffffff',
    merge: '#ffffff',
    mergeBadge: '#ffffff',
    rebaseBadge: '#ffffff',
    fastForwardBadge: '#ffffff',
    squashBadge: '#ffffff',
  },
};

/**
 * Converts Hex string '#RRGGBB' to RGB tuple
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export class Colorizer {
  private enabled: boolean;
  public theme: ThemePalette;

  constructor(colorMode: ColorMode, themeName: ColorTheme = 'tokyo') {
    this.theme = THEMES[themeName] || THEMES.tokyo;

    if (colorMode === 'never' || process.env.NO_COLOR) {
      this.enabled = false;
    } else if (colorMode === 'always') {
      this.enabled = true;
    } else {
      // 'auto'
      this.enabled = process.stdout.isTTY !== false && themeName !== 'mono';
    }
  }

  public color(text: string, hex: string): string {
    if (!this.enabled || !text) return text;
    const [r, g, b] = hexToRgb(hex);
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
  }

  public bg(text: string, hex: string): string {
    if (!this.enabled || !text) return text;
    const [r, g, b] = hexToRgb(hex);
    return `\x1b[48;2;${r};${g};${b}m${text}\x1b[49m`;
  }

  public bold(text: string): string {
    if (!this.enabled || !text) return text;
    return `\x1b[1m${text}\x1b[22m`;
  }

  public dim(text: string): string {
    if (!this.enabled || !text) return text;
    return `\x1b[2m${text}\x1b[22m`;
  }

  public laneColor(laneIndex: number): string {
    const palette = this.theme.lanes;
    return palette[laneIndex % palette.length];
  }

  public colorLane(text: string, laneIndex: number): string {
    return this.color(text, this.laneColor(laneIndex));
  }
}
