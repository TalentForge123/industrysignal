// Organization auto-provisioning + lookup helpers.
//
// Every user gets a personal organization on first sign-in (HANDOFF §6 —
// "Org / seats model"). One default watchlist is seeded along with it so
// the user lands in a usable state without having to set anything up
// manually. The same logic doubles as a self-healing path: any login
// path that calls `getDefaultOrgForUser` will provision the missing
// rows on the fly, which makes the dev DB easier to reset.

import { schema } from '@industrysignal/db';
import { and, eq } from 'drizzle-orm';
import { db } from './db';

export interface DefaultOrgContext {
  organizationId: string;
  organizationName: string;
  /** Always present after this helper runs — provisioned along with the org. */
  defaultWatchlistId: string;
  role: 'admin' | 'analyst' | 'viewer';
}

/**
 * Returns the org the user should land in by default — the one they're
 * a member of, creating it (plus default watchlist) if missing.
 *
 * A user can be a member of multiple orgs once invitations land
 * (Sprint 4+); until then "default" is the only one and is also their
 * personal org. The picker we'd need later belongs in the portal layout
 * shell, not in this helper.
 */
export async function getOrCreateDefaultOrgForUser(args: {
  userId: string;
  email: string | null | undefined;
  displayName?: string | null | undefined;
}): Promise<DefaultOrgContext> {
  const { userId, email, displayName } = args;

  // 1. Existing membership?
  const memberships = await db
    .select({
      org: schema.organizations,
      role: schema.organizationMembers.role,
    })
    .from(schema.organizationMembers)
    .innerJoin(
      schema.organizations,
      eq(schema.organizations.id, schema.organizationMembers.organizationId),
    )
    .where(eq(schema.organizationMembers.userId, userId))
    .limit(1);

  if (memberships[0]) {
    const org = memberships[0].org;
    const watchlist = await ensureDefaultWatchlist(org.id, userId);
    return {
      organizationId: org.id,
      organizationName: org.name,
      defaultWatchlistId: watchlist.id,
      role: memberships[0].role,
    };
  }

  // 2. No membership — provision personal org + admin role + default watchlist
  //    in a single transaction so a crash mid-way doesn't leave dangling rows.
  return db.transaction(async (tx) => {
    const orgName = derivePersonalOrgName(email, displayName);
    const [org] = await tx
      .insert(schema.organizations)
      .values({
        name: orgName,
        countryIso: 'CZ',
        plan: 'starter',
        seatsTotal: 3,
      })
      .returning();
    if (!org) throw new Error('getOrCreateDefaultOrgForUser: org insert returned no row');

    await tx.insert(schema.organizationMembers).values({
      userId,
      organizationId: org.id,
      role: 'admin',
    });

    const [watchlist] = await tx
      .insert(schema.watchlists)
      .values({
        organizationId: org.id,
        name: 'Default',
        createdBy: userId,
      })
      .returning();
    if (!watchlist) throw new Error('getOrCreateDefaultOrgForUser: watchlist insert returned no row');

    return {
      organizationId: org.id,
      organizationName: org.name,
      defaultWatchlistId: watchlist.id,
      role: 'admin',
    };
  });
}

async function ensureDefaultWatchlist(organizationId: string, userId: string) {
  const existing = await db
    .select()
    .from(schema.watchlists)
    .where(eq(schema.watchlists.organizationId, organizationId))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(schema.watchlists)
    .values({ organizationId, name: 'Default', createdBy: userId })
    .returning();
  if (!created) throw new Error('ensureDefaultWatchlist: insert returned no row');
  return created;
}

function derivePersonalOrgName(
  email: string | null | undefined,
  displayName: string | null | undefined,
): string {
  if (displayName && displayName.trim()) return displayName.trim();
  if (email) {
    const local = email.split('@')[0];
    if (local) return `${local} (personal)`;
  }
  return 'Personal workspace';
}

/**
 * Verify that `userId` is a member of `organizationId`, returning the
 * member's role. Throws when no membership exists — call sites in
 * server actions catch and translate to a user-facing error.
 */
export async function requireOrgMembership(
  userId: string,
  organizationId: string,
): Promise<'admin' | 'analyst' | 'viewer'> {
  const rows = await db
    .select({ role: schema.organizationMembers.role })
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    throw new Error(`requireOrgMembership: user ${userId} not in org ${organizationId}`);
  }
  return rows[0].role;
}
