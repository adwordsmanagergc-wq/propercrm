import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKING_DAYS,
  isoDay,
  nextFiveDates,
  nextOccurrence,
  occurrences,
  snapToWorkingDay,
  toISODate,
} from '@/lib/recurrence';

const iso = (date: Date | null) => (date ? toISODate(date) : null);

describe('isoDay', () => {
  it('numbers Monday to Sunday as 1 to 7', () => {
    expect(isoDay(new Date('2024-06-03T00:00:00'))).toBe(1); // Monday
    expect(isoDay(new Date('2024-06-08T00:00:00'))).toBe(6); // Saturday
    expect(isoDay(new Date('2024-06-09T00:00:00'))).toBe(7); // Sunday
  });
});

describe('snapToWorkingDay', () => {
  it('leaves a working day alone', () => {
    expect(iso(snapToWorkingDay('2024-06-05', DEFAULT_WORKING_DAYS))).toBe('2024-06-05');
  });

  it('pushes a Saturday to the following Monday', () => {
    expect(iso(snapToWorkingDay('2024-06-08', DEFAULT_WORKING_DAYS))).toBe('2024-06-10');
  });

  it('respects a company that works Saturdays but not Mondays', () => {
    expect(iso(snapToWorkingDay('2024-06-10', [2, 3, 4, 5, 6]))).toBe('2024-06-11');
  });

  it('gives up rather than looping forever on an empty working week', () => {
    expect(iso(snapToWorkingDay('2024-06-08', []))).toBe('2024-06-08');
  });
});

describe('nextOccurrence', () => {
  const anchor = '2024-06-05'; // a Wednesday

  it('adds the frequency interval', () => {
    expect(iso(nextOccurrence(anchor, 'weekly', anchor))).toBe('2024-06-12');
    expect(iso(nextOccurrence(anchor, 'fortnightly', anchor))).toBe('2024-06-19');
    expect(iso(nextOccurrence(anchor, '4weekly', anchor))).toBe('2024-07-03');
    expect(iso(nextOccurrence(anchor, '8weekly', anchor))).toBe('2024-07-31');
  });

  it('never repeats a one-off', () => {
    expect(nextOccurrence(anchor, 'one_off', anchor)).toBeNull();
  });

  it('snaps back to the round preferred weekday after a manual move', () => {
    // The job was dragged to Friday, but the round is a Wednesday round.
    expect(iso(nextOccurrence('2024-06-07', 'weekly', anchor))).toBe('2024-06-19');
  });

  it('skips a non-working day', () => {
    // A Saturday round for a company that only works weekdays.
    const saturday = '2024-06-08';
    expect(iso(nextOccurrence(saturday, 'weekly', saturday, DEFAULT_WORKING_DAYS))).toBe(
      '2024-06-17',
    );
  });

  it('keeps a Saturday round for a company that works Saturdays', () => {
    const saturday = '2024-06-08';
    expect(iso(nextOccurrence(saturday, 'weekly', saturday, [1, 2, 3, 4, 5, 6]))).toBe(
      '2024-06-15',
    );
  });
});

describe('occurrences', () => {
  it('returns the next five dates from the anchor', () => {
    expect(nextFiveDates('2024-06-05', '4weekly').map(iso)).toEqual([
      '2024-06-05',
      '2024-07-03',
      '2024-07-31',
      '2024-08-28',
      '2024-09-25',
    ]);
  });

  it('rolls a past anchor forward to the first future date', () => {
    // 3 Jan 2024 is a Wednesday; fortnightly from there lands on 5 June.
    const dates = nextFiveDates('2024-01-03', 'fortnightly', DEFAULT_WORKING_DAYS, '2024-06-01');
    expect(dates.map(iso)).toEqual([
      '2024-06-05',
      '2024-06-19',
      '2024-07-03',
      '2024-07-17',
      '2024-07-31',
    ]);
  });

  it('produces exactly one date for a one-off', () => {
    expect(nextFiveDates('2024-06-05', 'one_off').map(iso)).toEqual(['2024-06-05']);
  });

  it('stops at the until date', () => {
    const dates = occurrences({ anchor: '2024-06-05', frequency: 'weekly', until: '2024-06-26' });
    expect(dates.map(iso)).toEqual(['2024-06-05', '2024-06-12', '2024-06-19', '2024-06-26']);
  });

  it('never lands on a weekend for a Monday-to-Friday company', () => {
    const dates = occurrences({ anchor: '2024-06-05', frequency: 'weekly', count: 30 });
    for (const date of dates) {
      expect(DEFAULT_WORKING_DAYS).toContain(isoDay(date));
    }
  });

  it('never repeats a date', () => {
    const dates = occurrences({ anchor: '2024-06-05', frequency: 'weekly', count: 40 }).map(iso);
    expect(new Set(dates).size).toBe(dates.length);
  });
});
