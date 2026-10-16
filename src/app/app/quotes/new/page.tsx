import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, format, parseISO } from 'date-fns';
import { QuoteBuilder, type QuoteDraft } from '@/components/admin/QuoteBuilder';
import { Card, CardBody } from '@/components/ui/Card';
import { requireStaff } from '@/lib/auth';
import { getCustomers } from '@/lib/db/customers';
import { getCompany } from '@/lib/db/staff';
import { todayInTimezone } from '@/lib/format';

export const metadata: Metadata = { title: 'New quote' };

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  const viewer = await requireStaff();
  const [customers, company] = await Promise.all([getCustomers(), getCompany()]);
  const today = parseISO(todayInTimezone(viewer.company.timezone));
  const prefill = customers.find((c) => c.id === searchParams.customer);

  const initial: QuoteDraft = {
    customer_id: prefill?.id ?? null,
    contact_name: prefill?.name ?? '',
    contact_email: prefill?.email ?? '',
    contact_phone: prefill?.phone ?? '',
    address_line1: prefill?.address_line1 ?? '',
    address_line2: prefill?.address_line2 ?? '',
    city: prefill?.city ?? '',
    postcode: prefill?.postcode ?? '',
    frequency: '4weekly',
    duration_mins: 30,
    proposed_start: '',
    valid_until: format(addDays(today, company?.quote_valid_days ?? 30), 'yyyy-MM-dd'),
    message: '',
    lines: [{ description: 'Windows, outside', quantity: 1, unit_price: 15 }],
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/app/quotes" className="text-sm font-semibold text-blue-700">
        ← Quotes
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">New quote</h1>
      <Card>
        <CardBody>
          <QuoteBuilder
            initial={initial}
            customers={customers
              .filter((c) => c.is_active)
              .map(({ id, name, email, phone, address_line1, address_line2, city, postcode }) => ({
                id,
                name,
                email,
                phone,
                address_line1,
                address_line2,
                city,
                postcode,
              }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
