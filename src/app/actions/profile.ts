'use server';

import { revalidatePath } from 'next/cache';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validation';

export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertViewer();
    const input = parseForm(profileSchema, formData);
    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: input.full_name, phone: input.phone ?? null })
      .eq('id', viewer.userId);

    if (error) return fail(error.message);

    revalidatePath('/app', 'layout');
    return ok(undefined, 'Saved');
  });
}
