'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, parseForm, run, type ActionResult } from '@/lib/actions';
import { assertStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { customerSchema, propertySchema, uuid } from '@/lib/validation';

export async function saveCustomerAction(
  _prev: ActionResult<string> | undefined,
  formData: FormData,
): Promise<ActionResult<string>> {
  let created: string | null = null;

  const result = await run<string>(async () => {
    const viewer = await assertStaff();
    const input = parseForm(customerSchema, formData);
    const supabase = createClient();

    const values = {
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address_line1: input.address_line1,
      address_line2: input.address_line2 ?? null,
      city: input.city ?? null,
      postcode: input.postcode.toUpperCase(),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      access_notes: input.access_notes ?? null,
      gate_code: input.gate_code ?? null,
      dog_on_site: input.dog_on_site,
      preferred_contact: input.preferred_contact,
      is_active: input.is_active,
      notes: input.notes ?? null,
    };

    if (input.id) {
      const { error } = await supabase.from('customers').update(values).eq('id', input.id);
      if (error) return fail(error.message);
      revalidatePath(`/app/customers/${input.id}`);
      revalidatePath('/app/customers');
      return ok(input.id, 'Customer saved');
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ ...values, company_id: viewer.company.id })
      .select('id')
      .single();

    if (error) return fail(error.message);
    created = data.id;
    revalidatePath('/app/customers');
    return ok(data.id, 'Customer added');
  });

  if (result.ok && created) redirect(`/app/customers/${created}`);
  return result;
}

export async function archiveCustomerAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { customerId, isActive } = z
      .object({ customerId: uuid, isActive: z.boolean() })
      .parse(input);
    const supabase = createClient();

    const { error } = await supabase
      .from('customers')
      .update({ is_active: isActive })
      .eq('id', customerId);
    if (error) return fail(error.message);

    // Stopping a customer stops their rounds too, or the generator keeps
    // booking visits to a house nobody is going to.
    if (!isActive) {
      await supabase
        .from('job_templates')
        .update({ is_active: false })
        .eq('customer_id', customerId);
      await supabase
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('customer_id', customerId)
        .eq('status', 'scheduled');
    }

    revalidatePath('/app/customers');
    revalidatePath(`/app/customers/${customerId}`);
    return ok(undefined, isActive ? 'Customer made active again' : 'Customer stopped');
  });
}

export async function savePropertyAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  return run(async () => {
    const viewer = await assertStaff();
    const input = parseForm(propertySchema, formData);
    const supabase = createClient();

    const values = {
      customer_id: input.customer_id,
      label: input.label,
      address_line1: input.address_line1,
      address_line2: input.address_line2 ?? null,
      city: input.city ?? null,
      postcode: input.postcode.toUpperCase(),
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      window_count: input.window_count ?? null,
      storeys: input.storeys ?? null,
      has_conservatory: input.has_conservatory,
      price: input.price ?? null,
      access_notes: input.access_notes ?? null,
    };

    const { error } = input.id
      ? await supabase.from('properties').update(values).eq('id', input.id)
      : await supabase.from('properties').insert({ ...values, company_id: viewer.company.id });

    if (error) return fail(error.message);

    revalidatePath(`/app/customers/${input.customer_id}`);
    return ok(undefined, 'Property saved');
  });
}

export async function deletePropertyAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await assertStaff();
    const { propertyId, customerId } = z
      .object({ propertyId: uuid, customerId: uuid })
      .parse(input);
    const supabase = createClient();

    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) return fail(error.message);

    revalidatePath(`/app/customers/${customerId}`);
    return ok(undefined, 'Property removed');
  });
}
