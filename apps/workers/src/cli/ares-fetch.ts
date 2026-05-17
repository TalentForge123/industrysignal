// CLI: fetch one or more IČOs from ARES, print normalized snapshot,
// optionally persist via @industrysignal/db.
//
// Usage:
//   pnpm --filter @industrysignal/workers ares:fetch 00177041 45274649
//   pnpm --filter @industrysignal/workers ares:fetch --persist 00177041
//
// Reads ARES_USER_AGENT and (with --persist) DATABASE_URL from .env.local
// at the repo root via dotenv, matching the same load order as the rest
// of the workspace.

import { config as loadEnv } from 'dotenv';
import { fetchAresByIco } from '@industrysignal/connectors-cz';
import { createDb, upsertCompanyFromAres } from '@industrysignal/db';

loadEnv({ path: '../../.env' });
loadEnv({ path: '../../.env.local', override: true });

interface ParsedArgs {
  persist: boolean;
  icos: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const persist = argv.includes('--persist');
  const icos = argv.filter((a) => !a.startsWith('--'));
  if (icos.length === 0) {
    throw new Error(
      'usage: ares-fetch [--persist] <ico> [<ico>...]\n' +
        '       provide one or more 8-digit IČO (zero-padding optional).',
    );
  }
  return { persist, icos };
}

async function main() {
  const { persist, icos } = parseArgs(process.argv.slice(2));
  // Lazily create the DB handle so a `--persist`-less run works without
  // DATABASE_URL set — the script is useful in pure-dry-run mode.
  const db = persist
    ? createDb(requireEnv('DATABASE_URL', 'pass --persist or unset it to skip DB writes'))
    : null;

  for (const ico of icos) {
    process.stderr.write(`[ares-fetch] fetching ${ico}... `);
    const snapshot = await fetchAresByIco(ico);
    if (!snapshot) {
      process.stderr.write('not found\n');
      continue;
    }
    process.stderr.write(`${snapshot.legalName} (${snapshot.registryId})\n`);
    if (db) {
      const result = await upsertCompanyFromAres(db, snapshot);
      process.stderr.write(
        `[ares-fetch] persisted: created=${result.created} changed=${result.changed}\n`,
      );
    }
    // Pretty-print on stdout so it can be piped to jq / saved as a
    // fixture (see test/fixtures/ in connectors-cz).
    process.stdout.write(JSON.stringify(snapshot, null, 2));
    process.stdout.write('\n');
  }
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[ares-fetch] ${name} is required (${hint})`);
  return v;
}

main().catch((err) => {
  process.stderr.write(`[ares-fetch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
