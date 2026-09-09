'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from '@/components/ui/Icons';
import { compressPhoto } from '@/lib/image';
import type { PhotoKind } from '@/lib/types/database';

export interface CapturedPhoto {
  blob: Blob;
  takenAt: string;
}

/**
 * Opens the phone's camera directly (capture="environment"), then shrinks the
 * shot to 1600px before it goes anywhere near the network.
 */
export function PhotoCapture({
  kind,
  label,
  onCaptured,
  disabled,
}: {
  kind: PhotoKind;
  label: string;
  onCaptured: (photo: CapturedPhoto) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const prepared = await compressPhoto(file);
        await onCaptured({ blob: prepared.blob, takenAt: prepared.takenAt });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That photo would not save');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={`camera-${kind}`}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <label
        htmlFor={`camera-${kind}`}
        aria-disabled={disabled || busy}
        className={
          disabled || busy
            ? 'flex h-14 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-btn border border-grey-200 bg-grey-50 text-lg font-semibold text-grey-500'
            : 'flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-btn border border-blue-200 bg-white text-lg font-semibold text-blue-700 active:bg-blue-50'
        }
      >
        <CameraIcon className="h-6 w-6" />
        {busy ? 'Saving photo…' : label}
      </label>
      {error ? (
        <p className="mt-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Previews of shots taken on this phone that have not been sent yet. */
export function LocalPhotoStrip({ blobs }: { blobs: Blob[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = blobs.map((blob) => URL.createObjectURL(blob));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [blobs]);

  if (urls.length === 0) return null;

  return (
    <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {urls.map((url, index) => (
        <li key={url} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Photo ${index + 1}`}
            className="h-20 w-20 rounded-btn border border-grey-200 object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
