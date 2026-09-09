'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createInvoiceSchema, markPaidSchema, uuid } from '@/lib/validation';

function revalidateInvoiceViews(invoiceId?: string) {
  revalidatePath('/app/invoices');
  if (invoiceId) revalidatePath(`/app/invoices/${invoiceId}`);
}

/**
 * Raises one invoice from a batch of completed jobs. The numbering, the lines
 * and the "already invoiced" flags all happen inside a single database call,
 * so two people clicking at once cannot end up with the same invoice number.
 */
export async function createInvoiceAction(input: unknown): Promise<ActionResult<string>> {
  let created: string | null = null;

  const result = await run<string>(async () => {
    await assertStaff();
    const { customerId, jobIds, notes } = createInvoiceSchema.parse(input);
    const supabase = createClient();

    const { data, error } = await supabase.rpc('create_invoice_from_jobs', {
      p_customer: customerId,
      p_job_ids: jobIds,
      p_notes: notes ?? null,
    });

    if (error) return fail(error.message);
    created = data;
    revalidateInvoiceViews();
    revalidatePath('/app/customers');
    return ok(data, 'Invoice raised');
  });

  if (result.ok && created) redirect(`/app/invoices/${created}`);
  return result;
}

export async function markInvoiceSentAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { invoiceId } = z.object({ invoiceId: uuid }).parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('status', 'draft');

    if (error) return fail(error.message);
    revalidateInvoiceViews(invoiceId);
    return ok(undefined, 'Marked as sent');
  });
}

export async function markInvoicePaidAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { invoiceId, method, paidOn } = markPaidSchema.parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        payment_method: method,
        paid_at: new Date(`${paidOn}T12:00:00Z`).toISOString(),
      })
      .eq('id', invoiceId);

    if (error) return fail(error.message);
    revalidateInvoiceViews(invoiceId);
    revalidatePath('/app/customers');
    return ok(undefined, 'Marked as paid');
  });
}

export async function voidInvoiceAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { invoiceId } = z.object({ invoiceId: uuid }).parse(input);
    const supabase = createClient();

    // Releasing the lines puts their jobs back in the "to invoice" pile —
    // that is handled by the invoice_lines_release_job trigger.
    const { error: linesError } = await supabase
      .from('invoice_lines')
      .delete()
      .eq('invoice_id', invoiceId);
    if (linesError) return fail(linesError.message);

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'void', paid_at: null, payment_method: null })
      .eq('id', invoiceId);

    if (error) return fail(error.message);
    revalidateInvoiceViews(invoiceId);
    return ok(undefined, 'Invoice voided and its jobs released');
  });
}
