import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { requireStaff } from '@/lib/auth';

export const metadata: Metadata = { title: 'Add customer' };

export default async function NewCustomerPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/app/customers" className="text-sm font-semibold text-blue-700">
        ← Customers
      </Link>
      <Card>
        <CardHeader title="Add a customer" subtitle="You can set up their round straight after." />
        <CardBody>
          <CustomerForm />
        </CardBody>
      </Card>
    </div>
  );
}
