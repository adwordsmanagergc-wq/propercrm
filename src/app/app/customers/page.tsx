import type { Metadata } from 'next';
import { CustomerTable, type CustomerRowView } from '@/components/admin/CustomerTable';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requireStaff } from '@/lib/auth';
import { getCustomerSummaries, getCustomers } from '@/lib/db/customers';
import { todayInTimezone } from '@/lib/format';
import type { Frequency } from '@/lib/types/database';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage() {
  const viewer = await requireStaff();
  const today = todayInTimezone(viewer.company.timezone);

  const [customers, summaries] = await Promise.all([getCustomers(), getCustomerSummaries(today)]);

  const rows: CustomerRowView[] = customers.map((customer) => {
    const summary = summaries.get(customer.id);
    return {
      id: customer.id,
      name: customer.name,
      addressLine1: customer.address_line1,
      postcode: customer.postcode,
      isActive: customer.is_active,
      frequency: (summary?.frequency as Frequency | null) ?? null,
      nextVisit: summary?.nextVisit ?? null,
      balance: summary?.balance ?? 0,
      lifetimeValue: summary?.lifetimeValue ?? 0,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <p className="text-grey-500">Your round book.</p>
        </div>
        <ButtonLink href="/app/customers/new">Add customer</ButtonLink>
      </div>

      <Card>
        <CustomerTable customers={rows} />
      </Card>
    </div>
  );
}
