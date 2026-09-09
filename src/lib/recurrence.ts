import { addDays, format, parseISO } from 'date-fns';
import type { Frequency } from '@/lib/types/database';

/**
 * The recurrence rules, mirrored exactly by public.next_occurrence() in
 * supabase/migrations/20240101000300_scheduling.sql. If you change one, change
 * both — the "next 5 dates" preview must match what the database creates.
 */
const FREQUENCY_DAYS: Record<Frequency, number | null> = {
  weekly: 7,
  fortnightly: 14,
  '4weekly': 28,
  '8weekly': 56,
  one_off: null,
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Every week',
  fortnightly: 'Every 2 weeks',
  '4weekly': 'Every 4 weeks',
  '8weekly': 'Every 8 weeks',
  one_off: 'One-off',
};

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

/** ISO weekday: 1 = Monday … 7 = Sunday (JS getDay() puts Sunday at 0). */
export function isoDay(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Push a date forward until it lands on a working day. */
export function snapToWorkingDay(date: Date | string, workingDays: number[]): Date {
  let d = toDate(date);
  if (workingDays.length === 0) return d;
  for (let i = 0; i < 14 && !workingDays.includes(isoDay(d)); i += 1) {
    d = addDays(d, 1);
  }
  return d;
}

/**
 * next_date = from + frequency interval, snapped to the round's preferred
 * weekday (taken from its anchor), then forward off any non-working day.
 * Returns null for one-off rounds, which never repeat.
 */
export function nextOccurrence(
  from: Date | string,
  frequency: Frequency,
  anchor: Date | string,
  workingDays: number[] = DEFAULT_WORKING_DAYS,
): Date | null {
  const days = FREQUENCY_DAYS[frequency];
  if (days === null) return null;

  const preferred = isoDay(toDate(anchor));
  let d = addDays(toDate(from), days);
  d = addDays(d, (preferred - isoDay(d) + 7) % 7);
  return snapToWorkingDay(d, workingDays);
}

export interface OccurrenceOptions {
  anchor: Date | string;
  frequency: Frequency;
  workingDays?: number[];
  /** Skip forward past any date earlier than this. */
  notBefore?: Date | string;
  count?: number;
  until?: Date | string;
}

/**
 * The dates a round will land on, starting at its anchor. Bounded by `count`
 * or `until` — pass at least one, or you get a single date back.
 */
export function occurrences({
  anchor,
  frequency,
  workingDays = DEFAULT_WORKING_DAYS,
  notBefore,
  count,
  until,
}: OccurrenceOptions): Date[] {
  const limit = count ?? 400;
  const untilDate = until ? toDate(until) : null;
  const floor = notBefore ? toDate(notBefore) : null;

  let current: Date | null = snapToWorkingDay(anchor, workingDays);
  const dates: Date[] = [];

  // Roll forward to the first date that is not in the past.
  let guard = 0;
  while (current && floor && current < floor && guard < 500) {
    current = nextOccurrence(current, frequency, anchor, workingDays);
    guard += 1;
  }

  while (current && dates.length < limit) {
    if (untilDate && current > untilDate) break;
    dates.push(current);
    current = nextOccurrence(current, frequency, anchor, workingDays);
  }

  return dates;
}

/** The preview shown before a round is saved. */
export function nextFiveDates(
  anchor: Date | string,
  frequency: Frequency,
  workingDays: number[] = DEFAULT_WORKING_DAYS,
  from?: Date | string,
): Date[] {
  return occurrences({ anchor, frequency, workingDays, notBefore: from, count: 5 });
}
