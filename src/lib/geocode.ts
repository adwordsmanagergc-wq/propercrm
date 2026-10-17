import 'server-only';

export interface LatLng {
  lat: number;
  lng: number;
}

const ENDPOINT = 'https://api.postcodes.io/postcodes';
const TIMEOUT_MS = 4000;

/** "rg1 5aa" → "RG15AA", for comparing and for the URL. */
export function compactPostcode(postcode: string): string {
  return postcode.replace(/\s+/g, '').toUpperCase();
}

type Result = {
  latitude?: number | null;
  longitude?: number | null;
} | null;

function toLatLng(result: Result): LatLng | null {
  if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
    return null;
  }
  return { lat: result.latitude, lng: result.longitude };
}

/**
 * Turns a UK postcode into a map position with postcodes.io: free, no key,
 * Ordnance Survey data. A postcode marks a street or a few dozen doors, which
 * is plenty to put a round in driving order.
 *
 * Never throws and never holds a save up for long: no answer means null, and
 * the caller carries on without coordinates.
 */
export async function lookupPostcode(postcode: string | null | undefined): Promise<LatLng | null> {
  const compact = postcode ? compactPostcode(postcode) : '';
  if (compact.length < 5 || compact.length > 8) return null;

  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(compact)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'force-cache',
    });
    const body = (await response.json()) as {
      result?: Result;
      // Retired postcodes still come back with where they used to be.
      terminated?: Result;
    };
    return toLatLng(body.result ?? null) ?? toLatLng(body.terminated ?? null);
  } catch {
    return null;
  }
}

/**
 * Coordinates to save alongside an address. The postcode wins, so editing an
 * address can never leave the old pin behind; whatever was there before is
 * kept only when the lookup has no answer (a brand-new or non-UK postcode, or
 * no signal to postcodes.io).
 */
export async function resolveCoords(
  postcode: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): Promise<{ lat: number | null; lng: number | null }> {
  const found = await lookupPostcode(postcode);
  if (found) return found;
  return typeof lat === 'number' && typeof lng === 'number'
    ? { lat, lng }
    : { lat: null, lng: null };
}
