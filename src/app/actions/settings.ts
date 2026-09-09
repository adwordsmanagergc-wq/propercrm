'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { settingsSchema } from '@/lib/validation';

export async function saveSettingsAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const input = parseForm(settingsSchema, formData);
    const supabase = createClient();

    const { error } = await supabase
      .from('companies')
      .update({
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        timezone: input.timezone,
        start_postcode: input.start_postcode?.toUpperCase() ?? null,
        start_lat: input.start_lat ?? null,
        start_lng: input.start_lng ?? null,
        working_days: input.working_days.sort((a, b) => a - b),
        invoice_prefix: input.invoice_prefix.toUpperCase(),
        payment_terms_days: input.payment_terms_days,
        bank_name: input.bank_name ?? null,
        bank_account_name: input.bank_account_name ?? null,
        bank_sort_code: input.bank_sort_code ?? null,
        bank_account_number: input.bank_account_number ?? null,
        invoice_footer: input.invoice_footer ?? null,
      })
      .eq('id', viewer.company.id);

    if (error) return fail(error.message);

    revalidatePath('/app', 'layout');
    return ok(undefined, 'Settings saved');
  });
}

export async function saveLogoAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { logoUrl } = z.object({ logoUrl: z.string().url().max(500).nullable() }).parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('companies')
      .update({ logo_url: logoUrl })
      .eq('id', viewer.company.id);

    if (error) return fail(error.message);

    revalidatePath('/app', 'layout');
    return ok(undefined, logoUrl ? 'Logo saved' : 'Logo removed');
  });
}
