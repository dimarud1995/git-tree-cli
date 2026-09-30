import { Command } from 'commander';
import { generateGitTree } from './index.js';
import {
  ColorMode,
  ColorTheme,
  DateStyle,
  EntityFilter,
  LayoutMode,
  LinesMode,
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
  .option('--author <pattern>', 'Filter commits matching author name or email pattern (comma-separated for multiple)')
  .option('--email <pattern>', 'Filter commits matching author email pattern (comma-separated for multiple)')
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
  .option('--lines <mode>', 'Graph lines mode: portal (default, clean portals for distant branches), full (continuous vertical lines)', 'portal')
  .option('--full-lines', 'Show full continuous vertical lines without portals')
  .option('-l, --layout <mode>', 'Layout mode: compact, normal, expanded', 'normal')
  .option('-f, --format <format>', 'Output format: terminal, markdown, json', 'terminal')
  .option('-d, --date <style>', 'Date style: relative, iso, short', 'relative')
  .option('-s, --style <style>', 'Tree line style: curved, straight, ascii', 'curved')
  .option('--color <mode>', 'Color output mode: auto, always, never', 'auto')
  .option('-t, --theme <theme>', 'Color theme: tokyo, catppuccin, nord, mono', 'tokyo')
  .option('--columns <cols>', 'Comma-separated list of columns to show: graph,hash,date,title,description,author')
  .option('--skip-columns, --hide-columns <cols>', 'Comma-separated list of columns to skip/hide')
  .option('--no-graph', 'Hide graph tree column')
  .option('--hide-graph', 'Hide graph tree column')
  .option('--no-hash', 'Hide commit hash column')
  .option('--hide-hash', 'Hide commit hash column')
  .option('--no-date', 'Hide date under commit hash')
  .option('--hide-date', 'Hide date under commit hash')
  .option('--no-title', 'Hide commit title column')
  .option('--hide-title', 'Hide commit title column')
  .option('--no-author', 'Hide author column')
  .option('--hide-author', 'Hide author column')
  .option('--header', 'Show repository header (default: true)')
  .option('--no-header', 'Hide repository header')
  .option('--hide-header', 'Hide repository header')
  .option('--repo-name <name>', 'Override repository display name in header')
  .option('--description, --show-description, --body', 'Show commit message body description (default: false, only titles shown)')
  .option('--hash-len <len>', 'Short commit hash length', (v) => parseInt(v, 10), 7)
  .option('-w, --width <columns>', 'Target table width in characters (auto-detected in TTY, default: 120)', (v) => parseInt(v, 10));

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
          '-<N>, -n, --limit, --max-count <N>': 'Limit commit count (e.g. -10, -n 20, --limit 50)',
          '--since <date>': 'Show commits newer than date',
          '--until <date>': 'Show commits older than date',
          '--author <pattern>': 'Filter commits by author regex (comma-separated for multiple)',
          '--email <pattern>': 'Filter commits by author email (comma-separated for multiple)',
          '--grep <pattern>': 'Filter commits by subject regex',
        },
        entityToggles: {
          '--merges / --no-merges / --only-merges': 'Control merge commits',
          '--stashes / --no-stashes / --only-stashes': 'Control git stashes',
          '--status / --no-status / --only-status': 'Control dirty worktree status',
        },
        presentation: {
          '--lines <portal|full>': 'Graph lines mode: portal (default, clean portals for distant branches), full (continuous vertical lines)',
          '--full-lines': 'Shortcut for --lines full (legacy continuous graph lines)',
          '--columns <list>': 'Show only specified columns: graph,hash,date,title,description,author',
          '--skip-columns, --hide-columns <list>': 'Skip specific columns (e.g. --skip-columns graph,author)',
          '--no-graph, --hide-graph': 'Hide graph tree column',
          '--no-hash, --hide-hash': 'Hide commit hash column',
          '--no-date, --hide-date': 'Hide date under commit hash',
          '--no-title, --hide-title': 'Hide commit title/message column',
          '--no-author, --hide-author': 'Hide author column',
          '--header / --no-header / --hide-header': 'Show/hide repository header banner with repo name, branch, and commit count',
          '--repo-name <name>': 'Override repository display name in header',
          '--description, --body': 'Show commit message body description (default: false, only titles shown)',
          '--format <terminal|markdown|json>': 'Output format (use markdown for AI chat)',
          '--layout <compact|normal|expanded>': 'Density mode',
          '--date <relative|iso|short>': 'Timestamp format',
          '--style <curved|straight|ascii>': 'Line art style',
          '--theme <tokyo|catppuccin|nord|mono>': 'Color palette',
          '-w, --width <columns>': 'Target table width (auto-detected in TTY, default 120)',
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
    email: typeof cliOpts.email === 'string' ? cliOpts.email : undefined,
    grep: cliOpts.grep,

    merges,
    stashes,
    status,

    lines: cliOpts.fullLines ? 'full' : (cliOpts.lines as LinesMode) || 'portal',
    layout: cliOpts.layout as LayoutMode,
    format: cliOpts.format as OutputFormat,
    date: cliOpts.date as DateStyle,
    style: cliOpts.style as LineStyle,
    color: cliOpts.color as ColorMode,
    theme: cliOpts.theme as ColorTheme,

    columns: cliOpts.columns
      ? (cliOpts.columns as string).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    skipColumns: (cliOpts.skipColumns || cliOpts.hideColumns)
      ? ((cliOpts.skipColumns || cliOpts.hideColumns) as string).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    showGraph: cliOpts.graph === false || cliOpts.hideGraph ? false : undefined,
    showHash: cliOpts.hash === false || cliOpts.hideHash ? false : undefined,
    showDate: cliOpts.date === false || cliOpts.hideDate ? false : undefined,
    showTitle: cliOpts.title === false || cliOpts.hideTitle ? false : undefined,
    showAuthor: cliOpts.hideAuthor ? false : cliOpts.author !== false,
    showHeader: cliOpts.header === false || cliOpts.hideHeader ? false : true,
    repoName: typeof cliOpts.repoName === 'string' ? cliOpts.repoName : undefined,
    showDescription: Boolean(cliOpts.description || cliOpts.showDescription || cliOpts.body),
    hashLen: cliOpts.hashLen || 7,
    width: typeof cliOpts.width === 'number' && !isNaN(cliOpts.width)
      ? cliOpts.width
      : process.stdout.isTTY && process.stdout.columns
        ? Math.max(60, process.stdout.columns)
        : 120,
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
