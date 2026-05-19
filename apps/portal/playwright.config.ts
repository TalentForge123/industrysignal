// Playwright config for the portal app.
//
// `webServer` boots `next dev` on port 3001 (one off from regular dev so
// a developer's existing `pnpm dev` keeps running). The E2E DB lives at
// localhost:5433 (docker-compose), distinct from any host Postgres.
//
// `E2E_INNGEST_MOCK=1` swaps the Inngest client for an in-process stub
// (see apps/portal/lib/inngest.ts) — Watch List add doesn't try to fire
// a real `company/refresh.requested` event.
//
// Headed runs: PWDEBUG=1 pnpm --filter @industrysignal/portal e2e
// Single spec: pnpm --filter @industrysignal/portal e2e e2e/alerts.spec.ts

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3001);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // shared DB — keep specs sequential for determinism
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm next dev --port ' + PORT,
    url: BASE_URL,
    // Re-use a server an operator already started by hand (saves ~5s
    // on iteration). CI always starts fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'development',
      // Pinned in playwright.config.ts (not docker-compose .env) so the
      // E2E DB is unambiguous — even if a developer has DATABASE_URL set
      // to their Neon dev branch, Playwright still hits the local docker.
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        'postgres://industrysignal:industrysignal@localhost:5433/industrysignal',
      // Auth.js requires a non-empty secret; the value itself doesn't
      // matter inside the test DB sandbox.
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-secret-not-for-production',
      E2E_INNGEST_MOCK: '1',
    },
  },
});
