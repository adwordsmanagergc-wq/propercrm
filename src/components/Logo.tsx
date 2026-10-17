/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/cn';

/**
 * The squeegee-and-pane mark, the same artwork as the app icon. Decorative:
 * every link it sits in carries its own label. A plain <img>
 * rather than next/image so it renders identically on the offline shell.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('h-8 w-8 shrink-0 select-none', className)}
      draggable={false}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-grey-900">
        Proper <span className="text-blue-500">CRM</span>
      </span>
    </span>
  );
}
