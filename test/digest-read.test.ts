import { describe, expect, it } from 'vitest';
import { foldNight, readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const byJob = Object.fromEntries(n.rows.map((r) => [r.job, r]));
    expect(byJob['fixtures/refresh']).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['notes/backup']).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded', runs: 1 });
    expect(byJob['digest/render']).toMatchObject({ owner: null, lastError: null });
    expect(byJob['lane/sync']).toMatchObject({ runs: 8, retries: 1, firstAt: '2026-10-28T23:00:06+01:00' });
  });

  it('returns null for a night with no file or a non-date night', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('an empty night has no rows', () => {
    expect(foldNight('x', '')).toEqual({ night: 'x', rows: [], badLines: 0 });
    expect(foldNight('x', '\n\n')).toEqual({ night: 'x', rows: [], badLines: 0 });
  });

  it('counts lines of the wrong shape as bad, never throws', () => {
    const text = ['[]', '{"at":"t","job":"j","status":"maybe","owner":null}', 'null', '{"job":"j"}'].join('\n');
    expect(foldNight('x', text)).toEqual({ night: 'x', rows: [], badLines: 4 });
  });
});
