import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env from the repo root so drizzle-kit picks up DATABASE_URL the
// same way the app does. The root .env is gitignored; .env.example shows
// the required vars.
config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://placeholder/placeholder',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
