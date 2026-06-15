// Missions dashboard — the operator's list of relationship-map engagements
// (BUILD-HANDOFF Sprint A). Server component: resolves the signed-in user,
// loads the missions they own, and hands a serializable view model to the
// client list. Scoped by owner for MVP; org-wide visibility lands with the
// seats model (§6).

import { redirect } from 'next/navigation';
import { listMissionsForOwner } from '@industrysignal/db';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { getOrCreateDefaultOrgForUser } from '@/lib/orgs';
import { MissionListView, type MissionListRow } from './_views/MissionListView';

export default async function MissionsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect('/login');
  }

  // Self-healing org provisioning, same as the watchlist/report routes —
  // keeps a freshly signed-in user from hitting an empty-state crash.
  await getOrCreateDefaultOrgForUser({
    userId: user.id,
    email: user.email ?? null,
    displayName: user.name ?? null,
  });

  const missions = await listMissionsForOwner(db, user.id);

  // Narrow DB rows to a serializable view model — Date → ISO string, only
  // the fields the table renders. Keeps the client bundle lean and avoids
  // passing non-plain objects across the server/client boundary.
  const rows: MissionListRow[] = missions.map((m) => ({
    code: m.code,
    clientName: m.clientName ?? '—',
    intent: m.intent,
    sourceMarket: m.sourceMarket ?? null,
    targetMarket: m.targetMarket ?? null,
    status: m.status,
    deadline: m.deadline ?? null,
  }));

  return <MissionListView rows={rows} />;
}
