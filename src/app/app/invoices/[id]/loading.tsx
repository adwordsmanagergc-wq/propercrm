import { Card } from '@/components/ui/Card';
import { ListSkeleton, Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Skeleton className="h-7 w-40" />
      <Card>
        <ListSkeleton rows={4} />
      </Card>
    </div>
  );
}
