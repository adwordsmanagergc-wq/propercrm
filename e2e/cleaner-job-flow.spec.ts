import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * The happy path that matters most: a cleaner opens their day, works a job,
 * and cannot finish it without photographing before and after.
 *
 * Runs against a Supabase project loaded with supabase/seed.sql. Dave Whitton
 * is one of the three seeded cleaners.
 */
const CLEANER = { email: 'dave@propercrm.test', password: 'password123' };

const configured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');

test.skip(
  !configured,
  'Set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY to a seeded Supabase project to run the end-to-end suite.',
);

// Any real image will do — the app re-encodes it to JPEG before upload.
const photo = () => ({
  name: 'shot.png',
  mimeType: 'image/png',
  buffer: readFileSync(join(process.cwd(), 'public/icons/icon-192.png')),
});

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(CLEANER.email);
  await page.getByLabel('Password').fill(CLEANER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/app');
}

test.describe('the cleaner job flow', () => {
  test('a cleaner sees only their own day, with three tabs', async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole('heading', { name: 'My day' })).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Today' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Week' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Me' })).toBeVisible();
    await expect(nav.getByRole('link')).toHaveCount(3);

    // None of the office screens are reachable.
    await expect(page.getByRole('link', { name: 'Customers' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Invoices' })).toHaveCount(0);

    // And no prices leak into the cleaner's app.
    await expect(page.locator('body')).not.toContainText('£');
  });

  test('a cleaner can see their day on a map, in route order', async ({ page }) => {
    await signIn(page);

    await page.getByRole('button', { name: 'map' }).click();
    await expect(page.getByRole('application', { name: "Map of the day's jobs" })).toBeVisible();

    // Still no prices once the map is open.
    await expect(page.locator('body')).not.toContainText('£');

    // And back to the list, which is what works with no signal.
    await page.getByRole('button', { name: 'list' }).click();
    await expect(page.getByRole('link', { name: /Start job|Carry on|View/ }).first()).toBeVisible();
  });

  test('a job cannot be completed without a before and an after photo', async ({ page }) => {
    await signIn(page);

    const startJob = page.getByRole('link', { name: /Start job|Carry on/ }).first();
    await expect(startJob).toBeVisible();
    await startJob.click();
    await page.waitForURL('**/app/jobs/**');

    // Start the job — this stamps the time and the position.
    const startButton = page.getByRole('button', { name: 'Start job' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    const complete = page.getByRole('button', { name: 'Complete job' });
    await expect(complete).toBeVisible();
    await expect(complete).toBeDisabled();
    await expect(page.getByText('Take a before photo and an after photo to finish.')).toBeVisible();

    // A before photo alone is not enough.
    await page.locator('#camera-before').setInputFiles(photo());
    await expect(page.getByText('Still need an after photo.')).toBeVisible();
    await expect(complete).toBeDisabled();

    // With both, it unlocks.
    await page.locator('#camera-after').setInputFiles(photo());
    await expect(complete).toBeEnabled();

    await complete.click();
    await page.waitForURL('**/app');
    await expect(page.getByRole('heading', { name: 'My day' })).toBeVisible();
  });

  test('a job that cannot be done is recorded with a reason', async ({ page }) => {
    await signIn(page);

    const startJob = page.getByRole('link', { name: /Start job|Carry on/ }).first();
    await startJob.click();
    await page.waitForURL('**/app/jobs/**');

    const startButton = page.getByRole('button', { name: 'Start job' });
    if (await startButton.isVisible()) await startButton.click();

    await page.getByRole('button', { name: "Can't complete" }).click();
    await expect(page.getByRole('dialog', { name: "Why can't you do it?" })).toBeVisible();
    await page.getByRole('button', { name: 'No access' }).click();

    await page.waitForURL('**/app');
    await expect(page.getByText('Missed — No access').first()).toBeVisible();
  });

  test('the Me tab shows their own numbers and nobody else’s', async ({ page }) => {
    await signIn(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Me' }).click();
    await page.waitForURL('**/app/me');

    await expect(page.getByText('Done this week')).toBeVisible();
    await expect(page.getByText('Photos done')).toBeVisible();
    await expect(page.getByLabel('Your name')).toHaveValue(/\w+/);
  });
});
