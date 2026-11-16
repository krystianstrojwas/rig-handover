import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// A temp runs dir: runs/ is read-only fixtures.
let runsDir: string;
const app = () => createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir });

const line = (o: object) => JSON.stringify(o);

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(runsDir, '2026-11-01.jsonl'),
    [
      line({ at: '2026-11-01T01:00:00+01:00', job: 'b/job', status: 'retry', owner: 'rook', error: 'e1' }),
      line({ at: '2026-11-01T01:01:00+01:00', job: 'b/job', status: 'retry', owner: 'rook', error: 'e2' }),
      line({ at: '2026-11-01T01:02:00+01:00', job: 'b/job', status: 'retry', owner: 'rook', error: 'e3' }),
      line({ at: '2026-11-01T02:00:00+01:00', job: 'a/job', status: 'fail', owner: null, error: 'boom' }),
      '{"at":"2026-11-01T03:00:00+01:00","job":"c/jo',
    ].join('\n') + '\n',
  );
  writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');
});

afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('200 with the rows sorted by job, retries >= 3 and fail marked, null owner as —', async () => {
    const res = await app().request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('<td class="warn">3 !</td>');
    expect(html).toContain('<td class="warn">fail !</td>');
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('1 line in the log didn&#39;t parse');
  });

  it('404 for a night with no file', async () => {
    expect((await app().request('/digest/2026-11-09')).status).toBe(404);
  });

  it('an empty night renders "nothing ran"', async () => {
    const res = await app().request('/digest/2026-11-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with the same jobs in the same order as the page, bad line counted', async () => {
    const res = await app().request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['a/job', 'b/job']);
    expect(body.rows[0]).toMatchObject({ owner: null, lastStatus: 'fail', lastError: 'boom' });
    expect(body.rows[1]).toMatchObject({ runs: 3, retries: 3, lastError: 'e3' });

    const html = await (await app().request('/digest/2026-11-01')).text();
    const pageJobs = [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(pageJobs).toEqual(body.rows.map((r: { job: string }) => r.job));
  });

  it('404 for a night with no file', async () => {
    expect((await app().request('/api/digest/2026-11-09')).status).toBe(404);
  });

  it('an empty night has no rows', async () => {
    expect(await (await app().request('/api/digest/2026-11-02')).json()).toEqual({
      night: '2026-11-02',
      rows: [],
      badLines: 0,
    });
  });
});

describe('status board', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await app().request('/')).text();
    expect(html).toContain('href="/digest/2026-11-01"');
    expect(html).toContain('href="/digest/2026-11-02"');
    expect(html).toContain('fail 1');
  });
});
