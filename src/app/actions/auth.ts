'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { getSiteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  magicLinkSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation';

/** Keeps an attacker from bouncing someone off to another site after sign-in. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app';
  return next;
}

export async function signUpAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await run(async () => {
    const input = parseForm(signUpSchema, formData);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // The company itself is created on /welcome, once there is a session —
        // the RPC needs an authenticated caller, which a pending email
        // confirmation does not give us.
        data: {
          full_name: input.fullName,
          company_name: input.companyName,
          phone: input.phone ?? null,
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/welcome`,
      },
    });

    if (error) {
      return fail(
        error.message.includes('already registered')
          ? 'There is already an account with that email. Try signing in.'
          : error.message,
      );
    }

    if (!data.session) {
      return ok(undefined, 'check-email');
    }
    return ok(undefined, 'signed-in');
  });

  if (result.ok && result.message === 'signed-in') redirect('/welcome');
  return result;
}

export async function signInAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let destination = '/app';

  const result = await run(async () => {
    const input = parseForm(signInSchema, formData);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return fail(
        error.message.toLowerCase().includes('invalid login')
          ? 'That email and password do not match.'
          : error.message,
      );
    }

    destination = safeNext(input.next);
    return ok(undefined);
  });

  if (result.ok) {
    revalidatePath('/', 'layout');
    redirect(destination);
  }
  return result;
}

export async function magicLinkAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const input = parseForm(magicLinkSchema, formData);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(input.next))}`,
      },
    });

    if (error) return fail(error.message);
    return ok(undefined, 'We have sent you a link. Open it on this phone to sign in.');
  });
}

export async function forgotPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const input = parseForm(forgotPasswordSchema, formData);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });

    // Never confirm whether an address is registered.
    if (error && !error.message.toLowerCase().includes('not found')) return fail(error.message);
    return ok(undefined, 'If that email is registered, a reset link is on its way.');
  });
}

export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await run(async () => {
    const input = parseForm(resetPasswordSchema, formData);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail('That reset link has expired. Please ask for a new one.');

    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) return fail(error.message);
    return ok(undefined);
  });

  if (result.ok) redirect('/app');
  return result;
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Called from /welcome: turns a fresh sign-up into a company plus an owner. */
export async function createCompanyAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const schema = z.object({
    companyName: z.string().trim().min(2, 'What is the business called?').max(120),
    fullName: z.string().trim().min(2, 'What is your name?').max(120),
    phone: z
      .string()
      .trim()
      .max(40)
      .transform((v) => (v === '' ? null : v))
      .optional(),
  });

  const result = await run(async () => {
    const input = parseForm(schema, formData);
    const supabase = createClient();

    const { error } = await supabase.rpc('create_company_and_owner', {
      p_company_name: input.companyName,
      p_full_name: input.fullName,
      p_phone: input.phone ?? null,
    });

    if (error) return fail(error.message);
    return ok(undefined);
  });

  if (result.ok) {
    revalidatePath('/', 'layout');
    redirect('/app/settings?welcome=1');
  }
  return result;
}

export async function acceptInviteAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const result = await run(async () => {
    const input = parseForm(acceptInviteSchema, formData);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return fail('Open the invite link from the email we sent you, then set your password.');
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password: input.password,
      data: { full_name: input.fullName },
    });
    if (passwordError) return fail(passwordError.message);

    const { error } = await supabase.rpc('accept_invite', { p_token: input.token });
    if (error) return fail(error.message);

    return ok(undefined);
  });

  if (result.ok) {
    revalidatePath('/', 'layout');
    redirect('/app');
  }
  return result;
}
