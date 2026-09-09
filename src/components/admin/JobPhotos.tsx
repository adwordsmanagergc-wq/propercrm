/* eslint-disable @next/next/no-img-element */
import type { JobView } from '@/lib/db/views';
import { formatTime } from '@/lib/format';

const KIND_LABELS = { before: 'Before', after: 'After', issue: 'Problem' } as const;

/** The proof. Thumbnails on a row, full width in the drawer. */
export function PhotoThumb({ job }: { job: JobView }) {
  const after = job.photos.find((photo) => photo.kind === 'after') ?? job.photos[0];
  if (!after?.url) return null;

  return (
    <img
      src={after.url}
      alt={`Finished job at ${job.addressLine1}`}
      loading="lazy"
      className="h-11 w-11 shrink-0 rounded-btn border border-grey-200 object-cover"
    />
  );
}

export function PhotoGrid({ photos }: { photos: JobView['photos'] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-grey-500">No photos yet.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {photos.map((photo) => (
        <li key={photo.id} className="overflow-hidden rounded-card border border-grey-200">
          {photo.url ? (
            <img
              src={photo.url}
              alt={`${KIND_LABELS[photo.kind]} photo`}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center bg-grey-50 text-sm text-grey-500">
              Not available
            </div>
          )}
          <p className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-grey-500">
            <span>{KIND_LABELS[photo.kind]}</span>
            <span className="tabular-nums">{formatTime(photo.takenAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
