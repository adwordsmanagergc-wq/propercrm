import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';

export default function JobNotFound() {
  return (
    <Card>
      <EmptyState
        title="That job is not yours"
        description="It may have been moved to someone else, or the day has passed."
        action={<ButtonLink href="/app">Back to my day</ButtonLink>}
      />
    </Card>
  );
}
