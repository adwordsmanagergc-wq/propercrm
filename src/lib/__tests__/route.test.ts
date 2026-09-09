import { describe, expect, it } from 'vitest';
import { haversineKm, nearestNeighbourOrder, routeLengthKm } from '@/lib/route';

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
