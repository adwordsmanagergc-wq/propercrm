import { STORE_CACHE, clear, get, isSupported, put } from '@/lib/offline/db';
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

/**
 * Wipes the round cached on this phone and the pages the service worker kept.
 * Called on sign-out: a shared van phone must not hand the next person the
 * previous cleaner's customer list, offline or not.
 *
 * The outbound queue is deliberately left alone — it holds work that has not
 * reached the office yet, and losing it is the one thing this app must never do.
 */
export async function clearOfflineData(): Promise<void> {
  if (isSupported()) {
    try {
      await clear(STORE_CACHE);
    } catch {
      // A locked database must not stop someone signing out.
    }
  }

  try {
    const registration = await navigator.serviceWorker?.ready;
    registration?.active?.postMessage({ type: 'proper-crm:clear-data' });
  } catch {
    // No service worker: nothing cached to clear.
  }
}
