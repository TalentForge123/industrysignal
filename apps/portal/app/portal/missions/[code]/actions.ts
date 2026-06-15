'use server';

// Mission detail — entity CRUD server actions (BUILD-HANDOFF Sprint B).
//
// Brain-in-the-loop: each is an explicit operator edit, persisted to the
// mission_entity table. Every action re-resolves the mission by code and
// checks ownership (ownerUserId === caller) before any write — so a user
// can only mutate missions they own, and an entity edit can never escape
// its mission (the DB helpers also scope by missionId).

import { revalidatePath } from 'next/cache';
import {
  addMissionEntity,
  addMissionLink,
  deleteMissionEntity,
  findMissionByCode,
  getMissionDetail,
  updateMissionEntity,
  type MissionEntityRow,
} from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export type EntityRole = 'client' | 'competitor' | 'target' | 'partner';

/** Serializable entity shape exchanged with the client view. */
export interface EntityVM {
  id: string;
  name: string;
  role: EntityRole;
  city: string | null;
  note: string | null;
  decisionMaker: string | null;
  source: string | null;
  verify: boolean;
  priority: string | null;
}

type ActionError = 'unauthenticated' | 'forbidden' | 'not_found' | 'internal';

export interface EntityResult {
  ok: boolean;
  entity?: EntityVM;
  error?: ActionError;
}
export interface VoidResult {
  ok: boolean;
  error?: ActionError;
}

function toVM(row: MissionEntityRow): EntityVM {
  return {
    id: row.id,
    name: row.name,
    role: row.role as EntityRole,
    city: row.city,
    note: row.note,
    decisionMaker: row.decisionMaker,
    source: row.source,
    verify: row.verify,
    priority: row.priority,
  };
}

/** Resolve the mission by code and assert the caller owns it. */
async function ownedMission(code: string, userId: string) {
  const mission = await findMissionByCode(db, code);
  if (!mission) return { error: 'not_found' as const };
  if (mission.ownerUserId !== userId) return { error: 'forbidden' as const };
  return { mission };
}

export interface AddEntityInput {
  name: string;
  role: EntityRole;
  city?: string | null;
  note?: string | null;
  decisionMaker?: string | null;
  source?: string | null;
  verify?: boolean;
}

export async function addEntityAction(
  code: string,
  init: AddEntityInput,
): Promise<EntityResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'unauthenticated' };
  try {
    const owned = await ownedMission(code, userId);
    if ('error' in owned) return { ok: false, error: owned.error };
    const row = await addMissionEntity(db, {
      missionId: owned.mission.id,
      name: init.name?.trim() || '—',
      role: init.role,
      city: init.city ?? null,
      note: init.note ?? null,
      decisionMaker: init.decisionMaker ?? null,
      source: init.source ?? null,
      verify: init.verify ?? false,
      origin: 'manual',
    });
    revalidatePath(`/portal/missions/${code}`);
    return { ok: true, entity: toVM(row) };
  } catch (err) {
    process.stderr.write(`[addEntityAction] ${errMsg(err)}\n`);
    return { ok: false, error: 'internal' };
  }
}

export interface UpdateEntityInput {
  name?: string;
  role?: EntityRole;
  city?: string | null;
  note?: string | null;
  decisionMaker?: string | null;
  source?: string | null;
  verify?: boolean;
}

export async function updateEntityAction(
  code: string,
  entityId: string,
  patch: UpdateEntityInput,
): Promise<EntityResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'unauthenticated' };
  try {
    const owned = await ownedMission(code, userId);
    if ('error' in owned) return { ok: false, error: owned.error };
    const row = await updateMissionEntity(db, {
      entityId,
      missionId: owned.mission.id,
      ...patch,
    });
    if (!row) return { ok: false, error: 'not_found' };
    revalidatePath(`/portal/missions/${code}`);
    return { ok: true, entity: toVM(row) };
  } catch (err) {
    process.stderr.write(`[updateEntityAction] ${errMsg(err)}\n`);
    return { ok: false, error: 'internal' };
  }
}

export async function deleteEntityAction(
  code: string,
  entityId: string,
): Promise<VoidResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'unauthenticated' };
  try {
    const owned = await ownedMission(code, userId);
    if ('error' in owned) return { ok: false, error: owned.error };
    await deleteMissionEntity(db, { entityId, missionId: owned.mission.id });
    revalidatePath(`/portal/missions/${code}`);
    return { ok: true };
  } catch (err) {
    process.stderr.write(`[deleteEntityAction] ${errMsg(err)}\n`);
    return { ok: false, error: 'internal' };
  }
}

// ----- Accept an AI research candidate -----

export interface LinkVM {
  id: string;
  fromEntity: string;
  toEntity: string;
  kind: string;
}

export interface AcceptCandidateInput {
  name: string;
  role: EntityRole;
  city?: string | null;
  note?: string | null;
  decisionMaker?: string | null;
  source?: string | null;
  verify?: boolean;
  /** Names of entities already on the map this candidate works with. */
  worksWithNames?: string[];
}

export interface AcceptCandidateResult {
  ok: boolean;
  entity?: EntityVM;
  /** Edges auto-created to matched existing entities (usually competitors). */
  links?: LinkVM[];
  error?: ActionError;
}

/**
 * Persist an accepted research candidate as an `ai`-origin entity and
 * auto-link it to any existing entity named in `worksWithNames` (the
 * prototype's accept→worksWith behavior). Matching is case-insensitive on
 * the current map; unmatched names are silently ignored (the operator can
 * link manually later).
 */
export async function acceptCandidateAction(
  code: string,
  candidate: AcceptCandidateInput,
): Promise<AcceptCandidateResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'unauthenticated' };
  try {
    const owned = await ownedMission(code, userId);
    if ('error' in owned) return { ok: false, error: owned.error };
    const missionId = owned.mission.id;

    // Resolve worksWith names against the current map before inserting.
    const detail = await getMissionDetail(db, code);
    const byName = new Map<string, string>();
    for (const e of detail?.entities ?? []) byName.set(e.name.toLowerCase(), e.id);

    const row = await addMissionEntity(db, {
      missionId,
      name: candidate.name.trim() || '—',
      role: candidate.role,
      city: candidate.city ?? null,
      note: candidate.note ?? null,
      decisionMaker: candidate.decisionMaker ?? null,
      source: candidate.source ?? 'OVĚŘIT',
      verify: candidate.verify ?? true,
      origin: 'ai',
    });

    const links: LinkVM[] = [];
    for (const name of candidate.worksWithNames ?? []) {
      const fromId = byName.get(name.trim().toLowerCase());
      if (!fromId || fromId === row.id) continue;
      const link = await addMissionLink(db, {
        missionId,
        fromEntity: fromId,
        toEntity: row.id,
        kind: 'serves',
      });
      if (link) links.push({ id: link.id, fromEntity: link.fromEntity, toEntity: link.toEntity, kind: link.kind });
    }

    revalidatePath(`/portal/missions/${code}`);
    return { ok: true, entity: toVM(row), links };
  } catch (err) {
    process.stderr.write(`[acceptCandidateAction] ${errMsg(err)}\n`);
    return { ok: false, error: 'internal' };
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
