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

type Located<T> = T & { lat: number; lng: number };

/**
 * Untangles a route with 2-opt: wherever reversing a stretch of stops makes
 * the drive shorter, reverse it, and repeat until nothing improves. It fixes
 * the crossed-over legs that nearest-neighbour leaves behind, typically
 * shaving 10–20% off a day. The start is fixed and the route is open, since
 * a cleaner finishes wherever their last job is.
 */
export function twoOpt<T extends RoutePoint>(
  route: Located<T>[],
  start: { lat: number; lng: number } | null,
  maxPasses = 50,
): Located<T>[] {
  if (route.length < 3) return route;
  const best = [...route];
  const at = (i: number) => (i < 0 ? start : best[i]) ?? null;
  const dist = (a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null) =>
    a && b ? haversineKm(a, b) : 0;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let k = i + 1; k < best.length; k += 1) {
        // Reverse best[i..k]: swap edges (i-1 → i) and (k → k+1) for
        // (i-1 → k) and (i → k+1). The last stop has no onward edge.
        const before = dist(at(i - 1), at(i)) + (k + 1 < best.length ? dist(at(k), at(k + 1)) : 0);
        const after = dist(at(i - 1), at(k)) + (k + 1 < best.length ? dist(at(i), at(k + 1)) : 0);
        if (after + 1e-9 < before) {
          best.splice(i, k - i + 1, ...best.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

/** The shortest drive we can find: nearest-neighbour, then untangled. */
export function bestRoute<T extends RoutePoint>(
  points: T[],
  start: { lat: number; lng: number } | null,
): T[] {
  const rough = nearestNeighbourOrder(points, start);
  const locatable = rough.filter(hasCoords);
  const unlocatable = rough.filter((p) => !hasCoords(p));
  return [...twoOpt(locatable, start), ...unlocatable];
}

export interface DayStop extends RoutePoint {
  status: string;
}

/**
 * Plans a day that may already be under way. Finished and on-site jobs keep
 * their place at the front; the rest are routed from wherever the cleaner is
 * now (the last finished job), or from their start point if they have not
 * begun. Skipped and cancelled jobs go to the back.
 */
export function planDay<T extends DayStop>(
  stops: T[],
  start: { lat: number; lng: number } | null,
): T[] {
  const done = stops.filter((s) => s.status === 'completed' || s.status === 'in_progress');
  const todo = stops.filter((s) => s.status === 'scheduled');
  const parked = stops.filter((s) => !done.includes(s) && !todo.includes(s));

  const last = [...done].reverse().find(hasCoords);
  const from = last ? { lat: last.lat, lng: last.lng } : start;

  return [...done, ...bestRoute(todo, from), ...parked];
}
