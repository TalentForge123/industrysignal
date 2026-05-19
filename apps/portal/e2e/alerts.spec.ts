// Alerts feed — verify seeded rows render with the right shape and
// the title-bar badge matches the count of status='new' rows.

import { expect, test } from '@playwright/test';
import { SEED_IDS } from '@industrysignal/db';
import { devLogin } from './_helpers';

// Seed fixture: 5 alerts. status='new' on critical + high1 + normal1 = 3.
const EXPECTED_FRESH = 3;

test.describe('Alerts feed', () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, SEED_IDS.emails.admin);
    await page.goto('/portal/alerts');
    await expect(page.getByText(/ALRT ·/)).toBeVisible();
  });

  test('renders all five seeded alerts with the right kinds', async ({ page }) => {
    // Critical insolvency (top of feed — most recent createdAt).
    await expect(
      page.getByText('Insolvenční návrh — Vítkovice Steel a.s.'),
    ).toBeVisible();

    // Two officer changes (priority=high). Both Škoda + Vítkovice should
    // render in the same table.
    await expect(
      page.getByText('Změna ve statutárním orgánu — Škoda Auto a.s.'),
    ).toBeVisible();
    await expect(
      page.getByText('Změna ve statutárním orgánu — Vítkovice Steel a.s.'),
    ).toBeVisible();

    // Two normal-priority info alerts.
    await expect(page.getByText('Vyhraná zakázka — ČEZ, a.s.')).toBeVisible();
    await expect(
      page.getByText('Rozšíření kapacity — Škoda Auto a.s.'),
    ).toBeVisible();

    // The header meta string should report the totals — "5 položek · 3 nové" in CS.
    await expect(page.getByText(/5 (položek|items)/i)).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${EXPECTED_FRESH}\\s*(nov|new)`, 'i')),
    ).toBeVisible();
  });

  test('critical alert exposes its ISIR source link', async ({ page }) => {
    const sourceLink = page.getByRole('link', { name: /zdroj|source/i }).first();
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute('href', /isir\.justice\.cz/);
    await expect(sourceLink).toHaveAttribute('target', '_blank');
  });

  test('title-bar badge matches count of fresh alerts', async ({ page }) => {
    // The badge is rendered inside the alerts tab Link. With 3 fresh
    // rows it should display "3".
    const alertsTab = page.getByRole('link', { name: /ALRT/i });
    await expect(alertsTab).toContainText(String(EXPECTED_FRESH));
  });
});
