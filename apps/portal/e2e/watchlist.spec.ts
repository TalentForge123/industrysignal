// Watch List CRUD — exercise the server-action surface end-to-end.
//
// E2E_INNGEST_MOCK=1 makes the add-entry server action's
// `inngest.send('company/refresh.requested', ...)` a no-op so the test
// doesn't need ARES reachable from the runner. Add → row appears →
// remove → row gone. Seed entries (Škoda / ČEZ / Vítkovice) are
// asserted but not mutated so re-runs don't drift the fixture.

import { expect, test } from '@playwright/test';
import { SEED_IDS } from '@industrysignal/db';
import { devLogin } from './_helpers';

const TEST_LABEL = 'E2E Test Company';

test.describe('Watch List', () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, SEED_IDS.emails.admin);
    await page.goto('/portal/watchlist');
    await expect(page.getByText(/WTCH ·/)).toBeVisible();
  });

  test('renders the seeded entries', async ({ page }) => {
    // Stable text from the seed: Škoda + ČEZ + Vítkovice rows.
    await expect(page.getByText('Škoda Auto a.s.')).toBeVisible();
    await expect(page.getByText('ČEZ, a.s.')).toBeVisible();
    await expect(page.getByText('Vítkovice Steel a.s.')).toBeVisible();
  });

  test('add → expand → remove flow', async ({ page }) => {
    const addedIco = SEED_IDS.testIcos.unseeded;

    // 1. Add. The toggle is the "+ PŘIDAT" (cs) / "+ ADD" (en) button
    //    in the filter bar.
    await page.getByRole('button', { name: /\+ /i }).first().click();
    await page.getByPlaceholder('00177041').fill(addedIco);
    await page.getByPlaceholder('Škoda Auto a.s.').fill(TEST_LABEL);
    // The submit button label is "PŘIDAT" / "ADD"; multiple buttons
    // match — explicitly target the submit type.
    await page.locator('button[type=submit]').click();

    // Row appears (label rendered, ARES enrichment hasn't happened so
    // the company-data status shows the "…" placeholder).
    const newRow = page.getByRole('row', { name: new RegExp(TEST_LABEL) });
    await expect(newRow).toBeVisible({ timeout: 10_000 });

    // 2. Expand → detail panel shows "no company data yet" because we
    //    mocked Inngest so the refresh handler never ran.
    await newRow.click();
    await expect(
      page.getByText(/Watch List|Bez dat|No company data|Načítám|Loading/i),
    ).toBeVisible();

    // 3. Remove via the × button at the end of the row.
    const removeBtn = newRow.getByRole('button', { name: /Odebrat|Remove/i });
    await removeBtn.click();
    await expect(newRow).toHaveCount(0, { timeout: 10_000 });
  });

  test('duplicate IČO add is rejected', async ({ page }) => {
    // Adding an IČO that's already in the seeded list should surface
    // a duplicate error without inserting again.
    await page.getByRole('button', { name: /\+ /i }).first().click();
    await page.getByPlaceholder('00177041').fill('00177041'); // Škoda
    await page.getByPlaceholder('Škoda Auto a.s.').fill('Duplicate attempt');
    await page.locator('button[type=submit]').click();

    // i18n: watch_err_duplicate. Czech is the primary locale.
    await expect(
      page.getByText(/duplicit|already|existuje|Existing|již/i),
    ).toBeVisible({ timeout: 5_000 });
  });
});
