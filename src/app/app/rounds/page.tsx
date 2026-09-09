import type { Metadata } from 'next';
import { RoundsBoard, type RoundRowView } from '@/components/admin/RoundsBoard';
import { requireStaff } from '@/lib/auth';
import { getCustomers, getProperties, getRounds } from '@/lib/db/customers';
import { getCleaners } from '@/lib/db/staff';
import { createClient } from '@/lib/supabase/server';
import { todayInTimezone } from '@/lib/format';

export const metadata: Metadata = { title: 'Rounds' };

export default async function RoundsPage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);
  const supabase = createClient();

  const [rounds, customers, cleaners, properties, upcoming] = await Promise.all([
    getRounds(),
    getCustomers(),
    getCleaners(),
    getProperties(),
    supabase
      .from('jobs')
      .select('template_id, scheduled_date')
      .gte('scheduled_date', today)
      .eq('status', 'scheduled')
      .order('scheduled_date'),
  ]);

  const nextByTemplate = new Map<string, string>();
  for (const job of upcoming.data ?? []) {
    if (job.template_id && !nextByTemplate.has(job.template_id)) {
      nextByTemplate.set(job.template_id, job.scheduled_date);
    }
  }

  const rows: RoundRowView[] = rounds.map((round) => ({
    id: round.id,
    customer_id: round.customer_id,
    property_id: round.property_id,
    price: Number(round.price),
    duration_mins: round.duration_mins,
    frequency: round.frequency,
    anchor_date: round.anchor_date,
    assigned_cleaner: round.assigned_cleaner,
    is_active: round.is_active,
    instructions: round.instructions,
    customerName: round.customer?.name ?? 'Customer',
    customerPostcode: round.customer?.postcode ?? '',
    cleanerName: round.cleaner?.full_name ?? null,
    nextVisit: nextByTemplate.get(round.id) ?? null,
  }));

  return (
    <div className="space-y-5">
      <RoundsBoard
        rounds={rows}
        customers={customers.map((customer) => ({
          id: customer.id,
          label: `${customer.name} — ${customer.address_line1}`,
        }))}
        cleaners={cleaners.map((cleaner) => ({ id: cleaner.id, label: cleaner.full_name }))}
        properties={properties.map((property) => ({
          id: property.id,
          customerId: property.customer_id,
          label: `${property.label} — ${property.address_line1}`,
        }))}
        workingDays={viewer.company.working_days}
        today={today}
        openForCustomer={searchParams.customer}
      />
    </div>
  );
}
