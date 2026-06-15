// New mission — the brief wizard (BUILD-HANDOFF Sprint A, §13). Server
// component: auth gate only; the form itself is a client component that
// drives the dynamic rubric rows and calls createMissionAction.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { MissionWizard } from './MissionWizard';

export default async function NewMissionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return <MissionWizard />;
}
