// Onboarding — a brand-new email (no rows in `user` or
// `organization_member`) lands on /portal with an auto-provisioned
// personal org + empty default watchlist. Verifies the
// getOrCreateDefaultOrgForUser path is self-healing.
//
// Generates a unique email per run so re-runs don't accumulate
// personal orgs forever; the test does not clean up after itself
// (the rows are harmless and useful for inspection during debugging).

import { expect, test } from '@playwright/test';
import { devLogin } from './_helpers';

test('first-time user gets a personal org and empty default watchlist', async ({
  page,
}) => {
  const email = `fresh-${Date.now()}@e2e.test.local`;
  await devLogin(page, email);

  // Portal shell loaded — RPRT tab visible means layout query
  // (getOrCreateDefaultOrgForUser) returned without throwing.
  await expect(page.getByRole('link', { name: /RPRT/i })).toBeVisible();

  // Watch List for a never-before-seen user starts empty. Empty-state
  // copy: watch_empty key ("Watch List je prázdný...").
  await page.goto('/portal/watchlist');
  await expect(page.getByText(/WTCH ·/)).toBeVisible();
  await expect(
    page.getByText(/prázdn|empty|Add a company|Přidejte/i),
  ).toBeVisible();

  // Alerts list is empty too — no critical insolvency on a fresh org.
  await page.goto('/portal/alerts');
  await expect(page.getByText(/ALRT ·/)).toBeVisible();
  await expect(
    page.getByText(/Žádné alerty|No alerts yet/i),
  ).toBeVisible();

  // Title-bar alerts tab should NOT show a badge — zero fresh items.
  const alertsTab = page.getByRole('link', { name: /ALRT/i });
  // The badge only renders when alertsCount > 0; assert the tab text
  // doesn't contain a numeric badge after the label.
  await expect(alertsTab).not.toContainText(/\d/);
});
