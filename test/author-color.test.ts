import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuthorColor,
  hashString,
  relativeLuminance,
  clearAuthorColorCache,
} from '../src/utils/author-color.js';

describe('Author Color Generator', () => {
  beforeEach(() => {
    clearAuthorColorCache();
  });

  it('generates valid 6-digit hex color strings', () => {
    const color = getAuthorColor('Dima Rud');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('is completely deterministic for identical author names', () => {
    const color1 = getAuthorColor('Dima Rud');
    const color2 = getAuthorColor('Dima Rud');
    const color3 = getAuthorColor('dima rud');
    expect(color1).toBe(color2);
    expect(color1).toBe(color3);
  });

  it('produces distinct colors for different authors', () => {
    const c1 = getAuthorColor('Alice');
    const c2 = getAuthorColor('Bob');
    const c3 = getAuthorColor('Charlie');
    expect(c1).not.toBe(c2);
    expect(c2).not.toBe(c3);
    expect(c1).not.toBe(c3);
  });

  it('guarantees WCAG luminance within [0.18, 0.26] across diverse names', () => {
    const names = [
      'Dima Rud',
      'Linus Torvalds',
      'Guido van Rossum',
      'Ada Lovelace',
      'Alan Turing',
      'Grace Hopper',
      'Margaret Hamilton',
      'Ken Thompson',
      'Dennis Ritchie',
      'Bjarne Stroustrup',
      'Brendan Eich',
      'James Gosling',
      'Дмитро Руд',
      '田中太郎',
      'René Müller',
    ];

    for (const name of names) {
      const hex = getAuthorColor(name);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);

      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const lum = relativeLuminance([r, g, b]);

      // Contrast with black: (lum + 0.05) / 0.05
      const contrastBlack = (lum + 0.05) / 0.05;
      // Contrast with white: 1.05 / (lum + 0.05)
      const contrastWhite = 1.05 / (lum + 0.05);

      expect(lum).toBeGreaterThanOrEqual(0.18);
      expect(lum).toBeLessThanOrEqual(0.26);
      expect(contrastBlack).toBeGreaterThanOrEqual(4.6);
      expect(contrastWhite).toBeGreaterThanOrEqual(3.5);
    }
  });

  it('handles empty string or fallback gracefully', () => {
    const color = getAuthorColor('');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
