import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeBranchName,
  extractBranchFromRefs,
  extractMergeBranches,
  extractScopeFromSubject,
  getBranchColor,
  clearBranchColorCache,
} from '../src/utils/branch-color.js';
import { relativeLuminance } from '../src/utils/author-color.js';

describe('Branch Color and Name Utils', () => {
  beforeEach(() => {
    clearBranchColorCache();
  });

  describe('normalizeBranchName', () => {
    it('strips HEAD -> prefix', () => {
      expect(normalizeBranchName('HEAD -> main')).toBe('main');
      expect(normalizeBranchName('HEAD -> feature/auth')).toBe('feature/auth');
    });

    it('strips refs prefixes and remote prefixes', () => {
      expect(normalizeBranchName('refs/heads/feature/login')).toBe('feature/login');
      expect(normalizeBranchName('refs/remotes/origin/feature/login')).toBe('feature/login');
      expect(normalizeBranchName('origin/feature/login')).toBe('feature/login');
      expect(normalizeBranchName('upstream/main')).toBe('main');
    });

    it('handles tag references or bare branch names', () => {
      expect(normalizeBranchName('tag: v1.0.0')).toBe('v1.0.0');
      expect(normalizeBranchName('main')).toBe('main');
    });

    it('handles empty or blank strings', () => {
      expect(normalizeBranchName('')).toBe('');
      expect(normalizeBranchName('   ')).toBe('');
    });
  });

  describe('extractBranchFromRefs', () => {
    it('prefers HEAD pointing branch over remotes and tags', () => {
      const refs = ['tag: v1.0.0', 'origin/main', 'HEAD -> feature/payments'];
      expect(extractBranchFromRefs(refs)).toBe('feature/payments');
    });

    it('extracts local branch when present', () => {
      const refs = ['tag: v2.1', 'fix/memory-leak'];
      expect(extractBranchFromRefs(refs)).toBe('fix/memory-leak');
    });

    it('falls back to remote tracking branch', () => {
      const refs = ['origin/feature/portal-lines'];
      expect(extractBranchFromRefs(refs)).toBe('feature/portal-lines');
    });

    it('returns null when no branch is detectable', () => {
      expect(extractBranchFromRefs([])).toBeNull();
      expect(extractBranchFromRefs(['tag: v1.0.0'])).toBeNull();
    });
  });

  describe('extractMergeBranches', () => {
    it('parses standard git merge messages', () => {
      const result = extractMergeBranches("Merge branch 'feature/oauth' into main");
      expect(result).not.toBeNull();
      expect(result?.source).toBe('feature/oauth');
      expect(result?.target).toBe('main');
    });

    it('parses remote branch merge messages', () => {
      const result = extractMergeBranches("Merge remote-tracking branch 'origin/service/auth' into dev");
      expect(result).not.toBeNull();
      expect(result?.source).toBe('service/auth');
      expect(result?.target).toBe('dev');
    });

    it('parses GitHub pull request merge messages', () => {
      const result = extractMergeBranches('Merge pull request #42 from company/refactor-api');
      expect(result).not.toBeNull();
      expect(result?.source).toBe('company/refactor-api');
    });

    it('returns null for non-merge commits', () => {
      expect(extractMergeBranches('feat: implement user dashboard')).toBeNull();
    });
  });

  describe('extractScopeFromSubject', () => {
    it('extracts conventional commit scope', () => {
      expect(extractScopeFromSubject('feat(auth): add webauthn support')).toBe('auth');
      expect(extractScopeFromSubject('fix(graph/router): resolve lane collision')).toBe('graph/router');
    });

    it('returns null when no conventional scope is present', () => {
      expect(extractScopeFromSubject('feat: add dark mode')).toBeNull();
      expect(extractScopeFromSubject('Update README.md')).toBeNull();
    });
  });

  describe('getBranchColor', () => {
    it('anchors main, master, and trunk to fallback anchor color', () => {
      const anchor = '#7aa2f7';
      expect(getBranchColor('main', anchor)).toBe('#7aa2f7');
      expect(getBranchColor('HEAD -> main', anchor)).toBe('#7aa2f7');
      expect(getBranchColor('origin/main', anchor)).toBe('#7aa2f7');
      expect(getBranchColor('master', anchor)).toBe('#7aa2f7');
      expect(getBranchColor('trunk', anchor)).toBe('#7aa2f7');
    });

    it('generates consistent, deterministic TrueColors for feature branches', () => {
      const c1 = getBranchColor('feature/smart-accounts');
      const c2 = getBranchColor('origin/feature/smart-accounts');
      const c3 = getBranchColor('FEATURE/SMART-ACCOUNTS');

      expect(c1).toBe(c2);
      expect(c1).toBe(c3);
      expect(c1).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('differentiates distinct branches with different colors', () => {
      const c1 = getBranchColor('feature/billing');
      const c2 = getBranchColor('feature/auth');
      const c3 = getBranchColor('bugfix/login-crash');

      expect(c1).not.toBe(c2);
      expect(c2).not.toBe(c3);
      expect(c1).not.toBe(c3);
    });

    it('guarantees WCAG luminance within [0.20, 0.30] for visual punch of thin lines', () => {
      const branches = [
        'feature/portal-lines',
        'service/smart-accounts-provisioning',
        'reforge-settlement',
        'chore/deps',
        'fix/cache-invalidation',
        'v2-alpha-release',
        'hotfix/prod-500',
        'docs/readme',
        'perf/dag-traversal',
      ];

      for (const branch of branches) {
        const hex = getBranchColor(branch);
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const lum = relativeLuminance([r, g, b]);

        expect(lum).toBeGreaterThanOrEqual(0.20);
        expect(lum).toBeLessThanOrEqual(0.30);
      }
    });
  });
});
