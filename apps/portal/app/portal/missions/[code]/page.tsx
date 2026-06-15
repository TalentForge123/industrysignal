// Mission detail — server load (BUILD-HANDOFF Sprint B). Loads the full
// mission (brief + rubric + entities + edges + opportunities) by code and
// hands a serializable view model to the client detail view. Owner-scoped:
// a mission the caller doesn't own resolves to notFound(), consistent with
// the dashboard, which only lists the caller's missions.

import { notFound, redirect } from 'next/navigation';
import { getMissionDetail } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  MissionDetailView,
  type MissionBriefVM,
  type RubricVM,
  type EntityVM,
  type LinkVM,
  type OpportunityVM,
  type TrendVM,
} from '../_views/MissionDetailView';

export default async function MissionDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect('/login');
  }

  const code = decodeURIComponent(params.code);
  const detail = await getMissionDetail(db, code);
  if (!detail || detail.mission.ownerUserId !== user.id) {
    notFound();
  }

  const m = detail.mission;
  const brief: MissionBriefVM = {
    code: m.code,
    clientName: m.clientName ?? '—',
    clientLegal: m.clientLegal,
    clientSector: m.clientSector,
    clientNace: m.clientNace ?? m.segmentNace,
    intent: m.intent,
    sourceMarket: m.sourceMarket,
    targetMarket: m.targetMarket,
    ask: m.ask,
    deadline: m.deadline,
    status: m.status,
    deliverableNote: m.deliverableNote,
    trendQuarter: m.trendQuarter,
    nextRefresh: m.nextRefresh,
  };
  const rubric: RubricVM[] = detail.rubric.map((r) => ({
    id: r.id,
    text: r.text,
    weight: r.weight,
  }));
  const entities: EntityVM[] = detail.entities.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role as EntityVM['role'],
    city: e.city,
    note: e.note,
    decisionMaker: e.decisionMaker,
    source: e.source,
    verify: e.verify,
    priority: e.priority,
  }));
  const links: LinkVM[] = detail.links.map((l) => ({
    id: l.id,
    fromEntity: l.fromEntity,
    toEntity: l.toEntity,
    kind: l.kind,
  }));
  const opportunities: OpportunityVM[] = detail.opportunities.map((o) => ({
    id: o.id,
    tag: o.tag,
    title: o.title,
    body: o.body,
    tone: o.tone,
  }));
  const trends: TrendVM[] = detail.trends.map((tr) => ({
    id: tr.id,
    territory: tr.territory,
    sector: tr.sector,
    quarter: tr.quarter,
    title: tr.title,
    body: tr.body,
    metric: tr.metric,
    source: tr.source,
    validated: tr.validated,
    tone: tr.tone,
  }));

  return (
    <MissionDetailView
      brief={brief}
      rubric={rubric}
      entities={entities}
      links={links}
      opportunities={opportunities}
      trends={trends}
    />
  );
}
