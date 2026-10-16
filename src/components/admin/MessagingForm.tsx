'use client';

import { useFormState } from 'react-dom';
import { saveMessagingSettingsAction } from '@/app/actions/messages';
import { Checkbox, Field, Input, Notice, Textarea } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { DEFAULT_TEMPLATES, PLACEHOLDERS, TEMPLATE_LABELS } from '@/lib/messaging/templates';
import type { CompanyRow } from '@/lib/types/database';

const TEMPLATE_FIELDS = [
  ['tpl_visit_reminder', 'visit_reminder'],
  ['tpl_job_done', 'job_done'],
  ['tpl_overdue', 'overdue'],
  ['tpl_invoice', 'invoice'],
  ['tpl_quote', 'quote'],
] as const;

export function MessagingForm({
  company,
  emailReady,
  smsReady,
}: {
  company: CompanyRow;
  emailReady: boolean;
  smsReady: boolean;
}) {
  const [state, action] = useFormState(saveMessagingSettingsAction, undefined);
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  return (
    <form action={action} className="space-y-8" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {state?.ok && state.message ? <Notice tone="success">{state.message}</Notice> : null}
      {!emailReady || !smsReady ? (
        <Notice>
          {!emailReady && !smsReady
            ? 'Email and texts are not connected on this deploy yet, so nothing will actually go out. Messages are still logged so you can see what would have been sent.'
            : !emailReady
              ? 'Email is not connected on this deploy yet. Customers who prefer email will get a text if they have a mobile.'
              : 'Texts are not connected on this deploy yet. Customers who prefer texts will get an email if they have one.'}
        </Notice>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Send automatically</h2>
        <p className="text-sm text-grey-500">
          Goes out at about 5pm each day, by each customer&apos;s preferred contact. Customers set
          to &ldquo;Do not contact&rdquo; are never messaged automatically.
        </p>
        <Checkbox
          name="notify_visit_reminder"
          defaultChecked={company.notify_visit_reminder}
          label="Remind customers the day before their clean"
        />
        <Checkbox
          name="notify_job_done"
          defaultChecked={company.notify_job_done}
          label="Tell customers when their clean is done, with the photos"
        />
        <Checkbox
          name="notify_overdue"
          defaultChecked={company.notify_overdue}
          label="Chase overdue invoices with a pay link"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Chase every (days)"
            htmlFor="chase_every_days"
            error={error('chase_every_days')}
            hint="After five reminders it stops. That one needs a phone call."
          >
            <Input
              id="chase_every_days"
              name="chase_every_days"
              type="number"
              min="3"
              max="60"
              defaultValue={company.chase_every_days}
            />
          </Field>
          <Field
            label="Text sender name"
            htmlFor="sms_sender"
            error={error('sms_sender')}
            hint="Up to 11 letters, e.g. CrystalWin. Blank uses the shared number."
          >
            <Input
              id="sms_sender"
              name="sms_sender"
              maxLength={11}
              defaultValue={company.sms_sender ?? ''}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Wording</h2>
          <p className="text-sm text-grey-500">
            Leave a box empty to use ours. You can use {PLACEHOLDERS.map((p) => `{${p}}`).join(' ')}
            .
          </p>
        </div>
        {TEMPLATE_FIELDS.map(([field, kind]) => (
          <Field key={field} label={TEMPLATE_LABELS[kind]} htmlFor={field} error={error(field)}>
            <Textarea
              id={field}
              name={field}
              rows={3}
              placeholder={DEFAULT_TEMPLATES[kind]}
              defaultValue={company[field] ?? ''}
            />
          </Field>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Quotes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quote number prefix" htmlFor="quote_prefix" error={error('quote_prefix')}>
            <Input
              id="quote_prefix"
              name="quote_prefix"
              className="uppercase"
              defaultValue={company.quote_prefix}
            />
          </Field>
          <Field
            label="Quotes are valid for (days)"
            htmlFor="quote_valid_days"
            error={error('quote_valid_days')}
          >
            <Input
              id="quote_valid_days"
              name="quote_valid_days"
              type="number"
              min="1"
              max="365"
              defaultValue={company.quote_valid_days}
            />
          </Field>
          <Field
            label="Small print"
            htmlFor="quote_terms"
            className="sm:col-span-2"
            hint="Shown at the bottom of every quote."
          >
            <Textarea
              id="quote_terms"
              name="quote_terms"
              defaultValue={company.quote_terms ?? ''}
            />
          </Field>
        </div>
      </section>

      <SubmitButton pendingLabel="Saving…">Save message settings</SubmitButton>
    </form>
  );
}
