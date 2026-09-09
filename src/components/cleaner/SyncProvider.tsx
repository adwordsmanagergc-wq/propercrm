'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { drain, pendingJobCount, type QueuedOp, enqueue } from '@/lib/offline/queue';

interface SyncContextValue {
  waiting: number;
  online: boolean;
  syncing: boolean;
  lastError: string | null;
  /** Bumped whenever the queue changes, so screens can re-read it. */
  revision: number;
  queue: (op: QueuedOp) => Promise<void>;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncProvider>');
  return context;
}

/**
 * Owns the outbound queue for the whole cleaner app. Drains when the signal
 * comes back, when the app is brought to the front, and when the service
 * worker's Background Sync fires.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    setWaiting(await pendingJobCount());
    setRevision((current) => current + 1);
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await drain();
      setLastError(result.error ?? null);
      await refresh();
      if (result.sent > 0) router.refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh, router, syncing]);

  const queue = useCallback(
    async (op: QueuedOp) => {
      await enqueue(op);
      await refresh();
      void sync();
    },
    [refresh, sync],
  );

  useEffect(() => {
    setOnline(navigator.onLine);
    void refresh();
    void sync();

    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'proper-crm:drain-queue') void sync();
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
    // Mount only: `sync` is stable enough and re-subscribing on every change
    // would tear the listeners down mid-upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ waiting, online, syncing, lastError, revision, queue, sync }),
    [waiting, online, syncing, lastError, revision, queue, sync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
