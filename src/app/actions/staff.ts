'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertOwner, assertStaff } from '@/lib/auth';
import { getSiteUrl } from '@/lib/env';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { inviteSchema, staffUpdateSchema, uuid } from '@/lib/validation';

export interface InviteResult {
  link: string;
  emailed: boolean;
}

/**
 * Creates the invite row, then tries to email the link. If the email cannot go
 * out — no service key configured, or the address already has an account — the
 * link comes back so it can be sent by hand. An invite is never silently lost.
 */
export async function inviteStaffAction(
  _prev: ActionResult<InviteResult> | undefined,
  formData: FormData,
): Promise<ActionResult<InviteResult>> {
  return run<InviteResult>(async () => {
    const viewer = await assertStaff();
    const input = parseForm(inviteSchema, formData);

    if (input.role === 'owner' && !viewer.isOwner) {
      return fail('Only the owner can invite another owner');
    }

    const supabase = createClient();

    // Replace any invite still outstanding for that address.
    await supabase.from('invites').delete().eq('email', input.email).is('accepted_at', null);

    const { data, error } = await supabase
      .from('invites')
      .insert({
        company_id: viewer.company.id,
        email: input.email,
        role: input.role,
        full_name: input.fullName ?? null,
        invited_by: viewer.userId,
      })
      .select('token')
      .single();

    if (error) return fail(error.message);

    const link = `${getSiteUrl()}/accept-invite?token=${data.token}`;
    let emailed = false;

    try {
      const service = createServiceClient();
      const { error: inviteError } = await service.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: link,
        data: { full_name: input.fullName ?? null, company_name: viewer.company.name },
      });
      emailed = !inviteError;
    } catch {
      emailed = false;
    }

    revalidatePath('/app/staff');
    return ok(
      { link, emailed },
      emailed ? `Invite emailed to ${input.email}` : 'Invite ready — send them the link below',
    );
  });
}

export async function cancelInviteAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { inviteId } = z.object({ inviteId: uuid }).parse(input);
    const supabase = createClient();

    const { error } = await supabase.from('invites').delete().eq('id', inviteId);
    if (error) return fail(error.message);

    revalidatePath('/app/staff');
    return ok(undefined, 'Invite cancelled');
  });
}

export async function updateStaffAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const parsed = staffUpdateSchema.parse(input);

    // Changing a role is the owner's alone; the database enforces this too.
    if (parsed.role !== undefined) await assertOwner();
    else await assertStaff();

    const supabase = createClient();
    const values: { role?: typeof parsed.role; is_active?: boolean } = {};
    if (parsed.role !== undefined) values.role = parsed.role;
    if (parsed.is_active !== undefined) values.is_active = parsed.is_active;

    if (Object.keys(values).length === 0) return ok(undefined, 'Nothing to change');

    const { error } = await supabase.from('profiles').update(values).eq('id', parsed.profileId);
    if (error) return fail(error.message);

    revalidatePath('/app/staff');
    return ok(undefined, 'Saved');
  });
}
