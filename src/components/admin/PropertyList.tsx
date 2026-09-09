'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { deletePropertyAction, savePropertyAction } from '@/app/actions/customers';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Notice } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { EmptyState } from '@/components/ui/States';
import { formatMoney } from '@/lib/money';
import type { PropertyRow } from '@/lib/types/database';

export function PropertyList({
  customerId,
  properties,
}: {
  customerId: string;
  properties: PropertyRow[];
}) {
  const [adding, setAdding] = useState(false);
  const [state, action] = useFormState(savePropertyAction, undefined);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {properties.length === 0 && !adding ? (
        <EmptyState
          title="Just the one address"
          description="Add another if you also do their shop, their mother's house, or an office."
          action={<Button onClick={() => setAdding(true)}>Add another address</Button>}
        />
      ) : (
        <>
          <ul className="divide-y divide-grey-200">
            {properties.map((property) => (
              <li key={property.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{property.label}</p>
                  <p className="text-sm text-grey-500">
                    {property.address_line1}
                    {property.postcode ? `, ${property.postcode.toUpperCase()}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-grey-500">
                    {[
                      property.window_count ? `${property.window_count} windows` : null,
                      property.storeys ? `${property.storeys} storeys` : null,
                      property.has_conservatory ? 'Conservatory' : null,
                      property.price ? formatMoney(Number(property.price)) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No details'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deletePropertyAction({ propertyId: property.id, customerId });
                    })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {!adding ? (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Add another address
            </Button>
          ) : null}
        </>
      )}

      {adding ? (
        <form action={action} className="space-y-4 rounded-card border border-grey-200 p-4">
          {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
          <input type="hidden" name="customer_id" value={customerId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What is it?" htmlFor="label">
              <Input id="label" name="label" placeholder="Shop front" required />
            </Field>
            <Field label="Price" htmlFor="price">
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
              />
            </Field>
            <Field label="Address" htmlFor="p_address_line1" className="sm:col-span-2">
              <Input id="p_address_line1" name="address_line1" />
            </Field>
            <Field label="Town" htmlFor="p_city">
              <Input id="p_city" name="city" />
            </Field>
            <Field label="Postcode" htmlFor="p_postcode">
              <Input id="p_postcode" name="postcode" className="uppercase" />
            </Field>
            <Field label="Windows" htmlFor="window_count">
              <Input
                id="window_count"
                name="window_count"
                type="number"
                min="0"
                inputMode="numeric"
              />
            </Field>
            <Field label="Storeys" htmlFor="storeys">
              <Input
                id="storeys"
                name="storeys"
                type="number"
                min="1"
                max="10"
                inputMode="numeric"
              />
            </Field>
          </div>

          <Checkbox name="has_conservatory" value="true" label="Has a conservatory" />

          <div className="flex gap-2">
            <SubmitButton pendingLabel="Saving…">Save address</SubmitButton>
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
