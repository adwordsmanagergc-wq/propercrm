import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';

export default function CustomerNotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        title="We cannot find that customer"
        description="They may have been removed, or the link may be out of date."
        action={<ButtonLink href="/app/customers">Back to customers</ButtonLink>}
      />
    </Card>
  );
}
