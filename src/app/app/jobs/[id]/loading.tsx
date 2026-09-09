import { Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-16 rounded-btn" />
    </div>
  );
}
