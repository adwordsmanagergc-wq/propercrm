import { Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-card" />
      ))}
    </div>
  );
}
