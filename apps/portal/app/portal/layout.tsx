// /portal/* segment layout — auth gate + the persistent shell (TitleBar /
// CommandBar / Sidebar / StatusBar). Children render inside the scrollable
// main area.

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PortalShell } from './_shell/PortalShell';
import { logoutAction } from './_shell/logout-action';
import { ALERTS_FRESH_COUNT } from '@/lib/mock-data';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const user = {
    name: session.user.name ?? session.user.email ?? 'User',
    org: 'IndustrySignal',
  };
  return (
    <PortalShell user={user} alertsCount={ALERTS_FRESH_COUNT} logoutAction={logoutAction}>
      {children}
    </PortalShell>
  );
}
