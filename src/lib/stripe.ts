import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe Connect over plain HTTPS. Each window cleaning company connects its
 * own Stripe account; customers pay that account directly, and the platform
 * can optionally take a small application fee (STRIPE_APPLICATION_FEE_PERCENT).
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

type FormValue = string | number | boolean | null | undefined | FormObject | FormValue[];
interface FormObject {
  [key: string]: FormValue;
}

/** Stripe's nested form encoding: a[b][0][c]=d. */
export function encodeStripeForm(input: FormObject, prefix?: string): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          parts.push(...encodeStripeForm(item, `${name}[${index}]`));
        } else if (item !== undefined && item !== null) {
          parts.push(
            `${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`,
          );
        }
      });
    } else if (typeof value === 'object') {
      parts.push(...encodeStripeForm(value, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

export class StripeError extends Error {}

export async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params: FormObject = {},
  options: { account?: string | null; idempotencyKey?: string } = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError('Card payments are not set up on this deploy');

  const body = encodeStripeForm(params).join('&');
  const url = `https://api.stripe.com/v1${path}${method === 'GET' && body ? `?${body}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.account ? { 'Stripe-Account': options.account } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new StripeError(payload.error?.message ?? `Stripe returned ${response.status}`);
  }
  return payload;
}

/**
 * Checks the Stripe-Signature header: t=<unix>,v1=<hex hmac of "t.payload">.
 * Rejects anything older than the tolerance to stop replays.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowMs: number = Date.now(),
): boolean {
  if (!header || !secret) return false;

  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't' && value) timestamp = Number(value);
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!timestamp || !Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    const given = Buffer.from(signature, 'hex');
    return given.length === expectedBuffer.length && timingSafeEqual(given, expectedBuffer);
  });
}

/** The platform's cut, in pence, or undefined when there is none. */
export function applicationFeePence(
  amountPence: number,
  percent = Number(process.env.STRIPE_APPLICATION_FEE_PERCENT ?? 0),
): number | undefined {
  if (!Number.isFinite(percent) || percent <= 0) return undefined;
  const fee = Math.round((amountPence * Math.min(percent, 20)) / 100);
  return fee > 0 && fee < amountPence ? fee : undefined;
}
