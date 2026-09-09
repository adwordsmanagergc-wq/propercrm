import 'server-only';
import { createClient } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Job photos live in a private bucket, so every thumbnail needs a signed URL.
 * Signed in one batch per page rather than one per photo.
 */
export async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('job-photos')
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return new Map();

  const signed = new Map<string, string>();
  data.forEach((entry, index) => {
    const path = entry.path ?? unique[index];
    if (path && entry.signedUrl) signed.set(path, entry.signedUrl);
  });
  return signed;
}
