// Server component — loads the signed-in user's alerts feed from the
// `alert` table (HANDOFF §7 + §16). The view itself is client-side for
// the (future) per-row interactivity (mark read, dismiss); the initial
// fetch happens here so the page renders instantly without a client
// round-trip on first load.

import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { getAlertsForOrg } from '../../../lib/alerts';
import { getOrCreateDefaultOrgForUser } from '../../../lib/orgs';
import { AlertsView } from '../_views/AlertsView';

export default async function AlertsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    redirect('/login');
  }

  const ctx = await getOrCreateDefaultOrgForUser({
    userId: user.id,
    email: user.email ?? null,
    displayName: user.name ?? null,
  });
  const alerts = await getAlertsForOrg(ctx.organizationId);

  return <AlertsView alerts={alerts} />;
}
