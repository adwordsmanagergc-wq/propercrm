'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { saveRoundAction } from '@/app/actions/rounds';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FREQUENCY_LABELS, nextFiveDates, toISODate } from '@/lib/recurrence';
import { formatShortDate } from '@/lib/format';
import type { Frequency } from '@/lib/types/database';

export interface RoundFormValues {
  id?: string;
  customer_id: string;
  property_id: string | null;
  price: number;
  duration_mins: number;
  frequency: Frequency;
  anchor_date: string;
  assigned_cleaner: string | null;
  is_active: boolean;
  instructions: string | null;
}

interface Option {
  id: string;
  label: string;
}

export function RoundForm({
  round,
  customers,
  cleaners,
  properties,
  workingDays,
  today,
  onSaved,
}: {
  round?: RoundFormValues;
  customers: Option[];
  cleaners: Option[];
  properties: { id: string; customerId: string; label: string }[];
  workingDays: number[];
  today: string;
  onSaved?: () => void;
}) {
  const [state, action] = useFormState(saveRoundAction, undefined);
  const [customerId, setCustomerId] = useState(round?.customer_id ?? customers[0]?.id ?? '');
  const [frequency, setFrequency] = useState<Frequency>(round?.frequency ?? '4weekly');
  const [anchor, setAnchor] = useState(round?.anchor_date ?? today);

  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  // The same maths the database uses, so this preview is not a guess.
  const preview = useMemo(() => {
    if (!anchor) return [];
    try {
      return nextFiveDates(anchor, frequency, workingDays, today).map(toISODate);
    } catch {
      return [];
    }
  }, [anchor, frequency, workingDays, today]);

  const customerProperties = properties.filter((property) => property.customerId === customerId);

  const saved = state?.ok === true;
  useEffect(() => {
    if (saved) onSaved?.();
  }, [saved, onSaved]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {state?.ok && state.message ? <Notice tone="success">{state.message}</Notice> : null}
      {round?.id ? <input type="hidden" name="id" value={round.id} /> : null}

      <Field label="Customer" htmlFor="customer_id" error={fieldError('customer_id')}>
        <Select
          id="customer_id"
          name="customer_id"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          required
        >
          <option value="">Pick a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </Select>
      </Field>

      {customerProperties.length > 0 ? (
        <Field
          label="Which address"
          htmlFor="property_id"
          hint="Leave blank for their home address."
        >
          <Select id="property_id" name="property_id" defaultValue={round?.property_id ?? ''}>
            <option value="">Home address</option>
            {customerProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price" htmlFor="price" error={fieldError('price')}>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={round?.price ?? ''}
            required
          />
        </Field>

        <Field label="How long it takes" htmlFor="duration_mins" hint="Minutes.">
          <Input
            id="duration_mins"
            name="duration_mins"
            type="number"
            min="5"
            max="600"
            step="5"
            inputMode="numeric"
            defaultValue={round?.duration_mins ?? 30}
          />
        </Field>

        <Field label="How often" htmlFor="frequency">
          <Select
            id="frequency"
            name="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
          >
            {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="First visit"
          htmlFor="anchor_date"
          hint="Sets the day of the week the round falls on."
          error={fieldError('anchor_date')}
        >
          <Input
            id="anchor_date"
            name="anchor_date"
            type="date"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
            required
          />
        </Field>

        <Field label="Who does it" htmlFor="assigned_cleaner" className="sm:col-span-2">
          <Select
            id="assigned_cleaner"
            name="assigned_cleaner"
            defaultValue={round?.assigned_cleaner ?? ''}
          >
            <option value="">Nobody yet</option>
            {cleaners.map((cleaner) => (
              <option key={cleaner.id} value={cleaner.id}>
                {cleaner.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Anything special" htmlFor="instructions">
        <Textarea
          id="instructions"
          name="instructions"
          placeholder="Conservatory roof every other visit"
          defaultValue={round?.instructions ?? ''}
        />
      </Field>

      {/* ------------------------------------------------ the preview */}
      <div className="rounded-card border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900">
          {frequency === 'one_off' ? 'This visit' : 'Next 5 visits'}
        </h3>
        {preview.length === 0 ? (
          <p className="mt-1.5 text-sm text-grey-500">Pick a first visit date to see the dates.</p>
        ) : (
          <ol className="mt-2 flex flex-wrap gap-2">
            {preview.map((date) => (
              <li
                key={date}
                className="rounded-pill border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-900"
              >
                {formatShortDate(date)}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-blue-900/80">
          Days the company does not work are skipped automatically.
        </p>
      </div>

      {round?.id ? (
        <Field
          label="Apply the changes to"
          htmlFor="applyTo"
          hint="Jobs already started or finished are never touched."
        >
          <Select id="applyTo" name="applyTo" defaultValue="future">
            <option value="future">Future visits only</option>
            <option value="all_unstarted">Every visit not yet started, today included</option>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="applyTo" value="future" />
      )}

      <input type="hidden" name="is_active" value={round?.is_active === false ? 'false' : 'true'} />

      <SubmitButton size="lg" pendingLabel="Saving…">
        {round?.id ? 'Save round' : 'Create round'}
      </SubmitButton>
    </form>
  );
}
