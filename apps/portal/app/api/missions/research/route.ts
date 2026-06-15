// POST /api/missions/research — server-side AI research (BUILD-HANDOFF
// Sprint C). Replaces the prototype's client-side window.claude.complete:
// the Anthropic key stays server-only here. Flow:
//
//   auth → own the mission → build prompt from brief + rubric → Claude
//   (Sonnet, via cachedLlmCall for cache + audit) → strict parse +
//   guardrails → return candidates for the operator to accept.
//
// Nothing is written to the map here — candidates are proposals only
// (brain-in-the-loop). Accepting persists via acceptCandidateAction.

import { NextResponse } from 'next/server';
import { cachedLlmCall, getMissionDetail } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { RESEARCH_MODEL, runClaudeJson } from '@/lib/claude-runner';
import {
  buildSystemPrompt,
  buildUserPrompt,
  normalizeCandidates,
  parseCandidates,
  type ResearchBrief,
  type ResearchRubricItem,
} from '@/lib/mission-research';

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { code?: unknown; task?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim();
  const task = String(body.task ?? '').trim();
  if (!code || !task) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (task.length > 600) {
    return NextResponse.json({ error: 'task_too_long' }, { status: 400 });
  }

  const detail = await getMissionDetail(db, code);
  if (!detail || detail.mission.ownerUserId !== userId) {
    // Owner-scoped, same as the detail page — don't leak existence.
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const m = detail.mission;
  const brief: ResearchBrief = {
    clientName: m.clientName ?? '—',
    clientLegal: m.clientLegal,
    clientSector: m.clientSector,
    clientNace: m.clientNace ?? m.segmentNace,
    clientProducts: m.clientProducts ?? [],
    targetMarket: m.targetMarket,
    intent: m.intent,
  };
  const rubric: ResearchRubricItem[] = detail.rubric.map((r) => ({
    text: r.text,
    weight: r.weight,
  }));
  const existingNames = detail.entities.map((e) => e.name);

  const system = buildSystemPrompt(brief, rubric);
  const user = buildUserPrompt(task, existingNames);

  try {
    const res = await cachedLlmCall(
      db,
      {
        kind: 'mission_research',
        model: RESEARCH_MODEL,
        systemPrompt: system,
        input: { task, missionId: m.id },
        temperature: 0.2,
        consumerRef: `mission:${m.id}`,
      },
      async () => {
        const r = await runClaudeJson({ system, user });
        return { output: { text: r.text }, tokensIn: r.tokensIn, tokensOut: r.tokensOut };
      },
    );

    const out = (res.result?.output ?? {}) as { text?: string };
    // Re-dedup against the *current* map (post-cache) so a cached LLM
    // response never re-proposes an entity added since.
    const candidates = normalizeCandidates(parseCandidates(out.text ?? ''), existingNames);
    return NextResponse.json({ candidates });
  } catch (err) {
    process.stderr.write(
      `[missions/research] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return NextResponse.json({ error: 'research_failed' }, { status: 502 });
  }
}
