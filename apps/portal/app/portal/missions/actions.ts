'use server';

// Mission CRUD server actions (BUILD-HANDOFF Sprint A — brief wizard).
//
// `createMissionAction` validates the 5-field brief (§13), provisions the
// caller's org if needed, and inserts the mission + rubric criteria in one
// transaction (createMission). It returns the new mission code so the
// client can navigate to its detail view. Auth is checked first; the
// owner is the signed-in user (operator).

import { revalidatePath } from 'next/cache';
import { createMission, type RubricCriterionInput } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getOrCreateDefaultOrgForUser } from '@/lib/orgs';

const INTENTS = ['replicate', 'expand', 'scout', 'defend', 'acquire'] as const;
type Intent = (typeof INTENTS)[number];
const WEIGHTS = ['vysoká', 'střední', 'nízká'] as const;
type Weight = (typeof WEIGHTS)[number];

export interface CreateMissionResult {
  ok: boolean;
  /** Present when ok — the new mission's code, for client-side navigation. */
  code?: string;
  error?: 'unauthenticated' | 'invalid_client' | 'invalid_intent' | 'internal';
}

export async function createMissionAction(
  formData: FormData,
): Promise<CreateMissionResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { ok: false, error: 'unauthenticated' };

  const clientName = String(formData.get('clientName') ?? '').trim();
  if (!clientName) return { ok: false, error: 'invalid_client' };

  const intent = String(formData.get('intent') ?? '').trim();
  if (!INTENTS.includes(intent as Intent)) return { ok: false, error: 'invalid_intent' };

  // Optional fields: empty → null. Comma lists → trimmed arrays.
  const str = (k: string): string | null => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  const list = (k: string): string[] =>
    String(formData.get(k) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  // Rubric arrives as a JSON array from the wizard's dynamic rows.
  let rubric: RubricCriterionInput[] = [];
  try {
    const raw: unknown = JSON.parse(String(formData.get('rubric') ?? '[]'));
    if (Array.isArray(raw)) {
      rubric = raw
        .filter((r): r is { text: unknown; weight: unknown } => !!r && typeof r === 'object')
        .map((r) => ({
          text: String((r as { text: unknown }).text ?? '').trim(),
          weight: WEIGHTS.includes((r as { weight: unknown }).weight as Weight)
            ? ((r as { weight: unknown }).weight as Weight)
            : 'střední',
        }))
        .filter((r) => r.text.length > 0);
    }
  } catch {
    // Malformed rubric payload — create the mission without criteria
    // rather than failing the whole brief.
  }

  try {
    await getOrCreateDefaultOrgForUser({
      userId: user.id,
      email: user.email ?? null,
      displayName: user.name ?? null,
    });

    const mission = await createMission(db, {
      ownerUserId: user.id,
      clientName,
      clientLegal: str('clientLegal'),
      clientSector: str('clientSector'),
      clientNace: str('clientNace'),
      clientProducts: list('clientProducts'),
      intent: intent as Intent,
      sourceMarket: str('sourceMarket'),
      targetMarket: str('targetMarket'),
      segmentNace: str('segmentNace'),
      segmentKeywords: list('segmentKeywords'),
      ask: str('ask'),
      deadline: str('deadline'), // <input type="date"> → 'YYYY-MM-DD'
      rubric,
    });

    revalidatePath('/portal/missions');
    return { ok: true, code: mission.code };
  } catch (err) {
    process.stderr.write(
      `[createMissionAction] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return { ok: false, error: 'internal' };
  }
}
