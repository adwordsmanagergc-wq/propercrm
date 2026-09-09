import { createClient } from '@/lib/supabase/client';
import { STORE_QUEUE, getAll, isSupported, put, remove } from '@/lib/offline/db';
import type { PhotoKind, SkipReason } from '@/lib/types/database';

/**
 * The outbound queue. Everything a cleaner does on a job is written here first
 * and pushed when there is signal, so a dead spot never loses their work.
 *
 * Order matters: photos must land before the completion that depends on them,
 * so the queue is drained oldest-first and stops at the first failure.
 */
export type QueuedOp =
  | { kind: 'start'; jobId: string; lat: number | null; lng: number | null }
  | {
      kind: 'photo';
      jobId: string;
      companyId: string;
      photoKind: PhotoKind;
      blob: Blob;
      filename: string;
      lat: number | null;
      lng: number | null;
      takenAt: string;
    }
  | {
      kind: 'complete';
      jobId: string;
      lat: number | null;
      lng: number | null;
      notes: string | null;
    }
  | { kind: 'skip'; jobId: string; reason: SkipReason; notes: string | null };

export interface QueueEntry {
  id: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  op: QueuedOp;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(op: QueuedOp): Promise<QueueEntry> {
  const entry: QueueEntry = { id: newId(), createdAt: Date.now(), attempts: 0, op };
  if (isSupported()) await put(STORE_QUEUE, entry);
  await requestBackgroundSync();
  return entry;
}

export async function pending(): Promise<QueueEntry[]> {
  if (!isSupported()) return [];
  const entries = await getAll<QueueEntry>(STORE_QUEUE);
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

/** Everything still queued for one job, oldest first. */
export async function pendingForJob(jobId: string): Promise<QueueEntry[]> {
  return (await pending()).filter((entry) => entry.op.jobId === jobId);
}

/** Jobs, not operations — "3 jobs waiting to sync" reads better than "7 items". */
export async function pendingJobCount(): Promise<number> {
  const entries = await pending();
  return new Set(entries.map((entry) => entry.op.jobId)).size;
}

async function requestBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const sync = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;
    await sync?.register('proper-crm-sync');
  } catch {
    // Background Sync is Chromium-only. Everywhere else we drain on
    // `online` / visibilitychange instead, which is handled by SyncProvider.
  }
}

async function send(entry: QueueEntry): Promise<void> {
  const supabase = createClient();
  const { op } = entry;

  if (op.kind === 'start') {
    const { error } = await supabase.rpc('start_job', {
      p_job: op.jobId,
      p_lat: op.lat,
      p_lng: op.lng,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (op.kind === 'photo') {
    const path = `${op.companyId}/${op.jobId}/${op.filename}`;
    const { error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(path, op.blob, { contentType: 'image/jpeg', upsert: true });
    // A replayed upload of a file already there is a success, not a failure.
    if (uploadError && !/exists/i.test(uploadError.message)) throw new Error(uploadError.message);

    const { error } = await supabase.rpc('add_job_photo', {
      p_job: op.jobId,
      p_kind: op.photoKind,
      p_path: path,
      p_lat: op.lat,
      p_lng: op.lng,
      p_taken_at: op.takenAt,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (op.kind === 'complete') {
    const { error } = await supabase.rpc('complete_job', {
      p_job: op.jobId,
      p_lat: op.lat,
      p_lng: op.lng,
      p_notes: op.notes,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.rpc('skip_job', {
    p_job: op.jobId,
    p_reason: op.reason,
    p_notes: op.notes,
  });
  if (error) throw new Error(error.message);
}

export interface DrainResult {
  sent: number;
  remaining: number;
  error?: string;
}

/**
 * Pushes the queue oldest-first, stopping at the first failure so a photo can
 * never overtake the completion it belongs to. An operation the server rejects
 * outright (rather than a network failure) is dropped after five attempts,
 * otherwise it would block the queue for ever.
 */
export async function drain(): Promise<DrainResult> {
  if (!isSupported()) return { sent: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: (await pending()).length };
  }

  const entries = await pending();
  let sent = 0;

  for (const entry of entries) {
    try {
      await send(entry);
      await remove(STORE_QUEUE, entry.id);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sync';
      const attempts = entry.attempts + 1;

      if (attempts >= 5) {
        await remove(STORE_QUEUE, entry.id);
        return { sent, remaining: (await pending()).length, error: message };
      }

      await put(STORE_QUEUE, { ...entry, attempts, lastError: message });
      return { sent, remaining: (await pending()).length, error: message };
    }
  }

  return { sent, remaining: 0 };
}
