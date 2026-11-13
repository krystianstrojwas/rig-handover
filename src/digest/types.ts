// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One job of one night, folded from all its lines in the run log. */
export type DigestRow = {
  job: string;
  /** Owner on the job's last line; `null` is kept (rendered as `—`). */
  owner: string | null;
  /** Lines for this job, whatever their status. */
  runs: number;
  /** Lines with status `retry`. */
  retries: number;
  lastStatus: RunStatus;
  /** Most recent `error` seen for this job, `null` if none. */
  lastError: string | null;
  /** `at` of the first and last line, as written in the log (offset kept). */
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  /** Sorted by job. Empty for an empty file. */
  rows: DigestRow[];
  /** Lines that didn't parse or didn't match the shape: counted, never thrown. */
  badLines: number;
};

/** `null` when `runs/<night>.jsonl` doesn't exist (or `night` isn't a YYYY-MM-DD date). */
export type ReadNight = (runsDir: string, night: string) => Night | null;
