// Shared E2E helpers. Light-touch — anything specific to a single spec
// stays in that spec file; this is just the common login + URL utilities.

import type { Page } from '@playwright/test';

/**
 * Sign in via the dev-login bypass. Works because playwright.config.ts
 * forces NODE_ENV=development on the spawned Next.js server, which is
 * the precondition for /dev-login being mounted at all (auth.ts).
 *
 * Returns once the post-login redirect to /portal/* has settled.
 */
export async function devLogin(page: Page, email: string): Promise<void> {
  await page.goto('/dev-login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: /Sign in/i }).click();
  // signIn() redirects to /portal which lands on the report view.
  await page.waitForURL(/\/portal(\/|$)/, { timeout: 15_000 });
}
