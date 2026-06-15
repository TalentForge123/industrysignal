// Report view — verify the DB-backed path lands the seeded published
// report on /portal/report, and the "preview" banner stays absent
// (which would otherwise mean the page fell back to the mock fixture).
//
// The seeded fixture is the Q3 2026 row inserted by packages/db/src/seed.ts.

import { expect, test } from '@playwright/test';
import { SEED_IDS } from '@industrysignal/db';
import { devLogin } from './_helpers';

const SEEDED = SEED_IDS.report.publishedQ3;

test.describe('Report view (DB path)', () => {
  test.beforeEach(async ({ page }) => {
    await devLogin(page, SEED_IDS.emails.admin);
    await page.goto('/portal/report');
  });

  test('renders the seeded published report from the database', async ({ page }) => {
    // CS is the default lang for the seeded admin → assert the CS title.
    await expect(page.getByText(SEEDED.titleCs)).toBeVisible();

    // Section title from the body proves parseReportBody resolved the
    // sections array, not just the report row scalars.
    await expect(page.getByText(SEEDED.sectionTitleCs)).toBeVisible();
  });

  test('does not show the mock-fallback preview banner', async ({ page }) => {
    // The banner is rendered only when getLatestReportBilingual() returns
    // null. If it shows here, the DB lookup or seed fixture broke.
    await expect(page.getByText(/NÁHLED — žádný publikovaný report/i)).toHaveCount(0);
    await expect(page.getByText(/PREVIEW — no published report/i)).toHaveCount(0);
  });
});
