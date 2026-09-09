export interface RoutePoint {
  id: string;
  lat: number | null;
  lng: number | null;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance in kilometres. Good enough for ordering a round. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function hasCoords<T extends RoutePoint>(point: T): point is T & { lat: number; lng: number } {
  return typeof point.lat === 'number' && typeof point.lng === 'number';
}

/**
 * Orders jobs by repeatedly hopping to the closest one not yet visited,
 * starting from the company's yard. Jobs with no coordinates keep their
 * original order and go on the end — a missing postcode should never silently
 * drop a job off the round.
 */
export function nearestNeighbourOrder<T extends RoutePoint>(
  points: T[],
  start: { lat: number; lng: number } | null,
): T[] {
  const locatable = points.filter(hasCoords);
  const unlocatable = points.filter((p) => !hasCoords(p));

  const remaining = [...locatable];
  const ordered: T[] = [];
  let cursor = start ?? (remaining[0] ? { lat: remaining[0].lat, lng: remaining[0].lng } : null);

  while (remaining.length > 0 && cursor) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      if (!candidate) continue;
      const distance = haversineKm(cursor, { lat: candidate.lat, lng: candidate.lng });
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    const [next] = remaining.splice(bestIndex, 1);
    if (!next) break;
    ordered.push(next);
    cursor = { lat: next.lat, lng: next.lng };
  }

  return [...ordered, ...unlocatable];
}

/** Total travel distance of a route, including the leg out of the yard. */
export function routeLengthKm(
  points: RoutePoint[],
  start: { lat: number; lng: number } | null,
): number {
  const legs = points.filter(hasCoords);
  let total = 0;
  let cursor = start;

  for (const point of legs) {
    if (cursor) total += haversineKm(cursor, { lat: point.lat, lng: point.lng });
    cursor = { lat: point.lat, lng: point.lng };
  }
  return total;
}
