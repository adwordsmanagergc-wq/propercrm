'use client';

import { useFormState } from 'react-dom';
import {
  acceptInviteAction,
  createCompanyAction,
  forgotPasswordAction,
  resetPasswordAction,
} from '@/app/actions/auth';
import { Field, Input, Notice } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ForgotPasswordForm() {
  const [state, action] = useFormState(forgotPasswordAction, undefined);

  if (state?.ok && state.message) return <Notice tone="success">{state.message}</Notice>;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useFormState(resetPasswordAction, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}

export function CreateCompanyForm({
  defaultCompanyName,
  defaultFullName,
  defaultPhone,
}: {
  defaultCompanyName?: string;
  defaultFullName?: string;
  defaultPhone?: string;
}) {
  const [state, action] = useFormState(createCompanyAction, undefined);
  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <Field label="Business name" htmlFor="companyName" error={fieldError('companyName')}>
        <Input
          id="companyName"
          name="companyName"
          defaultValue={defaultCompanyName}
          autoComplete="organization"
          required
        />
      </Field>
      <Field label="Your name" htmlFor="fullName" error={fieldError('fullName')}>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={defaultFullName}
          autoComplete="name"
          required
        />
      </Field>
      <Field label="Mobile" htmlFor="phone" hint="Optional.">
        <Input id="phone" name="phone" type="tel" defaultValue={defaultPhone} autoComplete="tel" />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Creating…">
        Create my company
      </SubmitButton>
    </form>
  );
}

export function AcceptInviteForm({
  token,
  defaultFullName,
}: {
  token: string;
  defaultFullName?: string;
}) {
  const [state, action] = useFormState(acceptInviteAction, undefined);
  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" htmlFor="fullName" error={fieldError('fullName')}>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={defaultFullName}
          autoComplete="name"
          required
        />
      </Field>
      <Field
        label="Choose a password"
        htmlFor="password"
        hint="At least 8 characters."
        error={fieldError('password')}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Joining…">
        Join the team
      </SubmitButton>
    </form>
  );
}
