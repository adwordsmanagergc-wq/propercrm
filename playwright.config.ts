import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * The happy-path suite runs against a real Supabase project loaded with
 * supabase/seed.sql — the cleaner flow is mostly database rules, and a mocked
 * backend would prove nothing about them.
 *
 *   supabase db reset          # migrations + seed
 *   npm run build
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The job flow asks for a position; give it one rather than waiting out
    // the timeout on every job.
    geolocation: { latitude: 51.4485, longitude: -0.9735 },
    permissions: ['geolocation'],
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },

  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
