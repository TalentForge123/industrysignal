import { redirect } from 'next/navigation';

// /portal entry — the report is the canonical landing for an authed
// session; explicit redirect keeps the URL self-describing and lets the
// TopBar / Sidebar active-state pathname check work via startsWith.
export default function PortalIndexPage() {
  redirect('/portal/report');
}
