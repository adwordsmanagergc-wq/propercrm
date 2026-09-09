import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

export function asDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

export function formatDate(value: string | Date): string {
  return format(asDate(value), 'd MMM yyyy');
}

export function formatShortDate(value: string | Date): string {
  return format(asDate(value), 'EEE d MMM');
}

export function formatTime(value: string | Date): string {
  return format(asDate(value), 'HH:mm');
}

/** "Today", "Tomorrow", "Yesterday" or a short date — whichever reads fastest. */
export function formatRelativeDay(value: string | Date): string {
  const date = asDate(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE d MMM');
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes < 1) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function formatPostcode(postcode: string | null | undefined): string {
  return (postcode ?? '').toUpperCase().trim();
}

/** "12 Elm Grove, RG1 5AA" — what a cleaner needs, nothing more. */
export function shortAddress(input: {
  address_line1?: string | null;
  postcode?: string | null;
}): string {
  return [input.address_line1?.trim(), formatPostcode(input.postcode)].filter(Boolean).join(', ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
