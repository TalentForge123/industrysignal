// POST /api/missions/<code>/share — mint a read-only share link for a
// mission's deliverable. Owner-scoped. Body: { mode?: 'full' | 'teaser' }.
// Returns { shareUrl, mode }. The teaser mode powers the M2C-style preview
// (BUILD-HANDOFF §0); full reveals the whole map.

import { NextResponse } from 'next/server';
import { createMissionShare, getMissionDetail } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { baseUrl } from '@/lib/base-url';

export async function POST(
  req: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { mode?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body → default mode
  }
  const mode = body.mode === 'teaser' ? 'teaser' : 'full';

  const code = decodeURIComponent(params.code);
  const detail = await getMissionDetail(db, code);
  if (!detail || detail.mission.ownerUserId !== userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const share = await createMissionShare(db, {
    missionId: detail.mission.id,
    mode,
    createdByUserId: userId,
  });
  return NextResponse.json({ shareUrl: `${baseUrl()}/share/${share.token}`, mode });
}
