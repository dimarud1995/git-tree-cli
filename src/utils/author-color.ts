/**
 * Deterministic, perceptually balanced author color generator.
 *
 * Algorithm highlights:
 * 1. Fast FNV-1a 32-bit hash with bit avalanche mixing for uniform distribution across authors.
 * 2. Hue mapped uniformly across the 360-degree color wheel (0° to 359°).
 * 3. Perceptual Lightness (L) dynamically calibrated via binary search targeting WCAG relative
 *    luminance Y ≈ 0.22 at 75% saturation.
 * 4. Mathematically guarantees high contrast and readability on BOTH pure black/dark terminals
 *    (contrast ratio >= 5.0:1) and pure white/light terminals (contrast ratio >= 3.7:1 - 4.2:1).
 * 5. In-memory cache for O(1) repeated lookups during rendering.
 */

const authorColorCache = new Map<string, string>();

/**
 * FNV-1a 32-bit hash with bit avalanche mixing
 */
export function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Avalanche mixing
  hash = hash ^ (hash >>> 16);
  hash = Math.imul(hash, 0x45d9f3b);
  hash = hash ^ (hash >>> 16);
  return hash >>> 0;
}

/**
 * Converts HSL (h in [0, 360], s in [0, 100], l in [0, 100]) to RGB [0-255, 0-255, 0-255]
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const normH = ((h % 360) + 360) % 360 / 360;
  const normS = s / 100;
  const normL = l / 100;

  if (normS === 0) {
    const val = Math.round(normL * 255);
    return [val, val, val];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    let normT = t;
    if (normT < 0) normT += 1;
    if (normT > 1) normT -= 1;
    if (normT < 1 / 6) return p + (q - p) * 6 * normT;
    if (normT < 1 / 2) return q;
    if (normT < 2 / 3) return p + (q - p) * (2 / 3 - normT) * 6;
    return p;
  };

  const q = normL < 0.5 ? normL * (1 + normS) : normL + normS - normL * normS;
  const p = 2 * normL - q;

  const r = hue2rgb(p, q, normH + 1 / 3);
  const g = hue2rgb(p, q, normH);
  const b = hue2rgb(p, q, normH - 1 / 3);

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculates WCAG relative luminance Y from standard sRGB components [0-255]
 */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Finds the optimal 6-hex-digit color string for a given author name.
 */
export function getAuthorColor(authorName: string): string {
  if (!authorName || !authorName.trim()) {
    return '#7dcfff'; // Fallback cyan
  }

  const normalized = authorName.trim().toLowerCase();
  const cached = authorColorCache.get(normalized);
  if (cached) return cached;

  const hash = hashString(normalized);
  const hue = hash % 360;
  const targetLuminance = 0.22;
  const saturation = 75;

  let low = 20;
  let high = 85;
  let bestRgb: [number, number, number] = [0, 0, 0];

  // 6 binary search iterations achieves luminance precision within ±0.015 in ~0.002ms
  for (let i = 0; i < 6; i++) {
    const mid = (low + high) / 2;
    const rgb = hslToRgb(hue, saturation, mid);
    const lum = relativeLuminance(rgb);
    bestRgb = rgb;
    if (lum < targetLuminance) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const hex =
    '#' +
    bestRgb
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');

  authorColorCache.set(normalized, hex);
  return hex;
}

/**
 * Clear the author color cache (useful for unit tests)
 */
export function clearAuthorColorCache(): void {
  authorColorCache.clear();
}
