import { Card } from '@/components/ui/Card';
import { ListSkeleton, Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-[28rem] rounded-card lg:h-[36rem]" />
        <Card>
          <ListSkeleton rows={8} />
        </Card>
      </div>
    </div>
  );
}
