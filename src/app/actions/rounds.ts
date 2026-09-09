'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { addDaysISO, todayInTimezone } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { roundSchema, uuid } from '@/lib/validation';

const TOPUP_WEEKS = 8;

function revalidateRoundViews(customerId?: string) {
  revalidatePath('/app/rounds');
  revalidatePath('/app/schedule');
  revalidatePath('/app');
  if (customerId) revalidatePath(`/app/customers/${customerId}`);
}

/**
 * Creates or edits a round. On save the schedule is topped up eight weeks
 * ahead, so a new round has visits in the diary straight away.
 */
export async function saveRoundAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let goTo: string | null = null;

  const result = await run(async () => {
    const viewer = await assertStaff();
    const input = parseForm(roundSchema, formData);
    const supabase = createClient();

    const values = {
      customer_id: input.customer_id,
      property_id: input.property_id ?? null,
      price: input.price,
      duration_mins: input.duration_mins,
      frequency: input.frequency,
      anchor_date: input.anchor_date,
      assigned_cleaner: input.assigned_cleaner ?? null,
      is_active: input.is_active,
      instructions: input.instructions ?? null,
    };

    let roundId = input.id;

    if (roundId) {
      const { error } = await supabase.from('job_templates').update(values).eq('id', roundId);
      if (error) return fail(error.message);

      // Push the change onto jobs that have not been started. "Future only"
      // leaves today alone; "all unstarted" catches today's round too.
      const today = todayInTimezone(viewer.company.timezone);
      const from = input.applyTo === 'all_unstarted' ? today : addDaysISO(today, 1);

      const { error: jobsError } = await supabase
        .from('jobs')
        .update({
          price: input.price,
          duration_mins: input.duration_mins,
          assigned_to: input.assigned_cleaner ?? null,
          property_id: input.property_id ?? null,
        })
        .eq('template_id', roundId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', from);

      if (jobsError) return fail(jobsError.message);

      if (!input.is_active) {
        await supabase
          .from('jobs')
          .update({ status: 'cancelled' })
          .eq('template_id', roundId)
          .eq('status', 'scheduled')
          .gte('scheduled_date', today);
      }
    } else {
      const { data, error } = await supabase
        .from('job_templates')
        .insert({ ...values, company_id: viewer.company.id })
        .select('id')
        .single();
      if (error) return fail(error.message);
      roundId = data.id;
      goTo = '/app/rounds';
    }

    if (input.is_active && roundId) {
      const { error } = await supabase.rpc('generate_jobs_for_template', {
        p_template: roundId,
        p_until: addDaysISO(todayInTimezone(viewer.company.timezone), TOPUP_WEEKS * 7),
      });
      if (error) return fail(error.message);
    }

    revalidateRoundViews(input.customer_id);
    return ok(undefined, 'Round saved');
  });

  if (result.ok && goTo) redirect(goTo);
  return result;
}

export async function deleteRoundAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const { roundId } = z.object({ roundId: uuid }).parse(input);
    const supabase = createClient();

    const today = todayInTimezone(viewer.company.timezone);

    // Deactivate rather than delete: the completed visits are the customer's
    // history and the invoices point at them.
    const { error } = await supabase
      .from('job_templates')
      .update({ is_active: false })
      .eq('id', roundId);
    if (error) return fail(error.message);

    await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('template_id', roundId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', today);

    revalidateRoundViews();
    return ok(undefined, 'Round stopped');
  });
}

/** Fills the diary eight weeks out. Also runs nightly from /api/cron/topup. */
export async function topUpScheduleAction(): Promise<ActionResult<number>> {
  return run(async () => {
    const viewer = await assertStaff();
    const supabase = createClient();

    const { data, error } = await supabase.rpc('topup_company_schedule', {
      p_company: viewer.company.id,
      p_weeks: TOPUP_WEEKS,
    });
    if (error) return fail(error.message);

    revalidateRoundViews();
    const created = Number(data ?? 0);
    return ok(created, created === 0 ? 'The diary is already full' : `${created} visits booked in`);
  });
}
