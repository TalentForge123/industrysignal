// Stable IDs for the E2E fixture. Imported by both `seed.ts` (which
// inserts) and by Playwright specs (which assert against them).
// Kept in a separate module from `seed.ts` so importing the IDs in a
// test file doesn't side-effect-run the seeder's top-level main().

export const SEED_IDS = {
  org: 'org-test-001',
  watchlist: 'wl-test-001',
  users: {
    admin: 'user-test-admin',
    analyst: 'user-test-analyst',
  },
  emails: {
    admin: 'admin@test.local',
    analyst: 'analyst@test.local',
    // Used by the onboarding spec to drive auto-provisioning of a
    // brand-new org. NOT seeded — left for that test to create.
    fresh: 'fresh-user@test.local',
  },
  companies: {
    skoda: 'co-test-skoda',
    cez: 'co-test-cez',
    vitkovice: 'co-test-vitkovice',
  },
  watchlistEntries: {
    skoda: 'we-test-skoda',
    cez: 'we-test-cez',
    vitkovice: 'we-test-vitkovice',
  },
  insolvency: 'ins-test-vitkovice',
  officers: {
    skodaCeo: 'off-test-skoda-ceo',
    vitkoviceCeo: 'off-test-vitkovice-ceo',
  },
  alerts: {
    critical: 'al-test-critical-001',
    high1: 'al-test-high-001',
    high2: 'al-test-high-002',
    normal1: 'al-test-normal-001',
    normal2: 'al-test-normal-002',
  },
  // IČOs for Watch List add-flow E2E coverage. Not seeded — tests use
  // these as known-good inputs the form should accept.
  testIcos: {
    // Unipetrol RPA — valid CZ IČO, not in the seeded entries.
    unseeded: '62193581',
  },
} as const;
