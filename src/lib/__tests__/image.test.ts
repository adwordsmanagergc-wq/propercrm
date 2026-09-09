import { describe, expect, it } from 'vitest';
import { photoFilename, scaleToFit } from '@/lib/image';

describe('scaleToFit', () => {
  it('leaves a small photo alone', () => {
    expect(scaleToFit(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('brings a modern phone photo down to 1600px on its long edge', () => {
    // A 12 MP portrait shot, which is what most of these will be.
    expect(scaleToFit(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it('does the same for a landscape shot', () => {
    expect(scaleToFit(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  });

  it('keeps the aspect ratio', () => {
    const { width, height } = scaleToFit(4000, 2250);
    expect(width / height).toBeCloseTo(4000 / 2250, 2);
  });

  it('honours a different limit', () => {
    expect(scaleToFit(4000, 2000, 400)).toEqual({ width: 400, height: 200 });
  });

  it('handles a square photo exactly on the limit', () => {
    expect(scaleToFit(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });
});

describe('photoFilename', () => {
  it('carries the kind and the moment it was taken', () => {
    const name = photoFilename('before', '2024-06-05T09:31:07.512Z');
    expect(name).toMatch(/^before-20240605-093107-[a-z0-9]{6}\.jpg$/);
  });

  it('does not collide for two shots in the same second', () => {
    const takenAt = '2024-06-05T09:31:07.512Z';
    expect(photoFilename('after', takenAt)).not.toBe(photoFilename('after', takenAt));
  });
});
