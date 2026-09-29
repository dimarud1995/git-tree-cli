import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SkillTarget = 'antigravity' | 'claude' | 'cursor' | 'global' | 'auto';

/**
 * Resolves the destination directory for the AI skill based on target
 */
export function resolveSkillDestination(target: SkillTarget = 'auto'): string[] {
  const home = os.homedir();
  const destinations: string[] = [];

  if (target === 'antigravity' || target === 'auto') {
    destinations.push(path.join(home, '.gemini', 'skills', 'git-tree-cli'));
  }
  if (target === 'claude' || target === 'auto') {
    destinations.push(path.join(home, '.claude', 'skills', 'git-tree-cli'));
  }
  if (target === 'cursor' || target === 'auto') {
    destinations.push(path.join(process.cwd(), '.cursor', 'skills', 'git-tree-cli'));
  }
  if (target === 'global' || target === 'auto') {
    destinations.push(path.join(home, '.config', 'ai-skills', 'git-tree-cli'));
  }

  return destinations;
}

/**
 * Reads bundled SKILL.md file
 */
export async function getBundledSkillContent(): Promise<string> {
  // Try locating relative to package root
  const possiblePaths = [
    path.resolve(__dirname, '../skills/git-tree-cli/SKILL.md'),
    path.resolve(__dirname, '../../skills/git-tree-cli/SKILL.md'),
    path.resolve(process.cwd(), 'skills/git-tree-cli/SKILL.md'),
  ];

  for (const p of possiblePaths) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch {
      // Continue search
    }
  }

  throw new Error('Could not find bundled SKILL.md template');
}

/**
 * Installs the AI skill into the target directory
 */
export async function installSkill(target: SkillTarget = 'auto'): Promise<string[]> {
  const content = await getBundledSkillContent();
  const destDirs = resolveSkillDestination(target);
  const installedPaths: string[] = [];

  for (const destDir of destDirs) {
    try {
      await fs.mkdir(destDir, { recursive: true });
      const targetFile = path.join(destDir, 'SKILL.md');
      await fs.writeFile(targetFile, content, 'utf8');
      installedPaths.push(targetFile);
    } catch {
      // Silently skip if permission denied or directory not applicable
    }
  }

  return installedPaths;
}
