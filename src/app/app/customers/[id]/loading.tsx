import { Card } from '@/components/ui/Card';
import { ListSkeleton, Skeleton, StatSkeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-56" />
      <StatSkeleton tiles={4} />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <ListSkeleton rows={6} />
        </Card>
        <Card>
          <ListSkeleton rows={4} />
        </Card>
      </div>
    </div>
  );
}
