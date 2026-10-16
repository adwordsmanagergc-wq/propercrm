import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { annualValue, quoteTotal } from '@/lib/quote';
import { applicationFeePence, encodeStripeForm, verifyStripeSignature } from '@/lib/stripe';

describe('encodeStripeForm', () => {
  it('encodes nested objects and arrays the way Stripe expects', () => {
    const encoded = encodeStripeForm({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'gbp', unit_amount: 2150 } }],
      metadata: { invoice_id: 'abc' },
      skip: undefined,
    }).map(decodeURIComponent);

    expect(encoded).toEqual([
      'mode=payment',
      'line_items[0][quantity]=1',
      'line_items[0][price_data][currency]=gbp',
      'line_items[0][price_data][unit_amount]=2150',
      'metadata[invoice_id]=abc',
    ]);
  });
});

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test';
  const payload = '{"id":"evt_1"}';
  const now = 1_760_000_000_000;
  const t = Math.floor(now / 1000);
  const sign = (body: string, ts = t) =>
    createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  it('accepts a good signature', () => {
    expect(verifyStripeSignature(payload, `t=${t},v1=${sign(payload)}`, secret, 300, now)).toBe(
      true,
    );
  });

  it('accepts when one of several v1 signatures matches (secret rotation)', () => {
    expect(
      verifyStripeSignature(
        payload,
        `t=${t},v1=${'0'.repeat(64)},v1=${sign(payload)}`,
        secret,
        300,
        now,
      ),
    ).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(
      verifyStripeSignature('{"id":"evt_2"}', `t=${t},v1=${sign(payload)}`, secret, 300, now),
    ).toBe(false);
  });

  it('rejects an old timestamp', () => {
    const old = t - 600;
    expect(
      verifyStripeSignature(payload, `t=${old},v1=${sign(payload, old)}`, secret, 300, now),
    ).toBe(false);
  });

  it('rejects junk', () => {
    expect(verifyStripeSignature(payload, null, secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, 'nonsense', secret, 300, now)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t},v1=zz`, secret, 300, now)).toBe(false);
  });
});

describe('applicationFeePence', () => {
  it('is off by default', () => {
    expect(applicationFeePence(2000, 0)).toBeUndefined();
  });
  it('takes a percentage, rounded to the penny', () => {
    expect(applicationFeePence(2150, 1)).toBe(22);
  });
  it('is capped', () => {
    expect(applicationFeePence(1000, 90)).toBe(200);
  });
});

describe('quotes', () => {
  it('totals the lines exactly', () => {
    expect(
      quoteTotal([
        { description: 'a', quantity: 1, unit_price: 15.1 },
        { description: 'b', quantity: 2, unit_price: 3.35 },
      ]),
    ).toBe(21.8);
  });

  it('annualises by frequency', () => {
    expect(annualValue(20, '4weekly')).toBe(260);
    expect(annualValue(20, '8weekly')).toBe(130);
    expect(annualValue(12.5, 'weekly')).toBe(650);
    expect(annualValue(80, 'one_off')).toBe(80);
  });
});
