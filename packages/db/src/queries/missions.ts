// Missions — read helpers + brief creation (BUILD-HANDOFF §3, Sprint A/B).
//
// A mission is one client relationship map. The canonical shape mirrors
// MissionData.js: a brief (client identity + intent + segment + ask), a
// relevance rubric (Lukáš's externalized "brain"), entities ("kdo s kým"),
// the edges between them, and opportunities (gap analysis).
//
// Read helpers power the dashboard (`listMissionsForOwner`) and the detail
// view (`getMissionDetail`). `createMission` is what the Sprint A wizard
// calls — it inserts the mission row + its rubric criteria in one
// transaction so a half-written brief never lands. Entity / link CRUD for
// the detail view (Sprint B) lives alongside once that view is built.

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../client';
import {
  missions,
  missionRubricCriteria,
  missionEntities,
  missionEntityLinks,
  missionOpportunities,
  missionTrends,
  type MissionIntent,
  type MissionEntityRole,
  type MissionEntityOrigin,
  type MissionLinkKind,
  type RubricWeight,
} from '../schema';

export type MissionRow = typeof missions.$inferSelect;
export type MissionRubricRow = typeof missionRubricCriteria.$inferSelect;
export type MissionEntityRow = typeof missionEntities.$inferSelect;
export type MissionEntityLinkRow = typeof missionEntityLinks.$inferSelect;
export type MissionOpportunityRow = typeof missionOpportunities.$inferSelect;
export type MissionTrendRow = typeof missionTrends.$inferSelect;

export interface MissionDetail {
  mission: MissionRow;
  rubric: MissionRubricRow[];
  entities: MissionEntityRow[];
  links: MissionEntityLinkRow[];
  opportunities: MissionOpportunityRow[];
  trends: MissionTrendRow[];
}

// ============================================================
// READ
// ============================================================

/**
 * Dashboard list — the operator's missions, actionable ones first
 * (active / draft before delivered / monitoring), then most recent.
 * Scoped by owner for MVP; org-wide visibility lands with seats (§6).
 */
export async function listMissionsForOwner(
  db: Database,
  ownerUserId: string,
): Promise<MissionRow[]> {
  return db
    .select()
    .from(missions)
    .where(eq(missions.ownerUserId, ownerUserId))
    .orderBy(
      sql`CASE ${missions.status} WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'delivered' THEN 2 ELSE 3 END`,
      desc(missions.createdAt),
    );
}

