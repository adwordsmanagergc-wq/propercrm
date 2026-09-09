import clsx, { type ClassValue } from 'clsx';

/** Tailwind class joiner. Small on purpose — no runtime class merging. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
