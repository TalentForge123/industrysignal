// CLI: query ISIR_CUZK_WS for one or more IČOs, print normalized
// insolvency events, optionally persist via @industrysignal/db.
//
// Usage:
//   pnpm --filter @industrysignal/workers isir:fetch 47116307
//   pnpm --filter @industrysignal/workers isir:fetch --persist 47116307 00177041
//
// "No events found" is a successful outcome (most companies are not in
// insolvency); we surface it explicitly on stderr instead of erroring.

import { config as loadEnv } from 'dotenv';
import { fetchIsirByIco } from '@industrysignal/connectors-cz';
import { createDb, upsertInsolvencyEvents } from '@industrysignal/db';

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
      'usage: isir-fetch [--persist] <ico> [<ico>...]\n' +
        '       returns insolvency proceedings filed against each IČO (often none).',
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
    process.stderr.write(`[isir-fetch] querying ${ico}... `);
    const result = await fetchIsirByIco(ico);
    const status =
      result.errorCode === 'WS2'
        ? 'no events'
        : result.errorCode
          ? `error ${result.errorCode}`
          : `${result.events.length} event(s)`;
    process.stderr.write(`${status} (synced ${result.upstreamSyncedAt ?? 'n/a'})\n`);

    if (db && result.events.length > 0) {
      const out = await upsertInsolvencyEvents(db, result);
      const created = out.events.filter((e) => e.created).length;
      const changed = out.events.filter((e) => e.changed && !e.created).length;
      process.stderr.write(
        `[isir-fetch] persisted: created=${created} updated=${changed} unchanged=${
          out.events.length - created - changed
        }\n`,
      );
    }
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write('\n');
  }
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[isir-fetch] ${name} is required (${hint})`);
  return v;
}

main().catch((err) => {
  process.stderr.write(`[isir-fetch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
