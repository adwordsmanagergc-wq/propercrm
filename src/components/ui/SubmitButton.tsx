'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';

/**
 * Disables itself while its form is in flight, so a cleaner with a poor signal
 * cannot double-submit a completion.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
