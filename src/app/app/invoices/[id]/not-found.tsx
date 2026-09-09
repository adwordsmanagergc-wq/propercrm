import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';

export default function InvoiceNotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        title="We cannot find that invoice"
        description="It may have been deleted, or the link may be out of date."
        action={<ButtonLink href="/app/invoices">Back to invoices</ButtonLink>}
      />
    </Card>
  );
}