export async function findMissionByCode(
  db: Database,
  code: string,
): Promise<MissionRow | null> {
  const rows = await db.select().from(missions).where(eq(missions.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function findMissionById(
  db: Database,
  id: string,
): Promise<MissionRow | null> {
  const rows = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Full detail for one mission — brief + rubric + entities + edges +
 * opportunities + trends. Returns null when the code is unknown. The child
 * fetches run concurrently; ordering is stable (rubric/opportunities/trends
 * by sortOrder, entities by role then name) so the UI renders deterministically.
 */
export async function getMissionDetail(
  db: Database,
  code: string,
): Promise<MissionDetail | null> {
  const mission = await findMissionByCode(db, code);
  if (!mission) return null;

  const [rubric, entities, links, opportunities, trends] = await Promise.all([
    db
      .select()
      .from(missionRubricCriteria)
      .where(eq(missionRubricCriteria.missionId, mission.id))
      .orderBy(asc(missionRubricCriteria.sortOrder)),
    db
      .select()
      .from(missionEntities)
      .where(eq(missionEntities.missionId, mission.id))
      .orderBy(
        sql`CASE ${missionEntities.role} WHEN 'client' THEN 0 WHEN 'competitor' THEN 1 WHEN 'target' THEN 2 ELSE 3 END`,
        asc(missionEntities.name),
      ),
    db
      .select()
      .from(missionEntityLinks)
      .where(eq(missionEntityLinks.missionId, mission.id)),
    db
      .select()
      .from(missionOpportunities)
      .where(eq(missionOpportunities.missionId, mission.id))
      .orderBy(asc(missionOpportunities.sortOrder)),
    db
      .select()
      .from(missionTrends)
      .where(eq(missionTrends.missionId, mission.id))
      .orderBy(asc(missionTrends.sortOrder)),
  ]);

  return { mission, rubric, entities, links, opportunities, trends };
}

// ============================================================
// CREATE (Sprint A wizard)
// ============================================================

export interface RubricCriterionInput {
  text: string;
  weight: RubricWeight;
}

export interface CreateMissionArgs {
  ownerUserId: string;
  clientOrgId?: string | null;
  clientName?: string | null;
  clientLegal?: string | null;
  clientSector?: string | null;
  clientNace?: string | null;
  clientProducts?: string[];
  intent: MissionIntent;
  sourceMarket?: string | null;
  targetMarket?: string | null;
  segmentNace?: string | null;
  segmentKeywords?: string[];
  ask?: string | null;
  deadline?: string | null; // ISO date 'YYYY-MM-DD'
  /** Optional explicit code; auto-generated as MSN-<year>-NNN when omitted. */
  code?: string;
  rubric?: RubricCriterionInput[];
}

export async function createMission(
  db: Database,
  args: CreateMissionArgs,
): Promise<MissionRow> {
  return db.transaction(async (tx) => {
    const code = args.code ?? (await nextMissionCodeTx(tx));
    const [row] = await tx
      .insert(missions)
      .values({
        code,
        ownerUserId: args.ownerUserId,
        clientOrgId: args.clientOrgId ?? null,
        clientName: args.clientName ?? null,
        clientLegal: args.clientLegal ?? null,
        clientSector: args.clientSector ?? null,
        clientNace: args.clientNace ?? null,
        clientProducts: args.clientProducts ?? [],
        intent: args.intent,
        sourceMarket: args.sourceMarket ?? null,
        targetMarket: args.targetMarket ?? null,
        segmentNace: args.segmentNace ?? null,
        segmentKeywords: args.segmentKeywords ?? [],
        ask: args.ask ?? null,
        deadline: args.deadline ?? null,
        status: 'active',
      })
      .returning();
    if (!row) throw new Error('createMission: insert returned no row');

    if (args.rubric?.length) {
      await tx.insert(missionRubricCriteria).values(
        args.rubric.map((c, i) => ({
          missionId: row.id,
          text: c.text,
          weight: c.weight,
          sortOrder: i,
        })),
      );
    }
    return row;
  });
}

/**
 * Next mission code for the current sequence. Format MSN-<year>-NNN,
 * zero-padded to 3 digits. Derives the year from the highest existing
 * code rather than the wall clock so the seeder (Date.now() unavailable
 * in some contexts) and the app agree; falls back to scanning the max.
 *
 * Not collision-proof under concurrent inserts — the unique index on
 * `code` is the real guard; this just produces a sensible default. The
 * wizard retries on the rare conflict.
 */
async function nextMissionCodeTx(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
): Promise<string> {
  const rows = await tx
    .select({ code: missions.code })
    .from(missions)
    .orderBy(desc(missions.code))
    .limit(1);
  const last = rows[0]?.code;
  const match = last?.match(/^MSN-(\d{4})-(\d{3})$/);
  if (match) {
    const year = match[1];
    const seq = String(Number(match[2]) + 1).padStart(3, '0');
    return `MSN-${year}-${seq}`;
  }
  // No prior coded mission — start the current year's sequence. The year
  // is read from the latest deadline or defaults to the brief's; callers
  // that need a specific year pass `code` explicitly.
  return 'MSN-2026-001';
}

// ============================================================
// ENTITY / LINK CRUD (Sprint B detail view)
// ============================================================
//
// Brain-in-the-loop: every mutation is an explicit operator action. The
// server actions in apps/portal wrap these with auth + ownership checks;
// these helpers stay pure DB writes scoped by missionId so a caller can
// never edit an entity outside the mission it verified.

export interface AddEntityArgs {
  missionId: string;
  name: string;
  role: MissionEntityRole;
  city?: string | null;
  note?: string | null;
  decisionMaker?: string | null;
  source?: string | null;
  verify?: boolean;
  origin?: MissionEntityOrigin;
}

export async function addMissionEntity(
  db: Database,
  args: AddEntityArgs,
): Promise<MissionEntityRow> {
  const [row] = await db
    .insert(missionEntities)
    .values({
      missionId: args.missionId,
      name: args.name,
      role: args.role,
      city: args.city ?? null,
      note: args.note ?? null,
      decisionMaker: args.decisionMaker ?? null,
      source: args.source ?? null,
      verify: args.verify ?? false,
      origin: args.origin ?? 'manual',
    })
    .returning();
  if (!row) throw new Error('addMissionEntity: insert returned no row');
  return row;
}

export interface UpdateEntityArgs {
  entityId: string;
  /** Scope guard — the update only applies when the entity is in this mission. */
  missionId: string;
  name?: string;
  role?: MissionEntityRole;
  city?: string | null;
  note?: string | null;
  decisionMaker?: string | null;
  source?: string | null;
  verify?: boolean;
}

export async function updateMissionEntity(
  db: Database,
  args: UpdateEntityArgs,
): Promise<MissionEntityRow | null> {
  const patch: Record<string, unknown> = {};
  if (args.name !== undefined) patch.name = args.name;
  if (args.role !== undefined) patch.role = args.role;
  if (args.city !== undefined) patch.city = args.city;
  if (args.note !== undefined) patch.note = args.note;
  if (args.decisionMaker !== undefined) patch.decisionMaker = args.decisionMaker;
  if (args.source !== undefined) patch.source = args.source;
  if (args.verify !== undefined) patch.verify = args.verify;
  if (Object.keys(patch).length === 0) {
    const existing = await db
      .select()
      .from(missionEntities)
      .where(eq(missionEntities.id, args.entityId))
      .limit(1);
    return existing[0] ?? null;
  }
  const [row] = await db
    .update(missionEntities)
    .set(patch)
    .where(
      and(eq(missionEntities.id, args.entityId), eq(missionEntities.missionId, args.missionId)),
    )
    .returning();
  return row ?? null;
}

export async function deleteMissionEntity(
  db: Database,
  args: { entityId: string; missionId: string },
): Promise<void> {
  // Links referencing this entity drop via the ON DELETE CASCADE FK.
  await db
    .delete(missionEntities)
    .where(
      and(eq(missionEntities.id, args.entityId), eq(missionEntities.missionId, args.missionId)),
    );
}

export interface AddLinkArgs {
  missionId: string;
  fromEntity: string;
  toEntity: string;
  kind?: MissionLinkKind;
}

/**
 * Adds an edge. Idempotent on the (mission, from, to) unique index —
 * a duplicate is a no-op and returns null. Used by manual linking and
 * by AI research accept (auto-link to a competitor by name).
 */
export async function addMissionLink(
  db: Database,
  args: AddLinkArgs,
): Promise<MissionEntityLinkRow | null> {
  const [row] = await db
    .insert(missionEntityLinks)
    .values({
      missionId: args.missionId,
      fromEntity: args.fromEntity,
      toEntity: args.toEntity,
      kind: args.kind ?? 'serves',
    })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function removeMissionLink(
  db: Database,
  args: { linkId: string; missionId: string },
): Promise<void> {
  await db
    .delete(missionEntityLinks)
    .where(
      and(eq(missionEntityLinks.id, args.linkId), eq(missionEntityLinks.missionId, args.missionId)),
    );
}
