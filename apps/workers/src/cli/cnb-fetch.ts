// CLI: pull the latest ČNB daily FX fixing, print snapshot, optionally
// persist into macro_indicator + macro_observation.
//
// Usage:
//   pnpm --filter @industrysignal/workers cnb:fetch
//   pnpm --filter @industrysignal/workers cnb:fetch --persist
//   pnpm --filter @industrysignal/workers cnb:fetch --persist --date 2026-05-15
//
// Without --date, ČNB returns the most recent fixing (last business day).
// With --date, we ask for that specific trading day's fixing.

import { config as loadEnv } from 'dotenv';
import { fetchCnbDailyFx } from '@industrysignal/connectors-cz';
import { createDb, upsertCnbFxSnapshot } from '@industrysignal/db';

loadEnv({ path: '../../.env' });
loadEnv({ path: '../../.env.local', override: true });

interface ParsedArgs {
  persist: boolean;
  tradingDay?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { persist: argv.includes('--persist') };
  const dateIdx = argv.indexOf('--date');
  if (dateIdx !== -1) {
    const v = argv[dateIdx + 1];
    if (!v) throw new Error('--date requires an ISO date argument, e.g. --date 2026-05-15');
    result.tradingDay = v;
  }
  return result;
}

async function main() {
  const { persist, tradingDay } = parseArgs(process.argv.slice(2));
  const db = persist
    ? createDb(requireEnv('DATABASE_URL', 'pass --persist or unset it to skip DB writes'))
    : null;

  process.stderr.write(
    `[cnb-fetch] fetching ${tradingDay ? tradingDay : 'latest'} fixing... `,
  );
  const fetchArgs = tradingDay ? { tradingDay } : {};
  const snapshot = await fetchCnbDailyFx(fetchArgs);
  if (!snapshot) {
    process.stderr.write('no fixing available\n');
    return;
  }
  process.stderr.write(
    `${snapshot.observedAt} #${snapshot.upstreamSeq} (${snapshot.observations.length} rates)\n`,
  );

  if (db) {
    const result = await upsertCnbFxSnapshot(db, snapshot);
    process.stderr.write(
      `[cnb-fetch] persisted: indicators +${result.indicatorsCreated} | ` +
        `observations +${result.observationsInserted}/~${result.observationsUpdated}/=${result.observationsUnchanged}\n`,
    );
  }

  process.stdout.write(JSON.stringify(snapshot, null, 2));
  process.stdout.write('\n');
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[cnb-fetch] ${name} is required (${hint})`);
  return v;
}

main().catch((err) => {
  process.stderr.write(`[cnb-fetch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
