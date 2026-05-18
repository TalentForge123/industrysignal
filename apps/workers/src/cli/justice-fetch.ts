// CLI: fetch one or more IČOs from or.justice.cz, print normalized
// officers + filings snapshot, optionally persist via @industrysignal/db.
//
// Usage:
//   pnpm --filter @industrysignal/workers justice:fetch 00177041
//   pnpm --filter @industrysignal/workers justice:fetch --persist 00177041 45274649
//
// Persistence requires the company row to already exist (typically via
// `ares:fetch --persist <ico>`) — we don't auto-create a half-populated
// company row here. If the IČO has no Justice subject (foreign /
// dissolved), we surface that on stderr and move on.

import { config as loadEnv } from 'dotenv';
import { fetchJusticeByIco } from '@industrysignal/connectors-cz';
import {
  createDb,
  findCompanyByRegistryId,
  upsertJusticeSnapshot,
} from '@industrysignal/db';

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
      'usage: justice-fetch [--persist] <ico> [<ico>...]\n' +
        '       returns officers + Sbírka listin filings.\n' +
        '       --persist requires the company row to exist (run ares:fetch --persist first).',
    );
  }
  return { persist, icos };
}

async function main() {
  const { persist, icos } = parseArgs(process.argv.slice(2));
  const db = persist
    ? createDb(requireEnv('DATABASE_URL', 'pass --persist or unset it to skip DB writes'))
    : null;

  for (const ico of icos) {
    process.stderr.write(`[justice-fetch] fetching ${ico}... `);
    const snapshot = await fetchJusticeByIco(ico);
    if (!snapshot) {
      process.stderr.write('not in Justice\n');
      continue;
    }
    process.stderr.write(
      `subjektId=${snapshot.subjektId} officers=${snapshot.officers.length} filings=${snapshot.filings.length}\n`,
    );

    if (db) {
      const cleanIco = ico.replace(/\D/g, '').padStart(8, '0');
      const company = await findCompanyByRegistryId(db, 'CZ', cleanIco);
      if (!company) {
        process.stderr.write(
          `[justice-fetch] skipping persist: no company row for ${cleanIco} — run ares:fetch --persist ${cleanIco} first\n`,
        );
      } else {
        const result = await upsertJusticeSnapshot(db, {
          companyId: company.id,
          snapshot,
        });
        process.stderr.write(
          `[justice-fetch] persisted: officers ` +
            `+${result.officersInserted}/~${result.officersUpdated}/=${result.officersUnchanged} | ` +
            `filings ` +
            `+${result.filingsInserted}/~${result.filingsUpdated}/=${result.filingsUnchanged}\n`,
        );
      }
    }

    process.stdout.write(JSON.stringify(snapshot, null, 2));
    process.stdout.write('\n');
  }
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[justice-fetch] ${name} is required (${hint})`);
  return v;
}

main().catch((err) => {
  process.stderr.write(`[justice-fetch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
