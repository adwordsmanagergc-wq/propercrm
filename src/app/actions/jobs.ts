'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertStaff, assertViewer } from '@/lib/auth';
import { nearestNeighbourOrder } from '@/lib/route';
import { createClient } from '@/lib/supabase/server';
import {
  bulkAssignSchema,
  completeJobSchema,
  jobSchema,
  moveJobSchema,
  optimiseRouteSchema,
  skipJobSchema,
  startJobSchema,
  uuid,
} from '@/lib/validation';

function revalidateJobViews() {
  revalidatePath('/app');
  revalidatePath('/app/schedule');
  revalidatePath('/app/map');
}

/** Drag a job to another day, another cleaner, or both. */
export async function moveJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { jobId, scheduled_date, assigned_to } = moveJobSchema.parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('jobs')
      .update({ scheduled_date, assigned_to: assigned_to ?? null })
      .eq('id', jobId);

    if (error) return fail(error.message);
    revalidateJobViews();
    return ok(undefined, 'Job moved');
  });
}

export async function assignJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const schema = z.object({
      jobId: uuid,
      assigned_to: z
        .union([uuid, z.literal('unassigned')])
        .transform((value) => (value === 'unassigned' ? null : value)),
    });
    const { jobId, assigned_to } = schema.parse(input);
    const supabase = createClient();

    const { error } = await supabase.from('jobs').update({ assigned_to }).eq('id', jobId);
    if (error) return fail(error.message);

    revalidateJobViews();
    return ok(undefined, 'Job reassigned');
  });
}

/** "Everything on Tuesday is Dave's" — one action, not thirty drags. */
export async function bulkAssignDayAction(input: unknown): Promise<ActionResult<number>> {
  return run(async () => {
    await assertStaff();
    const { date, cleanerId, onlyUnassigned } = bulkAssignSchema.parse(input);
    const supabase = createClient();

    let query = supabase
      .from('jobs')
      .update({ assigned_to: cleanerId })
      .eq('scheduled_date', date)
      .in('status', ['scheduled']);

    if (onlyUnassigned) query = query.is('assigned_to', null);

    const { data, error } = await query.select('id');
    if (error) return fail(error.message);

    revalidateJobViews();
    const count = data?.length ?? 0;
    return ok(count, `${count} ${count === 1 ? 'job' : 'jobs'} assigned`);
  });
}

/**
 * Reorders a day into driving order, nearest-neighbour from the company's
 * yard, and writes the new sequence back.
 */
export async function optimiseRouteAction(input: unknown): Promise<ActionResult<number>> {
  return run(async () => {
    await assertStaff();
    const { date, cleanerId } = optimiseRouteSchema.parse(input);
    const supabase = createClient();

    const [{ data: company }, jobsQuery] = await Promise.all([
      supabase.from('companies').select('start_lat, start_lng').maybeSingle(),
      (async () => {
        let query = supabase
          .from('jobs')
          .select('id, sequence, customer:customers(lat, lng), property:properties(lat, lng)')
          .eq('scheduled_date', date)
          .neq('status', 'cancelled');
        if (cleanerId) query = query.eq('assigned_to', cleanerId);
        return query;
      })(),
    ]);

    if (jobsQuery.error) return fail(jobsQuery.error.message);
    const jobs = jobsQuery.data ?? [];
    if (jobs.length === 0) return fail('There are no jobs to put in order on that day');

    const points = jobs.map((job) => ({
      id: job.id,
      lat: job.property?.lat ?? job.customer?.lat ?? null,
      lng: job.property?.lng ?? job.customer?.lng ?? null,
    }));

    const start =
      typeof company?.start_lat === 'number' && typeof company?.start_lng === 'number'
        ? { lat: company.start_lat, lng: company.start_lng }
        : null;

    const ordered = nearestNeighbourOrder(points, start);

    const updates = ordered.map((point, index) =>
      supabase
        .from('jobs')
        .update({ sequence: index + 1 })
        .eq('id', point.id),
    );
    const results = await Promise.all(updates);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) return fail(firstError.message);

    revalidateJobViews();
    return ok(ordered.length, `${ordered.length} jobs put in driving order`);
  });
}

export async function createJobAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const input = parseForm(jobSchema, formData);
    const supabase = createClient();

    const { error } = await supabase.from('jobs').insert({
      company_id: viewer.company.id,
      customer_id: input.customer_id,
      property_id: input.property_id ?? null,
      scheduled_date: input.scheduled_date,
      assigned_to: input.assigned_to ?? null,
      price: input.price,
      duration_mins: input.duration_mins,
      notes: input.notes ?? null,
      status: 'scheduled',
    });

    if (error) return fail(error.message);
    revalidateJobViews();
    return ok(undefined, 'One-off job added');
  });
}

export async function updateJobAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const schema = jobSchema.extend({ id: uuid });
    const input = parseForm(schema, formData);
    const supabase = createClient();

    const { error } = await supabase
      .from('jobs')
      .update({
        scheduled_date: input.scheduled_date,
        assigned_to: input.assigned_to ?? null,
        price: input.price,
        duration_mins: input.duration_mins,
        notes: input.notes ?? null,
      })
      .eq('id', input.id);

    if (error) return fail(error.message);
    revalidateJobViews();
    return ok(undefined, 'Job updated');
  });
}

export async function cancelJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { jobId } = z.object({ jobId: uuid }).parse(input);
    const supabase = createClient();

    const { error } = await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', jobId);
    if (error) return fail(error.message);

    revalidateJobViews();
    return ok(undefined, 'Job cancelled');
  });
}

// ---------------------------------------------------------------------------
// Status changes. These go through the same RPCs the cleaner app uses, so the
// photo rule and the round roll-forward behave identically from the office.
// ---------------------------------------------------------------------------
export async function startJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertViewer();
    const { jobId, lat, lng } = startJobSchema.parse(input);
    const supabase = createClient();

    const { error } = await supabase.rpc('start_job', {
      p_job: jobId,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
    });
    if (error) return fail(error.message);

    revalidateJobViews();
    return ok(undefined, 'Started');
  });
}

export async function completeJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertViewer();
    const { jobId, lat, lng, notes } = completeJobSchema.parse(input);
    const supabase = createClient();

    const { error } = await supabase.rpc('complete_job', {
      p_job: jobId,
      p_lat: lat ?? null,
      p_lng: lng ?? null,
      p_notes: notes ?? null,
    });
    if (error) return fail(error.message);

    revalidateJobViews();
    return ok(undefined, 'Marked as done');
  });
}

export async function skipJobAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertViewer();
    const { jobId, reason, notes } = skipJobSchema.parse(input);
    const supabase = createClient();

    const { error } = await supabase.rpc('skip_job', {
      p_job: jobId,
      p_reason: reason,
      p_notes: notes ?? null,
    });
    if (error) return fail(error.message);

    revalidateJobViews();
    return ok(undefined, 'Marked as missed');
  });
}

export async function saveJobNoteAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { jobId, notes } = z
      .object({ jobId: uuid, notes: z.string().trim().max(2000) })
      .parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('jobs')
      .update({ notes: notes === '' ? null : notes })
      .eq('id', jobId);

    if (error) return fail(error.message);
    revalidateJobViews();
    return ok(undefined, 'Note saved');
  });
}
