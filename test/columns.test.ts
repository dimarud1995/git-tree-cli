import { describe, it, expect } from 'vitest';
import { resolveColumns, normalizeColumnName } from '../src/utils/columns.js';

describe('Columns Resolver', () => {
  it('normalizes common column aliases', () => {
    expect(normalizeColumnName('tree')).toBe('graph');
    expect(normalizeColumnName('graph')).toBe('graph');
    expect(normalizeColumnName('id')).toBe('hash');
    expect(normalizeColumnName('commit')).toBe('hash');
    expect(normalizeColumnName('time')).toBe('date');
    expect(normalizeColumnName('timestamp')).toBe('date');
    expect(normalizeColumnName('subject')).toBe('title');
    expect(normalizeColumnName('name')).toBe('title');
    expect(normalizeColumnName('message')).toBe('title');
    expect(normalizeColumnName('body')).toBe('description');
    expect(normalizeColumnName('desc')).toBe('description');
    expect(normalizeColumnName('user')).toBe('author');
  });

  it('provides default column set: graph, hash, date, title, author on, description off', () => {
    const cols = resolveColumns({});
    expect(cols).toEqual({
      showGraph: true,
      showHash: true,
      showDate: true,
      showTitle: true,
      showDescription: false,
      showAuthor: true,
    });
  });

  it('disables skipped columns via skipColumns array or string', () => {
    const cols1 = resolveColumns({ skipColumns: ['graph', 'author'] });
    expect(cols1.showGraph).toBe(false);
    expect(cols1.showAuthor).toBe(false);
    expect(cols1.showHash).toBe(true);
    expect(cols1.showTitle).toBe(true);

    const cols2 = resolveColumns({ skipColumns: ['tree', 'date'] });
    expect(cols2.showGraph).toBe(false);
    expect(cols2.showDate).toBe(false);
    expect(cols2.showHash).toBe(true);
  });

  it('enables only specified columns via columns whitelist', () => {
    const cols = resolveColumns({ columns: ['title', 'author'] });
    expect(cols).toEqual({
      showGraph: false,
      showHash: false,
      showDate: false,
      showTitle: true,
      showDescription: false,
      showAuthor: true,
    });
  });

  it('supports enabling description body', () => {
    const cols = resolveColumns({ showDescription: true });
    expect(cols.showDescription).toBe(true);
    expect(cols.showTitle).toBe(true);

    const colsWithWhitelist = resolveColumns({ columns: ['hash', 'title', 'body'] });
    expect(colsWithWhitelist.showHash).toBe(true);
    expect(colsWithWhitelist.showTitle).toBe(true);
    expect(colsWithWhitelist.showDescription).toBe(true);
    expect(colsWithWhitelist.showGraph).toBe(false);
    expect(colsWithWhitelist.showAuthor).toBe(false);
  });
});
