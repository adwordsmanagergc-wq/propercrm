'use client';

import { useFormState } from 'react-dom';
import { saveSettingsAction } from '@/app/actions/settings';
import { Checkbox, Field, Input, Notice, Textarea } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { WEEKDAY_LABELS } from '@/lib/recurrence';
import type { CompanyRow } from '@/lib/types/database';

export function SettingsForm({ company }: { company: CompanyRow }) {
  const [state, action] = useFormState(saveSettingsAction, undefined);
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  return (
    <form action={action} className="space-y-8" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {state?.ok && state.message ? <Notice tone="success">{state.message}</Notice> : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">The business</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Business name"
            htmlFor="name"
            error={error('name')}
            className="sm:col-span-2"
          >
            <Input id="name" name="name" defaultValue={company.name} required />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={company.phone ?? ''} />
          </Field>
          <Field label="Email" htmlFor="email" error={error('email')}>
            <Input id="email" name="email" type="email" defaultValue={company.email ?? ''} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" hint="Rounds roll over at midnight here.">
            <Input id="timezone" name="timezone" defaultValue={company.timezone} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Where you set off from</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Start postcode"
            htmlFor="start_postcode"
            hint="The yard. Used for anyone with no start address of their own."
          >
            <Input
              id="start_postcode"
              name="start_postcode"
              className="uppercase"
              defaultValue={company.start_postcode ?? ''}
            />
          </Field>
          <input type="hidden" name="start_lat" value={company.start_lat ?? ''} />
          <input type="hidden" name="start_lng" value={company.start_lng ?? ''} />
        </div>
        <Checkbox
          name="auto_route"
          value="true"
          label="Put each cleaner's day in driving order every night"
          defaultChecked={company.auto_route}
        />
        <p className="text-sm text-grey-500">
          Each cleaner&apos;s route starts from their own address, set on the Staff page. Turn this
          off if you prefer to order rounds by hand.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Working days</h2>
        <p className="text-sm text-grey-500">
          Rounds never land on a day you are shut — they roll to the next working day.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, index) => {
            const day = index + 1;
            return (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2 rounded-pill border border-grey-200 bg-white px-3.5 py-2 text-sm font-semibold has-[:checked]:border-blue-200 has-[:checked]:bg-blue-100 has-[:checked]:text-blue-700"
              >
                <input
                  type="checkbox"
                  name="working_days[]"
                  value={day}
                  defaultChecked={company.working_days.includes(day)}
                  className="h-4 w-4 accent-blue-500"
                />
                {label}
              </label>
            );
          })}
        </div>
        {error('working_days') ? (
          <p className="text-sm font-medium text-danger">{error('working_days')}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Invoices</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Invoice prefix"
            htmlFor="invoice_prefix"
            hint={`Next one will be ${company.invoice_prefix}-${String(company.next_invoice_number).padStart(4, '0')}.`}
          >
            <Input
              id="invoice_prefix"
              name="invoice_prefix"
              className="uppercase"
              defaultValue={company.invoice_prefix}
              required
            />
          </Field>
          <Field label="Payment terms" htmlFor="payment_terms_days" hint="Days from issue.">
            <Input
              id="payment_terms_days"
              name="payment_terms_days"
              type="number"
              min="0"
              max="180"
              inputMode="numeric"
              defaultValue={company.payment_terms_days}
            />
          </Field>
          <Field label="Bank name" htmlFor="bank_name">
            <Input id="bank_name" name="bank_name" defaultValue={company.bank_name ?? ''} />
          </Field>
          <Field label="Account name" htmlFor="bank_account_name">
            <Input
              id="bank_account_name"
              name="bank_account_name"
              defaultValue={company.bank_account_name ?? ''}
            />
          </Field>
          <Field label="Sort code" htmlFor="bank_sort_code">
            <Input
              id="bank_sort_code"
              name="bank_sort_code"
              placeholder="30-96-26"
              defaultValue={company.bank_sort_code ?? ''}
            />
          </Field>
          <Field label="Account number" htmlFor="bank_account_number">
            <Input
              id="bank_account_number"
              name="bank_account_number"
              inputMode="numeric"
              defaultValue={company.bank_account_number ?? ''}
            />
          </Field>
        </div>
        <Field label="Note at the bottom of invoices" htmlFor="invoice_footer">
          <Textarea
            id="invoice_footer"
            name="invoice_footer"
            defaultValue={company.invoice_footer ?? ''}
            placeholder="Thank you — payment within 14 days please."
          />
        </Field>
      </section>

      <SubmitButton size="lg" pendingLabel="Saving…">
        Save settings
      </SubmitButton>
    </form>
  );
}
