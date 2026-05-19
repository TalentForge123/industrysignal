// Auth flow — dev-login bypass + persistent session.
//
// The /dev-login route is mounted only when NODE_ENV=development; the
// Playwright webServer config pins that, so the route is reachable
// here but would 404 in production builds.

import { expect, test } from '@playwright/test';
import { SEED_IDS } from '@industrysignal/db';
import { devLogin } from './_helpers';

test('dev-login signs in the seeded admin and lands on the report view', async ({
  page,
}) => {
  await devLogin(page, SEED_IDS.emails.admin);

  // Portal shell rendered — TitleBar's RPRT tab is the landing tab.
  await expect(page.getByRole('link', { name: /RPRT/i })).toBeVisible();
  // The TitleBar's user chip carries the org name. Seeded org is
  // "Test Org s.r.o." → the abbreviated form is "Test" (first word).
  await expect(page.getByText('Test', { exact: false })).toBeVisible();
});

test('session persists across navigation between portal segments', async ({
  page,
}) => {
  await devLogin(page, SEED_IDS.emails.admin);

  // Walk through three tabs — no auth round-trip should happen.
  for (const segment of ['watchlist', 'alerts', 'report']) {
    await page.goto(`/portal/${segment}`);
    await expect(page).toHaveURL(new RegExp(`/portal/${segment}$`));
    // Belt-and-braces: middleware would bounce to /login if the
    // session cookie dropped.
    await expect(page).not.toHaveURL(/\/login/);
  }
});
