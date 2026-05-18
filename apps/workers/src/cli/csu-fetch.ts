// CLI: pull one ČSÚ macro indicator by key, print snapshot, optionally
// persist via @industrysignal/db.
//
// Usage:
//   pnpm --filter @industrysignal/workers csu:fetch cz.macro.cpi_yoy_index
//   pnpm --filter @industrysignal/workers csu:fetch --persist cz.macro.cpi_yoy_index
//   pnpm --filter @industrysignal/workers csu:fetch --list
//
// Indicator keys live in packages/connectors-cz/src/csu/specs.ts.

import { config as loadEnv } from 'dotenv';
import {
  CSU_INDICATORS,
  fetchCsuIndicator,
  getCsuSpec,
} from '@industrysignal/connectors-cz';
import { createDb, upsertMacroObservations } from '@industrysignal/db';

loadEnv({ path: '../../.env' });
loadEnv({ path: '../../.env.local', override: true });

interface ParsedArgs {
  list: boolean;
  persist: boolean;
  keys: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  return {
    list: argv.includes('--list'),
    persist: argv.includes('--persist'),
    keys: argv.filter((a) => !a.startsWith('--')),
  };
}

async function main() {
  const { list, persist, keys } = parseArgs(process.argv.slice(2));

  if (list) {
    process.stdout.write('Registered ČSÚ indicators:\n');
    for (const spec of CSU_INDICATORS) {
      process.stdout.write(`  ${spec.indicatorKey}\t${spec.nameCs}\n`);
    }
    return;
  }

  if (keys.length === 0) {
    throw new Error(
      'usage: csu-fetch [--persist] <indicator-key> [<indicator-key>...]\n' +
        '       csu-fetch --list   (show registered keys)',
    );
  }

  const db = persist
    ? createDb(requireEnv('DATABASE_URL', 'pass --persist or unset it to skip DB writes'))
    : null;

  for (const key of keys) {
    process.stderr.write(`[csu-fetch] fetching ${key}... `);
    const spec = getCsuSpec(key);
    const snapshot = await fetchCsuIndicator(spec);
    if (!snapshot) {
      process.stderr.write('no data\n');
      continue;
    }
    process.stderr.write(`${snapshot.observations.length} observations\n`);

    if (db) {
      const result = await upsertMacroObservations(
        db,
        {
          indicatorKey: spec.indicatorKey,
          sourceKey: snapshot.sourceKey,
          nameCs: spec.nameCs,
          nameEn: spec.nameEn,
          unit: spec.unit,
          periodKind: spec.periodKind,
        },
        snapshot.observations,
        { fetchedAt: new Date(snapshot.fetchedAt) },
      );
      process.stderr.write(
        `[csu-fetch] persisted: indicators +${result.indicatorsCreated} | ` +
          `observations +${result.observationsInserted}/~${result.observationsUpdated}/=${result.observationsUnchanged}\n`,
      );
    }

    process.stdout.write(JSON.stringify(snapshot, null, 2));
    process.stdout.write('\n');
  }
}

function requireEnv(name: string, hint: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[csu-fetch] ${name} is required (${hint})`);
  return v;
}

main().catch((err) => {
  process.stderr.write(`[csu-fetch] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
