import { hashString, hslToRgb, relativeLuminance } from './author-color.js';
import { GitRef } from '../git/types.js';

const branchColorCache = new Map<string, string>();

/**
 * Normalizes branch reference names by stripping remote prefixes (e.g. origin/, upstream/),
 * reference prefixes (refs/heads/, refs/remotes/), and HEAD indicators.
 */
export function normalizeBranchName(raw: string): string {
  let name = raw.trim();
  if (name.startsWith('HEAD -> ')) {
    name = name.slice(8).trim();
  }
  if (name.startsWith('tag: ')) {
    name = name.slice(5).trim();
  }
  if (name.startsWith('refs/tags/')) {
    name = name.slice(10).trim();
  }
  if (name.startsWith('refs/heads/')) {
    name = name.slice(11).trim();
  }
  if (name.startsWith('refs/remotes/')) {
    name = name.slice(13).trim();
  }
  // Strip common remote prefixes: origin/, upstream/
  if (name.startsWith('origin/')) {
    name = name.slice(7).trim();
  } else if (name.startsWith('upstream/')) {
    name = name.slice(9).trim();
  }
  return name;
}

/**
 * Extracts the most representative branch name from commit refs (accepts GitRef[] or string[]).
 */
export function extractBranchFromRefs(refs?: (GitRef | string)[]): string | null {
  if (!refs || refs.length === 0) return null;

  // 1. Look for HEAD -> <branch>
  for (const item of refs) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('HEAD -> ')) {
        return normalizeBranchName(trimmed);
      }
    } else if (item.type === 'head') {
      if (item.fullName?.startsWith('HEAD -> ')) {
        return normalizeBranchName(item.name || item.fullName);
      }
      if (item.name && item.name !== 'HEAD') {
        return normalizeBranchName(item.name);
      }
    }
  }

  // 2. Look for local branch
  for (const item of refs) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (
        !trimmed.startsWith('tag:') &&
        !trimmed.startsWith('refs/tags/') &&
        trimmed !== 'HEAD' &&
        !trimmed.startsWith('HEAD -> ')
      ) {
        if (!trimmed.includes('origin/') && !trimmed.includes('/')) {
          return normalizeBranchName(trimmed);
        }
      }
    } else if (item.type === 'branch' && item.name !== 'HEAD') {
      return normalizeBranchName(item.name);
    }
  }

  // 3. Look for remote branch
  for (const item of refs) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (
        !trimmed.startsWith('tag:') &&
        !trimmed.startsWith('refs/tags/') &&
        trimmed !== 'HEAD' &&
        !trimmed.startsWith('HEAD -> ')
      ) {
        return normalizeBranchName(trimmed);
      }
    } else if (item.type === 'remote' && !item.name.endsWith('/HEAD')) {
      return normalizeBranchName(item.name);
    }
  }

  return null;
}

/**
 * Extracts source and target branch names from standard git merge commit subjects.
 */
export function extractMergeBranches(subject: string): { target?: string; source?: string } | null {
  // Pattern 1: Merge branch 'feature/foo' into main
  // Pattern 2: Merge remote-tracking branch 'origin/service/wallets' into integration/2026-09-24
  const intoMatch = subject.match(
    /Merge (?:remote-tracking )?branch '([^']+)' into ([^\s]+)/i
  );
  if (intoMatch) {
    return {
      source: normalizeBranchName(intoMatch[1]),
      target: normalizeBranchName(intoMatch[2]),
    };
  }

  // Pattern 3: Merge service/webhooks into service/webhook-delivery
  const simpleIntoMatch = subject.match(
    /Merge (?:origin\/)?([^\s']+) into (?:origin\/)?([^\s']+)/i
  );
  if (simpleIntoMatch) {
    return {
      source: normalizeBranchName(simpleIntoMatch[1]),
      target: normalizeBranchName(simpleIntoMatch[2]),
    };
  }

  // Pattern 4: Merge branch 'feature/foo'
  const branchMatch = subject.match(/Merge (?:remote-tracking )?branch '([^']+)'/i);
  if (branchMatch) {
    return {
      source: normalizeBranchName(branchMatch[1]),
    };
  }

  // Pattern 5: Merge pull request #123 from user/branch-name
  const prMatch = subject.match(/Merge pull request #\d+ from ([^\s]+)/i);
  if (prMatch) {
    return {
      source: normalizeBranchName(prMatch[1]),
    };
  }

  return null;
}

/**
 * Extracts conventional commit scope e.g. feat(webhooks): -> 'webhooks'
 */
export function extractScopeFromSubject(subject: string): string | null {
  const match = subject.match(/^[a-z]+(?:\(([^)]+)\))?!?:/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Deterministically generates a vibrant, perceptually calibrated WCAG TrueColor for a branch name.
 * Uses FNV-1a 32-bit hash with avalanche mixing, 80% saturation, and binary search luminance targeting.
 * Maps 'main', 'master', and 'trunk' to an anchor color (default theme primary lane color).
 */
export function getBranchColor(branchName?: string, fallbackAnchor?: string): string {
  if (!branchName || !branchName.trim()) {
    return fallbackAnchor || '#7aa2f7';
  }

  const normalized = normalizeBranchName(branchName).toLowerCase();
  if (normalized === 'main' || normalized === 'master' || normalized === 'trunk') {
    return fallbackAnchor || '#7aa2f7';
  }

  const cached = branchColorCache.get(normalized);
  if (cached) return cached;

  const hash = hashString(normalized);
  const hue = hash % 360;
  const targetLuminance = 0.25; // Optimized for terminal line glyph contrast
  const saturation = 80;

  let low = 22;
  let high = 88;
  let bestRgb: [number, number, number] = [0, 0, 0];

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

  branchColorCache.set(normalized, hex);
  return hex;
}

/**
 * Clears the branch color cache (useful for unit tests).
 */
export function clearBranchColorCache(): void {
  branchColorCache.clear();
}
