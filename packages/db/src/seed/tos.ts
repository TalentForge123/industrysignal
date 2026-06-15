// TOS Varnsdorf mission loader (MSN-2026-021).
//
// Loads the canonical TOS seed exported from the prototype
// (ui_kits/portal/MissionDataTOS.js → seeds/mission-tos.seed.json) and
// inserts it into the live mission schema. Recovery seed after the dev
// Neon branch that held this mission was deleted (the data source is the
// repo, not that branch — reseeding is deterministic and repeatable).
//
// Maps 5 of the JSON's 7 blocks onto existing tables:
//   mission        → mission            (1)
//   mission_rubric → mission_rubric_criterion (5)
//   entities       → mission_entity     (17)
//   entity_links   → mission_entity_link (6, from_ref/to_ref resolved to ids)
//   opportunities  → mission_opportunity (4)
//
// NOT inserted — no destination in the current schema (see report):
//   research_moves (4), mission_trends (6); mission.{deliverable_note,
//   trend_quarter, next_refresh}; entities[].priority.
//
// Idempotent: deletes the MSN-2026-021 mission first (cascade clears its
// children) then re-inserts, so re-runs never duplicate. Entity ids are
// stable (`me-tos-<ref>`) so links resolve without reading rows back.
//
// Run AFTER `pnpm db:seed` (needs the admin user). Invoke via:
//   pnpm --filter @industrysignal/db exec tsx src/seed/tos.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../schema';
import { SEED_IDS } from '../seed-ids';

config({ path: '../../.env' });
config({ path: '../../.env.local', override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[seed:tos] DATABASE_URL is required. Set it in .env.local at the repo root.');
  process.exit(1);
}

const MISSION_ID = 'msn-test-2026-021';
const MISSION_CODE = 'MSN-2026-021';

// Czech display date "30. 6. 2026" → ISO "2026-06-30" for the date column.
function czDateToIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  if (!d || !mo || !y) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

interface TosSeed {
  mission: Record<string, any>;
  mission_rubric: Array<{ ref: string; text: string; weight: string }>;
  entities: Array<Record<string, any>>;
  entity_links: Array<{ from_ref: string; to_ref: string; kind: string }>;
  opportunities: Array<Record<string, any>>;
}

async function main() {
  const seedPath = resolve(process.cwd(), '../../seeds/mission-tos.seed.json');
  const data = JSON.parse(readFileSync(seedPath, 'utf8')) as TosSeed;
  const m = data.mission;

  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log(`[seed:tos] loading ${seedPath}`);

    await db.transaction(async (tx) => {
      // Idempotent reset — cascade removes rubric / entities / links / opps.
      await tx.delete(schema.missions).where(eq(schema.missions.code, MISSION_CODE));

      // ----- mission ------------------------------------------------------
      await tx.insert(schema.missions).values({
        id: MISSION_ID,
        code: MISSION_CODE,
        ownerUserId: SEED_IDS.users.admin,
        clientName: m.client_name,
        clientLegal: m.client_legal,
        clientSector: m.client_sector,
        clientNace: m.client_nace,
        intent: m.intent,
        sourceMarket: m.source_market,
        targetMarket: m.target_market,
        segmentNace: m.segment_nace,
        segmentKeywords: m.segment_keywords ?? [],
        ask: m.ask,
        deadline: czDateToIso(m.deadline),
        status: m.status ?? 'active',
      });

      // ----- rubric (5) ---------------------------------------------------
      await tx.insert(schema.missionRubricCriteria).values(
        data.mission_rubric.map((r, i) => ({
          missionId: MISSION_ID,
          text: r.text,
          weight: r.weight as any,
          sortOrder: i,
        })),
      );

      // ----- entities (17) — stable id me-tos-<ref> for link resolution ---
      const entityId = (ref: string) => `me-tos-${ref}`;
      await tx.insert(schema.missionEntities).values(
        data.entities.map((e) => ({
          id: entityId(e.ref),
          missionId: MISSION_ID,
          name: e.name,
          role: e.role as any,
          city: e.city ?? null,
          note: e.note ?? null,
          decisionMaker: e.decision_maker ?? null,
          source: e.source ?? null,
          verify: Boolean(e.verify),
          origin: (e.origin ?? 'db_seed') as any,
        })),
      );

      // ----- entity links (6) — from_ref/to_ref → entity ids --------------
      await tx.insert(schema.missionEntityLinks).values(
        data.entity_links.map((l) => ({
          missionId: MISSION_ID,
          fromEntity: entityId(l.from_ref),
          toEntity: entityId(l.to_ref),
          kind: l.kind as any,
        })),
      );

      // ----- opportunities (4) --------------------------------------------
      await tx.insert(schema.missionOpportunities).values(
        data.opportunities.map((o, i) => ({
          missionId: MISSION_ID,
          tag: o.tag ?? null,
          title: o.title ?? null,
          body: o.body ?? null,
          tone: (o.tone ?? 'info') as any,
          sortOrder: i,
        })),
      );
    });

    // Report counts.
    const counts = {
      rubric: data.mission_rubric.length,
      entities: data.entities.length,
      links: data.entity_links.length,
      opportunities: data.opportunities.length,
    };
    console.log(
      `[seed:tos] done — ${MISSION_CODE} (${m.client_name}) owner=${SEED_IDS.users.admin}; ` +
        `rubric=${counts.rubric}, entities=${counts.entities}, links=${counts.links}, ` +
        `opportunities=${counts.opportunities}`,
    );
    console.log(
      '[seed:tos] SKIPPED (no schema home): research_moves(4), mission_trends(6), ' +
        'mission.{deliverable_note,trend_quarter,next_refresh}, entities[].priority',
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[seed:tos] failed:', err);
  process.exit(1);
});
