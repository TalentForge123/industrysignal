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
  report: {
    // Published quarterly report — drives the portal report view to
    // assert against the DB path rather than the mock fallback.
    publishedQ3: {
      id: 'rep-test-2026-q3',
      slug: '2026-q3',
      titleCs: 'Test publikovaný report — Q3 2026',
      titleEn: 'Test published report — Q3 2026',
      sectionTitleCs: 'Testovací makro sekce',
      sectionTitleEn: 'Test macro section',
    },
  },
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
  // Mission fixture — M2C → DE (replicate), the canonical prototype seed
  // from MissionData.js. Entity ids are slug-stable so links + graph
  // assertions stay deterministic across re-seeds.
  mission: {
    m2cDe: {
      id: 'msn-test-2026-014',
      code: 'MSN-2026-014',
    },
    entities: {
      m2c: 'me-test-m2c',
      apleona: 'me-test-apleona',
      dussmann: 'me-test-dussmann',
      wisag: 'me-test-wisag',
      piepenbrock: 'me-test-piepenbrock',
      db: 'me-test-db',
      siemens: 'me-test-siemens',
      fraport: 'me-test-fraport',
      charite: 'me-test-charite',
      ahk: 'me-test-ahk',
      gefma: 'me-test-gefma',
    },
  },
} as const;
