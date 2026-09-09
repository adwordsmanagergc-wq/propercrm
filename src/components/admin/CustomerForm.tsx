'use client';

import { useFormState } from 'react-dom';
import { saveCustomerAction } from '@/app/actions/customers';
import { Checkbox, Field, Input, Notice, Select, Textarea } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { CustomerRow } from '@/lib/types/database';

type Customer = Pick<
  CustomerRow,
  | 'id'
  | 'name'
  | 'phone'
  | 'email'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'postcode'
  | 'lat'
  | 'lng'
  | 'access_notes'
  | 'gate_code'
  | 'dog_on_site'
  | 'preferred_contact'
  | 'is_active'
  | 'notes'
>;

export function CustomerForm({ customer }: { customer?: Customer }) {
  const [state, action] = useFormState(saveCustomerAction, undefined);
  const error = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {state?.ok && state.message ? <Notice tone="success">{state.message}</Notice> : null}
      {customer?.id ? <input type="hidden" name="id" value={customer.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={error('name')} className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={customer?.name} required />
        </Field>

        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={customer?.phone ?? ''} />
        </Field>

        <Field label="Email" htmlFor="email" error={error('email')}>
          <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ''} />
        </Field>

        <Field label="Address" htmlFor="address_line1" className="sm:col-span-2">
          <Input
            id="address_line1"
            name="address_line1"
            placeholder="12 Elm Grove"
            defaultValue={customer?.address_line1}
          />
        </Field>

        <Field label="Address line 2" htmlFor="address_line2">
          <Input
            id="address_line2"
            name="address_line2"
            defaultValue={customer?.address_line2 ?? ''}
          />
        </Field>

        <Field label="Town" htmlFor="city">
          <Input id="city" name="city" defaultValue={customer?.city ?? ''} />
        </Field>

        <Field label="Postcode" htmlFor="postcode">
          <Input
            id="postcode"
            name="postcode"
            className="uppercase"
            defaultValue={customer?.postcode}
          />
        </Field>

        <Field label="Preferred contact" htmlFor="preferred_contact">
          <Select
            id="preferred_contact"
            name="preferred_contact"
            defaultValue={customer?.preferred_contact ?? 'phone'}
          >
            <option value="phone">Phone call</option>
            <option value="sms">Text message</option>
            <option value="email">Email</option>
            <option value="none">Do not contact</option>
          </Select>
        </Field>

        <Field label="Latitude" htmlFor="lat" hint="Optional — used by the round map.">
          <Input
            id="lat"
            name="lat"
            type="number"
            step="0.000001"
            inputMode="decimal"
            defaultValue={customer?.lat ?? ''}
          />
        </Field>

        <Field label="Longitude" htmlFor="lng">
          <Input
            id="lng"
            name="lng"
            type="number"
            step="0.000001"
            inputMode="decimal"
            defaultValue={customer?.lng ?? ''}
          />
        </Field>
      </div>

      <Field
        label="Getting in"
        htmlFor="access_notes"
        hint="Where the tap is, which gate, who to knock for. Your cleaners see this on the doorstep."
      >
        <Textarea
          id="access_notes"
          name="access_notes"
          placeholder="Locked side gate, key in the shed"
          defaultValue={customer?.access_notes ?? ''}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gate code" htmlFor="gate_code">
          <Input id="gate_code" name="gate_code" defaultValue={customer?.gate_code ?? ''} />
        </Field>
        <div className="flex items-end">
          <Checkbox
            name="dog_on_site"
            value="true"
            label="Dog on site"
            defaultChecked={customer?.dog_on_site ?? false}
            className="w-full"
          />
        </div>
      </div>

      <Field label="Office notes" htmlFor="notes" hint="Not shown to cleaners.">
        <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ''} />
      </Field>

      <input
        type="hidden"
        name="is_active"
        value={customer?.is_active === false ? 'false' : 'true'}
      />

      <SubmitButton size="lg" pendingLabel="Saving…">
        {customer?.id ? 'Save customer' : 'Add customer'}
      </SubmitButton>
    </form>
  );
}
