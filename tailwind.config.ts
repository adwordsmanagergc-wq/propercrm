import type { Config } from 'tailwindcss';

/**
 * Every colour below maps to a CSS custom property defined in `globals.css`
 * (as RGB channels, so opacity modifiers like `bg-grey-900/80` work).
 * Components must use these token names — never a raw hex value.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: 'rgb(var(--blue-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--blue-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--blue-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--blue-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--blue-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--blue-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--blue-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--blue-700-rgb) / <alpha-value>)',
          900: 'rgb(var(--blue-900-rgb) / <alpha-value>)',
        },
        grey: {
          50: 'rgb(var(--grey-50-rgb) / <alpha-value>)',
          200: 'rgb(var(--grey-200-rgb) / <alpha-value>)',
          500: 'rgb(var(--grey-500-rgb) / <alpha-value>)',
          900: 'rgb(var(--grey-900-rgb) / <alpha-value>)',
        },
        white: 'rgb(var(--white-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10, 42, 48, 0.04), 0 4px 16px rgba(10, 42, 48, 0.06)',
        pop: '0 8px 32px rgba(10, 42, 48, 0.14)',
        sticky: '0 -4px 20px rgba(10, 42, 48, 0.08)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        // One scale. Three sizes per screen, maximum.
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.65rem' }],
        xl: ['1.375rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.15rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.6rem' }],
        '4xl': ['3rem', { lineHeight: '3.3rem' }],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
