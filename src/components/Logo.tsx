import { cn } from '@/lib/cn';

/** The window-pane mark, matched to the app icon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-8 w-8', className)}
      role="img"
      aria-label="Proper CRM"
    >
      <rect width="32" height="32" rx="8" fill="var(--blue-500)" />
      <rect x="7" y="7" width="18" height="18" rx="2.5" stroke="white" strokeWidth="2.2" />
      <path d="M16 7v18M7 16h18" stroke="white" strokeWidth="2.2" />
      <path d="M9.5 22.5 22.5 9.5" stroke="white" strokeOpacity="0.55" strokeWidth="2.2" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-grey-900">
        Proper CRM
      </span>
    </span>
  );
}
