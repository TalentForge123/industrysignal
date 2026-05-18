// Server component — loads the signed-in user's default-watchlist
// entries and passes them to the (client) view. Org / default-watchlist
// auto-provisioning is idempotent in lib/orgs.ts, so a fresh DB or a
// user who's just signed in lands here without empty-state crashes.

import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { getOrCreateDefaultOrgForUser } from '../../../lib/orgs';
import { getWatchlistEntriesForOrg } from '../../../lib/watchlist';
import { WatchListView } from '../_views/WatchListView';

export default async function WatchlistPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    // Middleware already redirects unauth, but belt-and-braces for
    // the rare case where session is partially hydrated.
    redirect('/login');
  }

  const ctx = await getOrCreateDefaultOrgForUser({
    userId: user.id,
    email: user.email ?? null,
    displayName: user.name ?? null,
  });
  const entries = await getWatchlistEntriesForOrg(ctx.organizationId);

  return <WatchListView entries={entries} />;
}
