'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { magicLinkAction, signInAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Notice } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function SignInForm({ next, linkExpired }: { next?: string; linkExpired?: boolean }) {
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [passwordState, passwordAction] = useFormState(signInAction, undefined);
  const [magicState, magicAction] = useFormState(magicLinkAction, undefined);

  const state = mode === 'password' ? passwordState : magicState;

  return (
    <div className="space-y-4">
      {linkExpired ? (
        <Notice tone="error">That link has expired. Sign in below, or ask for a new one.</Notice>
      ) : null}
      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {magicState?.ok && magicState.message ? (
        <Notice tone="success">{magicState.message}</Notice>
      ) : null}

      {mode === 'password' ? (
        <form action={passwordAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next ?? '/app'} />

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

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      ) : (
        <form action={magicAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next ?? '/app'} />
          <Field
            label="Email"
            htmlFor="magic-email"
            hint="We will email you a link — no password to remember."
          >
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
          </Field>
          <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
            Email me a link
          </SubmitButton>
        </form>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
      >
        {mode === 'password' ? 'Email me a link instead' : 'Use my password instead'}
      </Button>
    </div>
  );
}
