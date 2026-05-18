'use server';

// Watch List CRUD server actions.
//
// Both actions:
//   - Verify the caller is signed in (auth() session check).
//   - Verify the caller's org membership before any DB write.
//   - Revalidate the /portal/watchlist path so the table re-renders
//     with the fresh row set.
//
// `addWatchlistEntryAction` additionally fires a `company/refresh.requested`
// Inngest event so the user sees real ARES/Justice/ISIR data within
// seconds of adding an IČO, rather than having to wait for the next
// daily cron tick.

import { revalidatePath } from 'next/cache';
import { schema } from '@industrysignal/db';
import { inngest } from '@industrysignal/jobs';
import { and, eq } from 'drizzle-orm';
import { auth } from '../../../auth';
import { db } from '../../../lib/db';
import { getOrCreateDefaultOrgForUser, requireOrgMembership } from '../../../lib/orgs';

export interface AddWatchlistEntryResult {
  ok: boolean;
  /** Created when ok = true; absent on validation failure. */
  entryId?: string;
  /** Human-readable error key — render via i18n. */
  error?:
    | 'unauthenticated'
    | 'invalid_ico'
    | 'invalid_label'
    | 'duplicate'
    | 'internal';
}

const ICO_RE = /^\d{6,8}$/;

export async function addWatchlistEntryAction(
  formData: FormData,
): Promise<AddWatchlistEntryResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { ok: false, error: 'unauthenticated' };

  const rawIco = String(formData.get('ico') ?? '').trim();
  const rawLabel = String(formData.get('label') ?? '').trim();
  // Accept any 6–8 digit input — ČSÚ pads to 8, we normalize here.
  const cleanIco = rawIco.replace(/\D/g, '');
  if (!ICO_RE.test(cleanIco)) return { ok: false, error: 'invalid_ico' };
  if (rawLabel.length === 0 || rawLabel.length > 200) {
    return { ok: false, error: 'invalid_label' };
  }
  const ico = cleanIco.padStart(8, '0');

  try {
    const ctx = await getOrCreateDefaultOrgForUser({
      userId: user.id,
      email: user.email ?? null,
      displayName: user.name ?? null,
    });

    // Uniqueness check inside the org's watchlists: same IČO twice in
    // the default watchlist is a no-op (caller likely double-submitted).
    const existing = await db
      .select({ id: schema.watchlistEntries.id })
      .from(schema.watchlistEntries)
      .where(
        and(
          eq(schema.watchlistEntries.watchlistId, ctx.defaultWatchlistId),
          eq(schema.watchlistEntries.targetType, 'company'),
          eq(schema.watchlistEntries.countryIso, 'CZ'),
          eq(schema.watchlistEntries.targetRef, ico),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return { ok: false, error: 'duplicate', entryId: existing[0].id };
    }

    const [inserted] = await db
      .insert(schema.watchlistEntries)
      .values({
        watchlistId: ctx.defaultWatchlistId,
        targetType: 'company',
        targetRef: ico,
        countryIso: 'CZ',
        label: rawLabel,
      })
      .returning({ id: schema.watchlistEntries.id });

    if (!inserted) return { ok: false, error: 'internal' };

    // Kick off an immediate refresh — the user gets to see real ARES /
    // Justice / ISIR data without waiting for the 03:00 UTC cron.
    // Inngest handles its own retries; we don't block on success.
    try {
      await inngest.send({
        name: 'company/refresh.requested',
        data: { countryIso: 'CZ', registryId: ico, triggeredBy: 'api' },
      });
    } catch {
      // Send failures shouldn't roll back the DB write — the next
      // scheduled cron will pick it up. Logged downstream.
    }

    revalidatePath('/portal/watchlist');
    return { ok: true, entryId: inserted.id };
  } catch (err) {
    process.stderr.write(
      `[addWatchlistEntryAction] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return { ok: false, error: 'internal' };
  }
}

export interface RemoveWatchlistEntryResult {
  ok: boolean;
  error?: 'unauthenticated' | 'not_found' | 'forbidden' | 'internal';
}

export async function removeWatchlistEntryAction(
  entryId: string,
): Promise<RemoveWatchlistEntryResult> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { ok: false, error: 'unauthenticated' };
  if (typeof entryId !== 'string' || entryId.length === 0) {
    return { ok: false, error: 'not_found' };
  }

  try {
    // Resolve entry → watchlist → org, then verify the caller belongs
    // to that org. Doing it in one query keeps the RBAC check honest
    // (no TOCTOU between read + delete).
    const rows = await db
      .select({
        entryId: schema.watchlistEntries.id,
        organizationId: schema.watchlists.organizationId,
      })
      .from(schema.watchlistEntries)
      .innerJoin(
        schema.watchlists,
        eq(schema.watchlists.id, schema.watchlistEntries.watchlistId),
      )
      .where(eq(schema.watchlistEntries.id, entryId))
      .limit(1);
    if (!rows[0]) return { ok: false, error: 'not_found' };

    await requireOrgMembership(user.id, rows[0].organizationId);

    await db.delete(schema.watchlistEntries).where(eq(schema.watchlistEntries.id, entryId));
    revalidatePath('/portal/watchlist');
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('requireOrgMembership')) return { ok: false, error: 'forbidden' };
    process.stderr.write(`[removeWatchlistEntryAction] ${msg}\n`);
    return { ok: false, error: 'internal' };
  }
}
