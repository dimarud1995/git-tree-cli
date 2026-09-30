import { describe, it, expect } from 'vitest';
import { parseRefs, buildGitLogArgs } from '../src/git/parser.js';
import { TreeCliOptions } from '../src/git/types.js';

describe('Git Parser', () => {
  describe('parseRefs', () => {
    it('parses HEAD pointing to branch', () => {
      const refs = parseRefs('HEAD -> refs/heads/main, origin/main');
      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        type: 'head',
        name: 'main',
        fullName: 'HEAD -> refs/heads/main',
      });
      expect(refs[1]).toEqual({
        type: 'remote',
        name: 'origin/main',
        fullName: 'origin/main',
      });
    });

    it('parses tags and detached HEAD', () => {
      const refs = parseRefs('HEAD, tag: v1.0.0, refs/tags/v2.0');
      expect(refs).toHaveLength(3);
      expect(refs[0].type).toBe('head');
      expect(refs[1]).toEqual({
        type: 'tag',
        name: 'v1.0.0',
        fullName: 'tag: v1.0.0',
      });
      expect(refs[2]).toEqual({
        type: 'tag',
        name: 'v2.0',
        fullName: 'refs/tags/v2.0',
      });
    });

    it('returns empty array for empty string', () => {
      expect(parseRefs('')).toEqual([]);
      expect(parseRefs('   ')).toEqual([]);
    });
  });

  describe('buildGitLogArgs', () => {
    const defaultOptions: TreeCliOptions = {
      merges: 'include',
      stashes: 'include',
      status: 'include',
      layout: 'normal',
      format: 'terminal',
      date: 'relative',
      style: 'curved',
      color: 'auto',
      theme: 'tokyo',
      showAuthor: true,
      showDate: true,
      showHash: true,
      hashLen: 7,
    };

    it('builds default all branches args', () => {
      const args = buildGitLogArgs(defaultOptions);
      expect(args).toContain('--all');
      expect(args).toContain('--date-order');
    });

    it('respects current branch scope', () => {
      const args = buildGitLogArgs({ ...defaultOptions, current: true });
      expect(args).toContain('HEAD');
      expect(args).not.toContain('--all');
    });

    it('respects specific branches', () => {
      const args = buildGitLogArgs({
        ...defaultOptions,
        branches: ['main', 'feature/login'],
      });
      expect(args).toContain('main');
      expect(args).toContain('feature/login');
      expect(args).not.toContain('--all');
    });

    it('applies filters: merges exclude, maxCount, author, since', () => {
      const args = buildGitLogArgs({
        ...defaultOptions,
        merges: 'exclude',
        maxCount: 15,
        author: 'Alice',
        since: '2 weeks ago',
      });
      expect(args).toContain('--no-merges');
      expect(args).toContain('-n');
      expect(args).toContain('15');
      expect(args).toContain('--author=Alice');
      expect(args).toContain('--since=2 weeks ago');
    });

    it('applies merges only', () => {
      const args = buildGitLogArgs({
        ...defaultOptions,
        merges: 'only',
      });
      expect(args).toContain('--merges');
      expect(args).not.toContain('--no-merges');
    });

    it('supports multiple comma-separated authors and emails', () => {
      const args = buildGitLogArgs({
        ...defaultOptions,
        author: 'Alice, Bob',
        email: 'dmr@aryze.io, dev@example.com',
      });
      expect(args).toContain('--author=Alice');
      expect(args).toContain('--author=Bob');
      expect(args).toContain('--author=dmr@aryze.io');
      expect(args).toContain('--author=dev@example.com');
    });
  });
});
