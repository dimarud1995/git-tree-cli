import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SkillTarget = 'antigravity' | 'claude' | 'cursor' | 'agents' | 'global' | 'auto';

/**
 * Resolves the destination directory for the AI skill based on target
 */
export function resolveSkillDestination(target: SkillTarget = 'auto'): string[] {
  const home = os.homedir();
  const destinations: string[] = [];

  if (target === 'antigravity' || target === 'auto') {
    destinations.push(path.join(home, '.gemini', 'skills', 'git-tree-cli'));
    destinations.push(path.join(home, '.gemini', 'config', 'skills', 'git-tree-cli'));
    destinations.push(path.join(process.cwd(), '.agents', 'skills', 'git-tree-cli'));
  }
  if (target === 'claude' || target === 'auto') {
    destinations.push(path.join(home, '.claude', 'skills', 'git-tree-cli'));
  }
  if (target === 'cursor' || target === 'auto') {
    destinations.push(path.join(process.cwd(), '.cursor', 'skills', 'git-tree-cli'));
  }
  if (target === 'agents' || target === 'auto') {
    destinations.push(path.join(home, '.agents', 'skills', 'git-tree-cli'));
    destinations.push(path.join(process.cwd(), '.agents', 'skills', 'git-tree-cli'));
  }
  if (target === 'global' || target === 'auto') {
    destinations.push(path.join(home, '.config', 'ai-skills', 'git-tree-cli'));
    destinations.push(path.join(home, '.config', 'skills', 'git-tree-cli'));
  }

  // Deduplicate preserving order
  return Array.from(new Set(destinations));
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

/**
 * Checks whether git-tree is in the system PATH and optionally links to ~/.local/bin
 */
export async function ensurePath(): Promise<{ onPath: boolean; message?: string }> {
  const home = os.homedir();
  const pathEnv = process.env.PATH || '';
  const paths = pathEnv.split(path.delimiter);

  const localBin = path.join(home, '.local', 'bin');
  const localBinInPath = paths.includes(localBin);

  // Check if git-tree binary can be found in PATH
  let foundInPath = false;
  for (const p of paths) {
    try {
      const candidate = path.join(p, 'git-tree');
      await fs.access(candidate);
      foundInPath = true;
      break;
    } catch {
      // continue search
    }
  }

  if (foundInPath) {
    return { onPath: true };
  }

  // If not found in PATH, attempt to symlink executable to ~/.local/bin
  try {
    const currentScript = process.argv[1];
    if (currentScript) {
      await fs.mkdir(localBin, { recursive: true });
      const targetSymlink = path.join(localBin, 'git-tree');
      try {
        await fs.unlink(targetSymlink);
      } catch {
        // ignore if not existing
      }
      await fs.symlink(currentScript, targetSymlink);
      return {
        onPath: localBinInPath,
        message: localBinInPath
          ? `Created symlink in ${targetSymlink} (which is in your PATH).`
          : `Created symlink in ${targetSymlink}. Add ${localBin} to your PATH.`,
      };
    }
  } catch {
    // Ignore error
  }

  return {
    onPath: false,
    message: 'git-tree is not currently in your PATH. Add $(npm config get prefix)/bin to PATH in ~/.zshrc or ~/.bashrc.',
  };
}

