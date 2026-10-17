'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocalPhotoStrip, PhotoCapture } from '@/components/cleaner/PhotoCapture';
import { useSync } from '@/components/cleaner/SyncProvider';
import { useDevicePlatform } from '@/components/cleaner/JobCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Notice, Textarea } from '@/components/ui/Field';
import { CheckIcon, DogIcon, KeyIcon, PinIcon } from '@/components/ui/Icons';
import { SKIP_REASON_LABELS } from '@/components/ui/Pill';
import { photoFilename, currentPosition } from '@/lib/image';
import { directionsUrl } from '@/lib/maps';
import { pendingForJob, type QueueEntry } from '@/lib/offline/queue';
import type { MyJobRow, PhotoKind, SkipReason } from '@/lib/types/database';

const SKIP_REASONS: SkipReason[] = [
  'no_access',
  'dog_on_site',
  'customer_cancelled',
  'weather',
  'other',
];

/**
 * The job screen. Start, photograph, finish — in that order, with the finish
 * button locked until there is a before and an after shot.
 *
 * Everything is written to the local queue first and pushed when there is
 * signal, so this whole screen works stood in a back garden with no bars. The
 * counts below add what is already on the server to what is still queued on
 * this phone, which is what keeps the rule honest offline.
 */
export function JobFlow({ job }: { job: MyJobRow }) {
  const router = useRouter();
  const { queue, revision, online } = useSync();
  const [queued, setQueued] = useState<QueueEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const platform = useDevicePlatform();

  useEffect(() => {
    let cancelled = false;
    void pendingForJob(job.id).then((entries) => {
      if (!cancelled) setQueued(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [job.id, revision]);

  const queuedPhotos = useMemo(
    () => queued.flatMap((entry) => (entry.op.kind === 'photo' ? [entry.op] : [])),
    [queued],
  );

  const count = useCallback(
    (kind: PhotoKind) => {
      const onServer =
        kind === 'before'
          ? job.before_photos
          : kind === 'after'
            ? job.after_photos
            : job.issue_photos;
      return Number(onServer) + queuedPhotos.filter((photo) => photo.photoKind === kind).length;
    },
    [job.before_photos, job.after_photos, job.issue_photos, queuedPhotos],
  );

  const beforeCount = count('before');
  const afterCount = count('after');
  const issueCount = count('issue');

  const startQueued = queued.some((entry) => entry.op.kind === 'start');
  const finishQueued = queued.some(
    (entry) => entry.op.kind === 'complete' || entry.op.kind === 'skip',
  );

  const status = finishQueued
    ? queued.some((entry) => entry.op.kind === 'skip')
      ? 'skipped'
      : 'completed'
    : startQueued && job.status === 'scheduled'
      ? 'in_progress'
      : job.status;

  const started = status === 'in_progress' || status === 'completed' || status === 'skipped';
  const finished = status === 'completed' || status === 'skipped';
  const canComplete = beforeCount > 0 && afterCount > 0;

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    await run(async () => {
      const position = await currentPosition();
      await queue({
        kind: 'start',
        jobId: job.id,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
      });
    });
  }

  async function addPhoto(kind: PhotoKind, blob: Blob, takenAt: string) {
    const position = await currentPosition(4000);
    await queue({
      kind: 'photo',
      jobId: job.id,
      companyId: job.company_id,
      photoKind: kind,
      blob,
      filename: photoFilename(kind, takenAt),
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      takenAt,
    });
  }

  async function complete() {
    await run(async () => {
      const position = await currentPosition();
      await queue({
        kind: 'complete',
        jobId: job.id,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      router.push('/app');
    });
  }

  async function skip(reason: SkipReason) {
    setSkipOpen(false);
    await run(async () => {
      await queue({
        kind: 'skip',
        jobId: job.id,
        reason,
        notes: notes.trim() === '' ? null : notes.trim(),
      });
      router.push('/app');
    });
  }

  const address = {
    lat: job.lat,
    lng: job.lng,
    address_line1: job.address_line1,
    city: job.city,
    postcode: job.postcode,
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------ the address */}
      <section className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
        <p className="text-xl font-semibold">{job.customer_first_name}</p>
        <a
          href={directionsUrl(address, platform)}
          className="mt-1 flex items-start gap-2 text-lg text-blue-700"
        >
          <PinIcon className="mt-1 h-5 w-5 shrink-0" />
          <span>
            {job.address_line1}
            {job.address_line2 ? <>, {job.address_line2}</> : null}
            <br />
            <span className="font-semibold uppercase">{job.postcode}</span>
          </span>
        </a>
        <a
          href={directionsUrl(address, platform)}
          className="mt-3 flex h-12 items-center justify-center rounded-btn border border-blue-200 bg-white text-base font-semibold text-blue-700"
        >
          Directions
        </a>
      </section>

      {/* ------------------------------------------------------ getting in */}
      {job.access_notes || job.gate_code || job.dog_on_site ? (
        <section className="rounded-card border border-blue-200 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Getting in</h2>
          {job.access_notes ? <p className="mt-1.5 text-base">{job.access_notes}</p> : null}
          <div className="mt-2 flex flex-wrap gap-3 text-base font-semibold text-blue-900">
            {job.gate_code ? (
              <span className="inline-flex items-center gap-1.5">
                <KeyIcon className="h-5 w-5" /> Code {job.gate_code}
              </span>
            ) : null}
            {job.dog_on_site ? (
              <span className="inline-flex items-center gap-1.5">
                <DogIcon className="h-5 w-5" /> Dog on site
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {job.instructions ? (
        <section className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-grey-500">What to do</h2>
          <p className="mt-1.5 text-base">{job.instructions}</p>
        </section>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {!online ? (
        <Notice tone="info">No signal. Carry on — everything saves on this phone.</Notice>
      ) : null}

      {/* ----------------------------------------------------- the job flow */}
      {finished ? (
        <section className="rounded-card border border-success/30 bg-white p-5 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-success text-white">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="mt-3 text-lg font-semibold">
            {status === 'completed' ? 'Job done' : 'Marked as missed'}
          </p>
          <p className="mt-1 text-grey-500">
            {online ? 'Sent to the office.' : 'It will go to the office when you get signal.'}
          </p>
        </section>
      ) : !started ? (
        <Button size="xl" disabled={busy} onClick={() => void start()}>
          {busy ? 'Starting…' : 'Start job'}
        </Button>
      ) : (
        <>
          <section className="space-y-3 rounded-card border border-grey-200 bg-white p-4 shadow-card">
            <PhotoStep
              title="Before photos"
              count={beforeCount}
              required
              hint="Take at least one before you start."
            >
              <PhotoCapture
                kind="before"
                label={beforeCount > 0 ? 'Another before photo' : 'Take before photo'}
                onCaptured={({ blob, takenAt }) => addPhoto('before', blob, takenAt)}
              />
              <LocalPhotoStrip
                blobs={queuedPhotos.filter((p) => p.photoKind === 'before').map((p) => p.blob)}
              />
            </PhotoStep>

            <PhotoStep
              title="After photos"
              count={afterCount}
              required
              hint="Take at least one when the glass is clean."
            >
              <PhotoCapture
                kind="after"
                label={afterCount > 0 ? 'Another after photo' : 'Take after photo'}
                onCaptured={({ blob, takenAt }) => addPhoto('after', blob, takenAt)}
              />
              <LocalPhotoStrip
                blobs={queuedPhotos.filter((p) => p.photoKind === 'after').map((p) => p.blob)}
              />
            </PhotoStep>

            <PhotoStep
              title="Problem"
              count={issueCount}
              hint="Broken pane, blocked access, anything odd."
            >
              <PhotoCapture
                kind="issue"
                label="Photograph a problem"
                onCaptured={({ blob, takenAt }) => addPhoto('issue', blob, takenAt)}
              />
              <LocalPhotoStrip
                blobs={queuedPhotos.filter((p) => p.photoKind === 'issue').map((p) => p.blob)}
              />
            </PhotoStep>
          </section>

          <section className="rounded-card border border-grey-200 bg-white p-4 shadow-card">
            <label htmlFor="job-notes" className="text-sm font-semibold text-grey-500">
              Note for the office
            </label>
            <Textarea
              id="job-notes"
              className="mt-2"
              placeholder="Anything they should know…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </section>

          <div className="space-y-3">
            <Button
              size="xl"
              variant="success"
              disabled={busy || !canComplete}
              onClick={() => void complete()}
            >
              {busy ? 'Saving…' : 'Complete job'}
            </Button>
            {!canComplete ? (
              <p className="text-center text-base font-medium text-grey-500">
                {beforeCount === 0 && afterCount === 0
                  ? 'Take a before photo and an after photo to finish.'
                  : beforeCount === 0
                    ? 'Still need a before photo.'
                    : 'Still need an after photo.'}
              </p>
            ) : null}

            <Button
              size="lg"
              variant="danger"
              className="w-full"
              disabled={busy}
              onClick={() => setSkipOpen(true)}
            >
              Can&rsquo;t complete
            </Button>
          </div>
        </>
      )}

      <Modal
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        title="Why can't you do it?"
        description="The office will be told straight away."
      >
        <div className="space-y-2.5">
          {SKIP_REASONS.map((reason) => (
            <Button
              key={reason}
              variant="secondary"
              size="lg"
              className="w-full justify-start"
              onClick={() => void skip(reason)}
            >
              {SKIP_REASON_LABELS[reason]}
            </Button>
          ))}
          <Button variant="ghost" size="lg" className="w-full" onClick={() => setSkipOpen(false)}>
            Go back
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PhotoStep({
  title,
  count,
  required,
  hint,
  children,
}: {
  title: string;
  count: number;
  required?: boolean;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {title}
          {required ? <span className="ml-1.5 text-danger">*</span> : null}
        </h2>
        <span
          className={
            count > 0
              ? 'inline-flex items-center gap-1 rounded-pill border border-success/30 px-2.5 py-1 text-xs font-semibold text-success'
              : 'rounded-pill border border-grey-200 px-2.5 py-1 text-xs font-semibold text-grey-500'
          }
        >
          {count > 0 ? `${count} taken` : 'None yet'}
        </span>
      </div>
      <p className="mb-2 text-sm text-grey-500">{hint}</p>
      {children}
    </div>
  );
}
