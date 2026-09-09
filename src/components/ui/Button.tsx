import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-card',
  secondary: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 active:bg-blue-100',
  ghost: 'bg-transparent text-grey-500 hover:bg-blue-50 hover:text-blue-700',
  danger: 'bg-white text-danger border border-grey-200 hover:bg-blue-50',
  success: 'bg-success text-white hover:brightness-95 active:brightness-90 shadow-card',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-base gap-2',
  lg: 'h-14 px-6 text-lg gap-2.5',
  // Deliberately huge: the cleaner's main action, tapped with wet gloves on.
  xl: 'h-16 px-6 text-xl w-full gap-3',
};

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) =>
  cn(
    'inline-flex items-center justify-center rounded-btn font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
