import type { Night, RunStatus } from './types.js';

export type NightCounts = Record<RunStatus, number>;

/** Jobs of a night by their last status: what the board shows beside each night's link. */
export function countByLastStatus(night: Night): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const r of night.rows) counts[r.lastStatus]++;
  return counts;
}
