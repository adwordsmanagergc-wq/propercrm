import type { RequestView } from '@/components/admin/RequestList';
import type { RequestKind } from '@/lib/types/database';

type Row = {
  id: string;
  kind: RequestKind;
  message: string | null;
  created_at: string;
  customer_id: string;
  job: { scheduled_date: string } | { scheduled_date: string }[] | null;
  customer: { name: string } | { name: string }[] | null;
};

export function toRequestViews(rows: Row[]): RequestView[] {
  return rows.map((row) => {
    const job = Array.isArray(row.job) ? row.job[0] : row.job;
    const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
    return {
      id: row.id,
      kind: row.kind,
      message: row.message,
      createdAt: row.created_at,
      customerId: row.customer_id,
      customerName: customer?.name ?? 'Customer',
      jobDate: job?.scheduled_date ?? null,
    };
  });
}
