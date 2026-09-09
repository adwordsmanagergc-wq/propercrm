'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker so the app installs to a home screen and keeps
 * working without a signal. Silent by design: nothing here should ever
 * interrupt someone mid-job.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // A blocked registration must never break the app.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
