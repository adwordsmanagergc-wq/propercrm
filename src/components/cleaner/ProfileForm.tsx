'use client';

import { useFormState } from 'react-dom';
import { updateProfileAction } from '@/app/actions/profile';
import { Field, Input, Notice } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const [state, action] = useFormState(updateProfileAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.ok && state.message ? <Notice tone="success">{state.message}</Notice> : null}
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}

      <Field label="Your name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          autoComplete="name"
          required
        />
      </Field>
      <Field label="Mobile" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <Field label="Email" htmlFor="email" hint="Ask the office if this needs changing.">
        <Input id="email" value={email} readOnly disabled />
      </Field>

      <SubmitButton size="lg" className="w-full" pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
