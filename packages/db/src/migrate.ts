// Apply pending Drizzle migrations from ./drizzle to the database pointed
// at by DATABASE_URL. Non-interactive — preferred over `drizzle-kit push`
// for CI and scripted environments.
//
// Run via `pnpm --filter @industrysignal/db db:migrate`.

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[db:migrate] DATABASE_URL is required. Set it in .env.local at the repo root.');
  process.exit(1);
}

async function main() {
  const client = postgres(url!, { max: 1 });
  try {
    console.log('[db:migrate] applying migrations from ./drizzle ...');
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log('[db:migrate] done');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[db:migrate] failed:', err);
  process.exit(1);
});
