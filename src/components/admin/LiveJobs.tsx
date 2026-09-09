'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Keeps the office screen in step with the vans. Any change to a job in this
 * company nudges a refresh; RLS means we only ever hear about our own.
 */
export function LiveJobs({ companyId }: { companyId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`jobs:${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `company_id=eq.${companyId}` },
        () => {
          // A cleaner finishing a job fires several changes at once; coalesce.
          clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 400);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [companyId, router]);

  return null;
}
