// POST /api/missions/<code>/pdf — generate the deliverable PDF + a full-mode
// share link for a mission. Owner-scoped. Returns { pdfUrl, shareUrl, ... }.
// The PDF is printed from the public /share/<token> page (Block C, step 2).

import { NextResponse } from 'next/server';
import { getMissionDetail } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { generateDeliverablePdf } from '@/lib/deliverable-pdf';

export async function POST(
  _req: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const code = decodeURIComponent(params.code);
  const detail = await getMissionDetail(db, code);
  if (!detail || detail.mission.ownerUserId !== userId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const result = await generateDeliverablePdf(detail.mission, userId);
    return NextResponse.json(result);
  } catch (err) {
    process.stderr.write(
      `[missions/pdf] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return NextResponse.json({ error: 'pdf_failed' }, { status: 502 });
  }
}
