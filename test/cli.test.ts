import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { VERSION } from '../src/version.js';

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
    expect(stdout.trim()).toBe(VERSION);
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

  it('supports --lines portal (default) and --lines full / --full-lines', async () => {
    const { stdout: portalOut } = await execFileAsync('node', [
      binPath,
      '-10',
      '--lines',
      'portal',
      '--format',
      'markdown',
    ]);
    expect(portalOut).toContain('```text');

    const { stdout: fullOut } = await execFileAsync('node', [
      binPath,
      '-10',
      '--full-lines',
      '--format',
      'markdown',
    ]);
    expect(fullOut).toContain('```text');
  });

  it('renders repository header by default and supports --no-header / --hide-header', async () => {
    const { stdout: defaultOut } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
    ]);
    expect(defaultOut).toContain('GIT TREE');
    expect(defaultOut).toContain('git-tree-cli');
    expect(defaultOut).toContain('1 commit');

    const { stdout: noHeaderOut } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--no-header',
    ]);
    expect(noHeaderOut).not.toContain('GIT TREE');

    const { stdout: hideHeaderOut } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--hide-header',
    ]);
    expect(hideHeaderOut).not.toContain('GIT TREE');
  });

  it('supports overriding repository display name with --repo-name', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-1',
      '--format',
      'markdown',
      '--repo-name',
      'custom-project-name',
    ]);
    expect(stdout).toContain('custom-project-name');
  });

  it('supports --ai, automatically defaulting to markdown with <ai_context>', async () => {
    const { stdout } = await execFileAsync('node', [binPath, '-1', '--ai']);
    expect(stdout).toContain('<ai_context>');
    expect(stdout).toContain('[TECHNICAL_UI_SPECIFICATION]');
    expect(stdout).toContain('[CRITICAL_AI_CONSTRAINTS]');
    expect(stdout).toContain('```text');
    expect(stdout).toContain('git-tree-cli');
    expect(stdout).toContain('</ai_context>');
  });

  it('supports --extra-details-for-ai and --ai-hints aliases', async () => {
    const { stdout: extraOut } = await execFileAsync('node', [
      binPath,
      '-1',
      '--extra-details-for-ai',
    ]);
    expect(extraOut).toContain('<ai_context>');

    const { stdout: hintsOut } = await execFileAsync('node', [
      binPath,
      '-1',
      '--ai-hints',
    ]);
    expect(hintsOut).toContain('<ai_context>');
  });

  it('supports --ai with --format json attaching aiContext object', async () => {
    const { stdout } = await execFileAsync('node', [
      binPath,
      '-1',
      '--ai',
      '--format',
      'json',
    ]);
    const data = JSON.parse(stdout);
    expect(data.aiContext).toBeDefined();
    expect(data.aiContext.dimensions.width).toBeGreaterThan(0);
    expect(data.aiContext.directives.lineWrap).toBe(false);
  });
});
