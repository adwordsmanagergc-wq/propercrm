import { lineTotal } from '@/lib/invoice';
import { toPence, toPounds } from '@/lib/money';
import type { Frequency, QuoteStatus } from '@/lib/types/database';

export interface QuoteLineInput {
  description: string;
  quantity: number;
  unit_price: number;
}

/** Price per visit: the sum of the lines, to the penny. */
export function quoteTotal(lines: QuoteLineInput[]): number {
  return toPounds(lines.reduce((sum, line) => sum + toPence(lineTotal(line)), 0));
}

export const VISITS_PER_YEAR: Record<Frequency, number> = {
  weekly: 52,
  fortnightly: 26,
  '4weekly': 13,
  '8weekly': 6.5,
  one_off: 1,
};

/** What a quote is worth over a year if it is accepted. */
export function annualValue(perVisit: number, frequency: Frequency): number {
  return toPounds(Math.round(toPence(perVisit) * VISITS_PER_YEAR[frequency]));
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

/** Quick-add lines for the quote builder. Prices are only a starting point. */
export const QUOTE_PRESETS: QuoteLineInput[] = [
  { description: 'Windows, outside', quantity: 1, unit_price: 15 },
  { description: 'Windows, inside', quantity: 1, unit_price: 10 },
  { description: 'Frames, sills and doors', quantity: 1, unit_price: 5 },
  { description: 'Conservatory roof', quantity: 1, unit_price: 10 },
  { description: 'Gutters cleared', quantity: 1, unit_price: 40 },
  { description: 'Fascias and soffits', quantity: 1, unit_price: 30 },
];
