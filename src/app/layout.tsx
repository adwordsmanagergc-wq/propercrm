import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

/**
 * Self-hosted at build time, so the app has no runtime dependency on Google's
 * servers — it must render the same with no signal.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: {
    default: 'Proper CRM — job management for window cleaners',
    template: '%s · Proper CRM',
  },
  description:
    'Rounds, routes, photo proof and getting paid. Built for window cleaning companies, simple enough to use on a phone in the rain.',
  applicationName: 'Proper CRM',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Proper', statusBarStyle: 'default' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#1E88E5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="bg-grey-50 text-grey-900 antialiased">
        <a
          href="#main"
          className="sr-only-focusable absolute left-3 top-3 z-50 rounded-btn bg-blue-500 px-4 py-2 font-semibold text-white"
        >
          Skip to content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
