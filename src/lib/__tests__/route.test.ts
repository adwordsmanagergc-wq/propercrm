import { describe, expect, it } from 'vitest';
import {
  bestRoute,
  haversineKm,
  nearestNeighbourOrder,
  planDay,
  routeLengthKm,
  twoOpt,
} from '@/lib/route';

const yard = { lat: 51.4485, lng: -0.9735 }; // RG1 5AA

const point = (id: string, lat: number | null, lng: number | null) => ({ id, lat, lng });

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(yard, yard)).toBe(0);
  });

  it('matches a known distance', () => {
    // Reading to central London is roughly 60 km as the crow flies.
    const london = { lat: 51.5074, lng: -0.1278 };
    expect(haversineKm(yard, london)).toBeGreaterThan(55);
    expect(haversineKm(yard, london)).toBeLessThan(65);
  });

  it('is symmetric', () => {
    const a = { lat: 51.45, lng: -0.97 };
    const b = { lat: 51.46, lng: -0.99 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

describe('nearestNeighbourOrder', () => {
  it('walks outwards from the yard, closest first', () => {
    const jobs = [
      point('far', 51.48, -0.93),
      point('near', 51.4495, -0.974),
      point('middle', 51.46, -0.96),
    ];
    expect(nearestNeighbourOrder(jobs, yard).map((j) => j.id)).toEqual(['near', 'middle', 'far']);
  });

  it('keeps every job', () => {
    const jobs = Array.from({ length: 12 }, (_, i) =>
      point(`j${i}`, 51.44 + i * 0.004, -0.99 + i * 0.003),
    );
    const ordered = nearestNeighbourOrder(jobs, yard);
    expect(ordered).toHaveLength(12);
    expect(new Set(ordered.map((j) => j.id)).size).toBe(12);
  });

  it('puts jobs with no coordinates on the end rather than dropping them', () => {
    const jobs = [
      point('nocoords', null, null),
      point('near', 51.4495, -0.974),
      point('alsonone', 51.4, null),
    ];
    expect(nearestNeighbourOrder(jobs, yard).map((j) => j.id)).toEqual([
      'near',
      'nocoords',
      'alsonone',
    ]);
  });

  it('starts from the first job when the company has no start postcode', () => {
    const jobs = [point('a', 51.48, -0.93), point('b', 51.4495, -0.974)];
    expect(nearestNeighbourOrder(jobs, null).map((j) => j.id)).toEqual(['a', 'b']);
  });

  it('handles an empty round', () => {
    expect(nearestNeighbourOrder([], yard)).toEqual([]);
  });

  it('produces a route no longer than the original order', () => {
    const jobs = [
      point('a', 51.48, -0.93),
      point('b', 51.4495, -0.974),
      point('c', 51.47, -0.94),
      point('d', 51.451, -0.972),
      point('e', 51.46, -0.95),
    ];
    const before = routeLengthKm(jobs, yard);
    const after = routeLengthKm(nearestNeighbourOrder(jobs, yard), yard);
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe('twoOpt', () => {
  it('untangles a crossed route', () => {
    // Four corners of a square visited in a crossing order: a → c → b → d.
    const a = point('a', 0, 0);
    const b = point('b', 0, 0.01);
    const c = point('c', 0.01, 0.01);
    const d = point('d', 0.01, 0);
    const crossed = [a, c, b, d] as Array<typeof a & { lat: number; lng: number }>;
    const fixed = twoOpt(crossed, null);
    expect(routeLengthKm(fixed, null)).toBeLessThan(routeLengthKm(crossed, null));
  });

  it('never makes a route longer', () => {
    const stops = Array.from({ length: 25 }, (_, i) =>
      point(`s${i}`, 51.4 + ((i * 37) % 17) / 200, -1 + ((i * 53) % 19) / 200),
    ) as Array<{ id: string; lat: number; lng: number }>;
    const rough = nearestNeighbourOrder(stops, yard);
    expect(routeLengthKm(twoOpt(rough, yard), yard)).toBeLessThanOrEqual(
      routeLengthKm(rough, yard) + 1e-9,
    );
  });
});

describe('bestRoute', () => {
  it('keeps every job, with unlocated ones on the end', () => {
    const jobs = [point('x', null, null), point('a', 51.45, -0.97), point('b', 51.46, -0.99)];
    const ordered = bestRoute(jobs, yard);
    expect(ordered.map((j) => j.id).sort()).toEqual(['a', 'b', 'x']);
    expect(ordered.at(-1)?.id).toBe('x');
  });

  it('starts from the cleaner, not the yard', () => {
    const west = { lat: 51.4446, lng: -1.0182 };
    const jobs = [point('east', 51.452, -0.945), point('westish', 51.446, -1.01)];
    expect(bestRoute(jobs, west)[0]?.id).toBe('westish');
    expect(bestRoute(jobs, { lat: 51.452, lng: -0.946 })[0]?.id).toBe('east');
  });
});

describe('planDay', () => {
  const stop = (id: string, status: string, lat: number, lng: number) => ({ id, status, lat, lng });

  it('leaves finished work in place and routes the rest from the last job', () => {
    const day = [
      stop('near-home', 'scheduled', 51.473, -0.98),
      stop('done', 'completed', 51.445, -1.017),
      stop('next-to-done', 'scheduled', 51.446, -1.015),
      stop('skipped', 'skipped', 51.46, -0.99),
    ];
    const home = { lat: 51.473, lng: -0.979 };
    expect(planDay(day, home).map((s) => s.id)).toEqual([
      'done',
      'next-to-done',
      'near-home',
      'skipped',
    ]);
  });

  it('routes from the start point when nothing is done yet', () => {
    const day = [stop('far', 'scheduled', 51.445, -1.017), stop('near', 'scheduled', 51.47, -0.98)];
    expect(planDay(day, { lat: 51.473, lng: -0.979 })[0]?.id).toBe('near');
  });
});
