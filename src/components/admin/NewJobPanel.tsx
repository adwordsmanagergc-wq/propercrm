'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createJobAction } from '@/app/actions/jobs';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Field, Input, Notice, Select, Textarea } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

interface Option {
  id: string;
  label: string;
}

/**
 * A job that is not on a round: a conservatory, a builders' clean, a one-off
 * favour. It has no template, so nothing books itself afterwards.
 */
export function NewJobPanel({
  customers,
  cleaners,
  defaultDate,
}: {
  customers: Option[];
  cleaners: Option[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(createJobAction, undefined);

  const saved = state?.ok === true;
  useEffect(() => {
    if (!saved) return;
    setOpen(false);
    router.refresh();
  }, [saved, router]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        One-off job
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="One-off job"
        subtitle="Not on a round — nothing books itself after this one."
      >
        <form action={action} className="space-y-4" noValidate>
          {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}

          <Field label="Customer" htmlFor="job_customer">
            <Select id="job_customer" name="customer_id" required>
              <option value="">Pick a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="When" htmlFor="job_date">
              <Input
                id="job_date"
                name="scheduled_date"
                type="date"
                defaultValue={defaultDate}
                required
              />
            </Field>
            <Field label="Price" htmlFor="job_price">
              <Input
                id="job_price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                required
              />
            </Field>
            <Field label="How long it takes" htmlFor="job_duration" hint="Minutes.">
              <Input
                id="job_duration"
                name="duration_mins"
                type="number"
                min="5"
                max="600"
                step="5"
                defaultValue={60}
              />
            </Field>
            <Field label="Who does it" htmlFor="job_cleaner">
              <Select id="job_cleaner" name="assigned_to" defaultValue="">
                <option value="">Nobody yet</option>
                {cleaners.map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Anything special" htmlFor="job_notes">
            <Textarea
              id="job_notes"
              name="notes"
              placeholder="Conservatory roof, builders' clean…"
            />
          </Field>

          <SubmitButton size="lg" pendingLabel="Adding…">
            Add this job
          </SubmitButton>
        </form>
      </Drawer>
    </>
  );
}
