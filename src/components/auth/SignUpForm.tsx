'use client';

import { useFormState } from 'react-dom';
import { signUpAction } from '@/app/actions/auth';
import { Field, Input, Notice } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function SignUpForm() {
  const [state, action] = useFormState(signUpAction, undefined);
  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);

  if (state?.ok && state.message === 'check-email') {
    return (
      <Notice tone="success">
        Check your email and click the link to finish setting up your account.
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}

      <Field label="Business name" htmlFor="companyName" error={fieldError('companyName')}>
        <Input
          id="companyName"
          name="companyName"
          autoComplete="organization"
          placeholder="Crystal Clear Windows"
          required
        />
      </Field>

      <Field label="Your name" htmlFor="fullName" error={fieldError('fullName')}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Ray Bennett"
          required
        />
      </Field>

      <Field label="Email" htmlFor="email" error={fieldError('email')}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>

      <Field label="Mobile" htmlFor="phone" hint="Optional — so your cleaners can reach you.">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" />
      </Field>

      <Field
        label="Password"
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

      <SubmitButton size="lg" className="w-full" pendingLabel="Setting up…">
        Start free trial
      </SubmitButton>
    </form>
  );
}
