import type { Config } from 'tailwindcss';

/**
 * Every colour below maps to a CSS custom property defined in `globals.css`.
 * Components must use these token names — never a raw hex value.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: 'var(--blue-50)',
          100: 'var(--blue-100)',
          200: 'var(--blue-200)',
          300: 'var(--blue-300)',
          400: 'var(--blue-400)',
          500: 'var(--blue-500)',
          600: 'var(--blue-600)',
          700: 'var(--blue-700)',
          900: 'var(--blue-900)',
        },
        grey: {
          50: 'var(--grey-50)',
          200: 'var(--grey-200)',
          500: 'var(--grey-500)',
          900: 'var(--grey-900)',
        },
        white: 'var(--white)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(8, 53, 95, 0.04), 0 4px 16px rgba(8, 53, 95, 0.06)',
        pop: '0 8px 32px rgba(8, 53, 95, 0.14)',
        sticky: '0 -4px 20px rgba(8, 53, 95, 0.08)',
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
