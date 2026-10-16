'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveQuoteAction } from '@/app/actions/quotes';
import { Button } from '@/components/ui/Button';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/Field';
import { formatMoney } from '@/lib/money';
import { annualValue, QUOTE_PRESETS, quoteTotal, type QuoteLineInput } from '@/lib/quote';
import { FREQUENCY_LABELS } from '@/lib/recurrence';
import type { Frequency } from '@/lib/types/database';

export interface QuoteCustomerOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string | null;
  postcode: string;
}

export interface QuoteDraft {
  id?: string;
  customer_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  frequency: Frequency;
  duration_mins: number;
  proposed_start: string;
  valid_until: string;
  message: string;
  lines: QuoteLineInput[];
}

type Line = QuoteLineInput & { key: number };

let nextKey = 1;
const withKey = (line: QuoteLineInput): Line => ({ ...line, key: nextKey++ });

/**
 * The quote builder. One screen: who it is for, how often, and the lines.
 * The running total and its yearly value update as you type, because that is
 * the number the owner is really looking at.
 */
export function QuoteBuilder({
  initial,
  customers,
}: {
  initial: QuoteDraft;
  customers: QuoteCustomerOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [lines, setLines] = useState<Line[]>(() => initial.lines.map(withKey));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const cleanLines = lines.map(({ description, quantity, unit_price }) => ({
    description,
    quantity: Number(quantity) || 0,
    unit_price: Number(unit_price) || 0,
  }));
  const total = quoteTotal(cleanLines);

  function pickCustomer(id: string) {
    const customer = customers.find((c) => c.id === id);
    if (!customer) {
      set('customer_id', null);
      return;
    }
    setDraft((current) => ({
      ...current,
      customer_id: customer.id,
      contact_name: customer.name,
      contact_email: customer.email ?? '',
      contact_phone: customer.phone ?? '',
      address_line1: customer.address_line1,
      address_line2: customer.address_line2 ?? '',
      city: customer.city ?? '',
      postcode: customer.postcode,
    }));
  }

  function updateLine(key: number, patch: Partial<QuoteLineInput>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function save() {
    setError(null);
    setSaved(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveQuoteAction({ ...draft, lines: cleanLines });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved(result.message ?? 'Saved');
      router.refresh();
    });
  }

  const err = (name: string) => fieldErrors[name];

  return (
    <div className="space-y-8">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Who it is for</h2>
        <Field
          label="Existing customer"
          htmlFor="customer_id"
          hint="Leave as a new enquiry and we will make the customer when they accept."
        >
          <Select
            id="customer_id"
            value={draft.customer_id ?? ''}
            onChange={(event) => pickCustomer(event.target.value)}
          >
            <option value="">New enquiry</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.postcode ? ` (${customer.postcode.toUpperCase()})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="contact_name"
            error={err('contact_name')}
            className="sm:col-span-2"
          >
            <Input
              id="contact_name"
              value={draft.contact_name}
              onChange={(event) => set('contact_name', event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="contact_email" error={err('contact_email')}>
            <Input
              id="contact_email"
              type="email"
              value={draft.contact_email}
              onChange={(event) => set('contact_email', event.target.value)}
            />
          </Field>
          <Field label="Mobile" htmlFor="contact_phone" hint="So we can text the quote.">
            <Input
              id="contact_phone"
              type="tel"
              value={draft.contact_phone}
              onChange={(event) => set('contact_phone', event.target.value)}
            />
          </Field>
          <Field label="Address" htmlFor="address_line1" error={err('address_line1')}>
            <Input
              id="address_line1"
              value={draft.address_line1}
              onChange={(event) => set('address_line1', event.target.value)}
            />
          </Field>
          <Field label="Address line 2" htmlFor="address_line2">
            <Input
              id="address_line2"
              value={draft.address_line2}
              onChange={(event) => set('address_line2', event.target.value)}
            />
          </Field>
          <Field label="Town" htmlFor="city">
            <Input
              id="city"
              value={draft.city}
              onChange={(event) => set('city', event.target.value)}
            />
          </Field>
          <Field label="Postcode" htmlFor="postcode">
            <Input
              id="postcode"
              className="uppercase"
              value={draft.postcode}
              onChange={(event) => set('postcode', event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">The work</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-grey-500">
              <tr>
                <th className="pb-2 font-semibold">Description</th>
                <th className="w-16 pb-2 font-semibold">Qty</th>
                <th className="w-24 pb-2 font-semibold">Price</th>
                <th className="w-24 pb-2 text-right font-semibold">Total</th>
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key} className="align-top">
                  <td className="py-1.5 pr-2">
                    <Input
                      aria-label={`Line ${index + 1} description`}
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                      aria-invalid={Boolean(err(`lines.${index}.description`))}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      aria-label={`Line ${index + 1} quantity`}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, { quantity: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      aria-label={`Line ${index + 1} price`}
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={line.unit_price}
                      onChange={(event) =>
                        updateLine(line.key, { unit_price: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td className="py-4 pr-2 text-right font-semibold tabular-nums">
                    {formatMoney((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}
                  </td>
                  <td className="py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((current) => current.filter((l) => l.key !== line.key))
                      }
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setLines((current) => [
                ...current,
                withKey({ description: '', quantity: 1, unit_price: 0 }),
              ])
            }
          >
            Add a line
          </Button>
          {QUOTE_PRESETS.filter(
            (preset) => !lines.some((l) => l.description === preset.description),
          ).map((preset) => (
            <Button
              key={preset.description}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setLines((current) => {
                  // Replace the empty starter line rather than adding below it.
                  const rest = current.filter(
                    (l) => l.description.trim() !== '' || l.unit_price > 0,
                  );
                  return [...rest, withKey(preset)];
                })
              }
            >
              + {preset.description}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How often" htmlFor="frequency">
            <Select
              id="frequency"
              value={draft.frequency}
              onChange={(event) => set('frequency', event.target.value as Frequency)}
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minutes on site" htmlFor="duration_mins">
            <Input
              id="duration_mins"
              type="number"
              min="5"
              step="5"
              value={draft.duration_mins}
              onChange={(event) => set('duration_mins', Number(event.target.value))}
            />
          </Field>
          <Field
            label="First clean from"
            htmlFor="proposed_start"
            hint="A week from acceptance if left blank."
          >
            <Input
              id="proposed_start"
              type="date"
              value={draft.proposed_start}
              onChange={(event) => set('proposed_start', event.target.value)}
            />
          </Field>
          <Field label="Valid until" htmlFor="valid_until">
            <Input
              id="valid_until"
              type="date"
              value={draft.valid_until}
              onChange={(event) => set('valid_until', event.target.value)}
            />
          </Field>
          <Field
            label="A note to the customer"
            htmlFor="message"
            className="sm:col-span-2"
            hint="Shown at the top of the quote. Mention anything you spotted on the visit."
          >
            <Textarea
              id="message"
              value={draft.message}
              onChange={(event) => set('message', event.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-grey-200 bg-white px-5 py-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(total)}
            <span className="text-base font-medium text-grey-500">
              {draft.frequency === 'one_off' ? ' one-off' : ' per clean'}
            </span>
          </p>
          {draft.frequency !== 'one_off' ? (
            <p className="text-sm text-grey-500">
              Worth {formatMoney(annualValue(total, draft.frequency))} a year
            </p>
          ) : null}
        </div>
        <Button size="lg" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Save quote'}
        </Button>
      </div>
    </div>
  );
}
