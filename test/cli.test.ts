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
});
