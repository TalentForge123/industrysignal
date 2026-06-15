// Studio is an internal CMS. For Sprint 4 it ships behind a network
// boundary (run locally / on the VPN); no public sign-in flow.
//
// `getCurrentEditor()` returns the analyst user record for the active
// session. Today: in dev it resolves to the seeded `analyst@test.local`
// user (or the first user in the table if the seed isn't present).
// In Sprint 6+ this swaps for an Auth.js v5 magic-link flow against
// the same `user` table the portal uses — server actions already pass
// through the actor id, so the wiring point is just this function.

import { schema } from '@industrysignal/db';
import { eq } from 'drizzle-orm';
import { db } from './db';

export interface CurrentEditor {
  id: string;
  email: string;
  name: string | null;
}

const SEED_ANALYST_EMAIL = 'analyst@test.local';

export async function getCurrentEditor(): Promise<CurrentEditor> {
  // Preferred: the seeded analyst — keeps local + E2E in lockstep.
  const seeded = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.email, SEED_ANALYST_EMAIL))
    .limit(1);
  if (seeded[0]) return seeded[0];

  // Fallback: first user in the table (e.g. a real analyst who signed
  // up via dev-login on the portal). Lets Studio be usable against any
  // populated dev DB without needing the test fixture.
  const any = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .limit(1);
  if (any[0]) return any[0];

  throw new Error(
    'No editor identity available — seed the database (`pnpm db:seed`) or sign in via the portal first.',
  );
}
