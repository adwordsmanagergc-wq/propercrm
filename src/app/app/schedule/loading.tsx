import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-40" />
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      </Card>
    </div>
  );
}
