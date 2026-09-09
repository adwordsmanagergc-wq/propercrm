/**
 * Client-side photo preparation.
 *
 * A modern phone camera produces 4-6 MB per shot. Two per job, twenty jobs a
 * day, three cleaners — that is a lot of someone's data allowance for pictures
 * of clean glass. Downscaling to 1600px and re-encoding as JPEG brings each one
 * to roughly 200-400 KB, and drops the camera's EXIF (including its own GPS)
 * on the way: the location we keep is the one the browser gave us, recorded
 * against the job row.
 */
export const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  takenAt: string;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be read. Try taking it again.'));
    };
    image.src = url;
  });
}

export function scaleToFit(width: number, height: number, max = MAX_DIMENSION) {
  if (width <= max && height <= max) return { width, height };
  const ratio = Math.min(max / width, max / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function compressPhoto(file: File | Blob): Promise<PreparedPhoto> {
  const takenAt = new Date().toISOString();
  const image = await loadImage(file);
  const { width, height } = scaleToFit(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot resize photos.');
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('That photo could not be saved. Try taking it again.');

  return { blob, width, height, takenAt };
}

export function photoFilename(kind: string, takenAt: string): string {
  const stamp = takenAt.replace(/[-:.]/g, '').replace('T', '-').slice(0, 15);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${kind}-${stamp}-${suffix}.jpg`;
}

/** Best-effort position. Never blocks a cleaner from getting on with the job. */
export function currentPosition(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
