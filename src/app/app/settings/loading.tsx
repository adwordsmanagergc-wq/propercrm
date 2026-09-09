import { Card } from '@/components/ui/Card';
import { ListSkeleton, Skeleton, StatSkeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <StatSkeleton tiles={4} />
      <Card>
        <ListSkeleton rows={8} />
      </Card>
    </div>
  );
}
