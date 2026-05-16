// Server Component shell wrapper. Drops down to client components for the
// interactive chrome (TitleBar / CommandBar / Sidebar / StatusBar) but
// renders the route-level page as a child so per-route Server Components
// (ReportView etc.) keep their server boundaries.

import type { ReactNode } from 'react';
import { TitleBar } from './TitleBar';
import { CommandBar } from './CommandBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import styles from './shell.module.css';

interface PortalShellProps {
  user: { name: string; org: string };
  alertsCount: number;
  logoutAction: () => Promise<void>;
  children: ReactNode;
}

export function PortalShell({ user, alertsCount, logoutAction, children }: PortalShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.titlebar}>
        <TitleBar user={user} alertsCount={alertsCount} logoutAction={logoutAction} />
      </div>
      <div className={styles.commandbar}>
        <CommandBar />
      </div>
      <div className={styles.sidebar}>
        <Sidebar user={user} alertsCount={alertsCount} />
      </div>
      <main className={styles.main}>{children}</main>
      <div className={styles.statusbar}>
        <StatusBar />
      </div>
    </div>
  );
}
