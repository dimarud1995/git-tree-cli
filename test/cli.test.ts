import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const binPath = path.resolve(__dirname, '../bin/git-tree.js');

describe('CLI Integration', () => {
  it('outputs help text with --help', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '--help']);
    expect(stdout).toContain('Usage: git-tree');
    expect(stdout).toContain('--all');
    expect(stdout).toContain('--merges');
    expect(stdout).toContain('--stashes');
    expect(stdout).toContain('--status');
    expect(stdout).toContain('install-skill');
  });

  it('outputs valid JSON schema with --explain-flags', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '--explain-flags']);
    const schema = JSON.parse(stdout);
    expect(schema.name).toBe('git-tree');
    expect(schema.flags.scoping).toBeDefined();
    expect(schema.flags.filtering).toBeDefined();
    expect(schema.flags.entityToggles).toBeDefined();
    expect(schema.flags.presentation).toBeDefined();
  });

  it('outputs version with -V', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '-V']);
    expect(stdout.trim()).toBe('1.0.0');
  });

  it('supports numeric shorthand limit like -2', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '-2', '--format', 'json']);
    const data = JSON.parse(stdout);
    expect(data.nodes).toBeDefined();
    // At most 2 commit nodes (+ optional stash/status)
    const commitNodes = data.nodes.filter((n: any) => n.type === 'commit');
    expect(commitNodes.length).toBeLessThanOrEqual(2);
  });

  it('outputs fenced markdown code block with --format markdown', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '-1', '--format', 'markdown']);
    expect(stdout).toMatch(/^```text\n[\s\S]+\n```\n?$/);
  });

  it('supports --hide-author, --hide-date, --hide-hash', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--hide-author',
      '--hide-date',
    ]);
    expect(stdout).toContain('```text');
  });

  it('supports --columns title,author', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--columns',
      'title,author',
    ]);
    expect(stdout).toContain('```text');
    expect(stdout).not.toContain('●');
    expect(stdout).not.toContain('◉');
  });

  it('supports --skip-columns graph', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--skip-columns',
      'graph',
    ]);
    expect(stdout).toContain('```text');
    expect(stdout).not.toContain('●');
    expect(stdout).not.toContain('◉');
  });

  it('supports filtering by --email or multiple emails', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-5',
      '--email',
      'dima.rud1995@gmail.com, nonexistent@aryze.io',
      '--format',
      'markdown',
    ]);
    expect(stdout).toContain('```text');
    expect(stdout).toContain('Dima Rud');
  });
});
