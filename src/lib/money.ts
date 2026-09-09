/**
 * Money is handled in whole pence and only turned back into pounds at the
 * edges, so 3 × £12.35 is never £37.049999999999997.
 */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function toPounds(pence: number): number {
  return pence / 100;
}

export function round2(value: number): number {
  return toPounds(toPence(value));
}

export function formatMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value ?? 0);
}
