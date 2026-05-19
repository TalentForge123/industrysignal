// /portal/* segment layout — auth gate + the persistent shell (TitleBar /
// CommandBar / Sidebar / StatusBar). Children render inside the scrollable
// main area.

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PortalShell } from './_shell/PortalShell';
import { logoutAction } from './_shell/logout-action';
import { countFreshAlertsForOrg } from '@/lib/alerts';
import { getOrCreateDefaultOrgForUser } from '@/lib/orgs';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser?.id) {
    redirect('/login');
  }
  const ctx = await getOrCreateDefaultOrgForUser({
    userId: sessionUser.id,
    email: sessionUser.email ?? null,
    displayName: sessionUser.name ?? null,
  });
  const alertsCount = await countFreshAlertsForOrg(ctx.organizationId);
  const user = {
    name: sessionUser.name ?? sessionUser.email ?? 'User',
    org: ctx.organizationName,
  };
  return (
    <PortalShell user={user} alertsCount={alertsCount} logoutAction={logoutAction}>
      {children}
    </PortalShell>
  );
}
