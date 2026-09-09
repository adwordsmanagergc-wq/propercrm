import { STORE_CACHE, get, isSupported, put } from '@/lib/offline/db';
import type { MyJobRow } from '@/lib/types/database';

/**
 * Today's round, kept on the phone. The cleaner app renders from the server on
 * a good connection and from here when there is nothing; either way the
 * addresses, access notes and gate codes are always to hand.
 */
interface CacheRecord<T> {
  key: string;
  savedAt: number;
  value: T;
}

const JOBS_KEY = 'my-jobs';

export async function cacheJobs(jobs: MyJobRow[]): Promise<void> {
  if (!isSupported()) return;
  await put<CacheRecord<MyJobRow[]>>(STORE_CACHE, {
    key: JOBS_KEY,
    savedAt: Date.now(),
    value: jobs,
  });
}

export async function readCachedJobs(): Promise<{ jobs: MyJobRow[]; savedAt: number } | null> {
  if (!isSupported()) return null;
  const record = await get<CacheRecord<MyJobRow[]>>(STORE_CACHE, JOBS_KEY);
  if (!record) return null;
  return { jobs: record.value, savedAt: record.savedAt };
}
