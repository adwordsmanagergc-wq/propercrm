import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nextOccurrence, toISODate } from '@/lib/recurrence';
import type { Frequency } from '@/lib/types/database';

/**
 * Boots a throwaway Postgres, applies every migration and seed, then runs the
 * RLS isolation suite in supabase/tests/rls_test.sql.
 *
 * Skipped when Postgres is not installed locally — the same script runs in CI,
 * where it is not optional.
 */
function findInitdb(): boolean {
  const candidates: string[] = [];
  if (process.env.PGBIN) candidates.push(join(process.env.PGBIN, 'initdb'));

  for (const dir of ['/usr/lib/postgresql', '/usr/local/pgsql', '/opt/homebrew/opt']) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      candidates.push(join(dir, entry, 'bin', 'initdb'));
    }
  }
  candidates.push('/usr/local/bin/initdb', '/opt/homebrew/bin/initdb', '/usr/bin/initdb');

  return candidates.some((candidate) => existsSync(candidate));
}

const hasPostgres = findInitdb();

describe.skipIf(!hasPostgres)('database', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'propercrm-vectors-'));
  const vectorsPath = join(workdir, 'vectors.csv');
  let output = '';

  it('applies every migration and passes the RLS isolation suite', () => {
    // psql's RAISE NOTICE goes to stderr, so fold both streams together.
    output = execFileSync('sh', ['-c', './supabase/tests/run.sh 2>&1'], {
      encoding: 'utf8',
      env: { ...process.env, VECTORS_OUT: vectorsPath },
      timeout: 300_000,
    });
    expect(output).toContain('All RLS isolation tests passed');
    expect(output).toContain('all database tests passed');
  }, 300_000);

  it('keeps the TypeScript recurrence in step with the SQL one', () => {
    const unquote = (value: string) => value.replace(/^"(.*)"$/, '$1');
    const csv = readFileSync(vectorsPath, 'utf8').trim().split('\n');
    const rows = csv.slice(1).map((line) => line.split(',').map(unquote));
    expect(rows.length).toBeGreaterThan(1000);

    const mismatches: string[] = [];
    for (const [from, frequency, anchor, workingDays, expected] of rows) {
      const days = (workingDays ?? '').split(' ').filter(Boolean).map(Number);
      const actual = nextOccurrence(from!, frequency as Frequency, anchor!, days);
      const actualIso = actual ? toISODate(actual) : '';
      if (actualIso !== (expected ?? '')) {
        mismatches.push(
          `${from} ${frequency} anchor=${anchor} days=[${days}] → SQL ${expected || 'null'} / TS ${actualIso || 'null'}`,
        );
      }
    }

    expect(mismatches.slice(0, 5)).toEqual([]);
    rmSync(workdir, { recursive: true, force: true });
  });
});
