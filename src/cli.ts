import { Command } from 'commander';
import { generateGitTree } from './index.js';
import {
  ColorMode,
  ColorTheme,
  DateStyle,
  EntityFilter,
  LayoutMode,
  LineStyle,
  OutputFormat,
  TreeCliOptions,
} from './git/types.js';
import { installSkill, SkillTarget } from './installer/skill-installer.js';

const program = new Command();

program
  .name('git-tree')
  .description('AI-first, visually stunning Git tree CLI tool')
  .version('1.0.0');

// Scoping
program
  .option('-a, --all', 'Show all branches (default: true)', true)
  .option('-c, --current', 'Show only commits reachable from current HEAD')
  .option('-b, --branches <branches>', 'Comma-separated list of branches to display')
  .option('--remotes', 'Include remote tracking branches (default: true)', true)
  .option('--no-remotes', 'Exclude remote tracking branches')
  .option('--tags', 'Include tags in commit view (default: true)', true)
  .option('--no-tags', 'Exclude tags');

// Filtering
program
  .option('-n, --max-count, --limit <count>', 'Limit the number of commits to output (e.g. -n 100, -100)', (val) =>
    parseInt(val, 10)
  )
  .option('--since <date>', 'Show commits more recent than a specific date')
  .option('--until <date>', 'Show commits older than a specific date')
  .option('--author <pattern>', 'Filter commits matching author name or email pattern')
  .option('--grep <pattern>', 'Filter commits matching commit message pattern');

// Entity isolation toggles
program
  .option('--merges', 'Include merge commits (default: true)', true)
  .option('--no-merges', 'Exclude merge commits')
  .option('--only-merges', 'Show ONLY merge commits')
  .option('--stashes', 'Include stashes (default: true)', true)
  .option('--no-stashes', 'Exclude stashes')
  .option('--only-stashes', 'Show ONLY stashes')
  .option('--status', 'Include working tree status (default: true)', true)
  .option('--no-status', 'Exclude working tree status')
  .option('--only-status', 'Show ONLY working tree status');

// Presentation & Styling
program
  .option('-l, --layout <mode>', 'Layout mode: compact, normal, expanded', 'normal')
  .option('-f, --format <format>', 'Output format: terminal, markdown, json', 'terminal')
  .option('-d, --date <style>', 'Date style: relative, iso, short', 'relative')
  .option('-s, --style <style>', 'Tree line style: curved, straight, ascii', 'curved')
  .option('--color <mode>', 'Color output mode: auto, always, never', 'auto')
  .option('-t, --theme <theme>', 'Color theme: tokyo, catppuccin, nord, mono', 'tokyo')
  .option('--no-author', 'Hide author column')
  .option('--no-date', 'Hide date column')
  .option('--no-hash', 'Hide commit hash column')
  .option('--hash-len <len>', 'Short commit hash length', (v) => parseInt(v, 10), 7)
  .option('-w, --width <columns>', 'Target table width in characters (default: 120)', (v) => parseInt(v, 10), 120);

// Discovery helper for AI
program.option('--explain-flags', 'Output machine-readable JSON schema of all flags for AI');

// Skill installation command
program
  .command('install-skill [target]')
  .description('Install bundled AI skill for Antigravity, Claude, Cursor, or global configs')
  .action(async (target?: string) => {
    try {
      const validTargets: SkillTarget[] = ['antigravity', 'claude', 'cursor', 'global', 'auto'];
      const resolvedTarget = (target && validTargets.includes(target as SkillTarget)
        ? target
        : 'auto') as SkillTarget;

      const installed = await installSkill(resolvedTarget);
      if (installed.length > 0) {
        console.log('✓ Successfully installed git-tree AI skill to:');
        for (const p of installed) {
          console.log(`  - ${p}`);
        }
      } else {
        console.warn('! No matching AI configuration directories found to install skill.');
      }
    } catch (err: unknown) {
      console.error('Failed to install skill:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.action(async (cliOpts) => {
  // If AI requested machine-readable flag schema
  if (cliOpts.explainFlags) {
    const flagsSchema = {
      name: 'git-tree',
      description: 'AI-first, visually stunning Git tree CLI tool',
      flags: {
        scoping: {
          '--all': 'Show all branches (default: true)',
          '--current': 'Show only commits reachable from current HEAD',
          '--branches <list>': 'Comma-separated list of branches to display',
          '--no-remotes': 'Exclude remote tracking branches',
          '--no-tags': 'Exclude tags',
        },
        filtering: {
          '-n, --max-count <N>': 'Limit commit count',
          '--since <date>': 'Show commits newer than date',
          '--until <date>': 'Show commits older than date',
          '--author <pattern>': 'Filter commits by author regex',
          '--grep <pattern>': 'Filter commits by subject regex',
        },
        entityToggles: {
          '--merges / --no-merges / --only-merges': 'Control merge commits',
          '--stashes / --no-stashes / --only-stashes': 'Control git stashes',
          '--status / --no-status / --only-status': 'Control dirty worktree status',
        },
        presentation: {
          '--format <terminal|markdown|json>': 'Output format (use markdown for AI chat)',
          '--layout <compact|normal|expanded>': 'Density mode',
          '--date <relative|iso|short>': 'Timestamp format',
          '--style <curved|straight|ascii>': 'Line art style',
          '--theme <tokyo|catppuccin|nord|mono>': 'Color palette',
        },
      },
    };
    console.log(JSON.stringify(flagsSchema, null, 2));
    return;
  }

  // Resolve entity toggles
  const resolveEntity = (onlyFlag?: boolean, boolFlag?: boolean): EntityFilter => {
    if (onlyFlag) return 'only';
    if (boolFlag === false) return 'exclude';
    return 'include';
  };

  const merges = resolveEntity(cliOpts.onlyMerges, cliOpts.merges);
  const stashes = resolveEntity(cliOpts.onlyStashes, cliOpts.stashes);
  const status = resolveEntity(cliOpts.onlyStatus, cliOpts.status);

  const branches = cliOpts.branches
    ? (cliOpts.branches as string).split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const options: TreeCliOptions = {
    all: cliOpts.all,
    current: cliOpts.current,
    branches,
    remotes: cliOpts.remotes,
    tags: cliOpts.tags,

    maxCount: cliOpts.maxCount,
    since: cliOpts.since,
    until: cliOpts.until,
    author: typeof cliOpts.author === 'string' ? cliOpts.author : undefined,
    grep: cliOpts.grep,

    merges,
    stashes,
    status,

    layout: cliOpts.layout as LayoutMode,
    format: cliOpts.format as OutputFormat,
    date: cliOpts.date as DateStyle,
    style: cliOpts.style as LineStyle,
    color: cliOpts.color as ColorMode,
    theme: cliOpts.theme as ColorTheme,

    showAuthor: cliOpts.author !== false,
    showDate: cliOpts.date !== false,
    showHash: cliOpts.hash !== false,
    hashLen: cliOpts.hashLen || 7,
    width: cliOpts.width ? parseInt(cliOpts.width, 10) : 120,
  };

  try {
    const output = await generateGitTree(options);
    console.log(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  }
});

const userArgs = process.argv.slice(2);
const normalizedArgs: string[] = [];

for (const arg of userArgs) {
  const match = arg.match(/^-(\d+)$/);
  if (match) {
    normalizedArgs.push('-n', match[1]);
  } else {
    normalizedArgs.push(arg);
  }
}

program.parse(normalizedArgs, { from: 'user' });
