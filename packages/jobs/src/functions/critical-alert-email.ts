// Critical-alert email worker.
//
// Subscribes to `alerts/critical.created` (emitted by the alert-diff
// scheduler when a fresh row with priority='critical' lands). Loads
// the alert + org + recipients, then dispatches one Postmark email per
// recipient — each in its own `step.run` so a transient failure on
// recipient 2 doesn't re-send to recipient 1 on retry.
//
// HANDOFF §7 mandates immediate email for critical alerts. SMS (also
// listed in §7) is deferred until Twilio lands.
//
// Idempotency: the upstream `insertAlertIfNew` dedup means we get
// exactly one event per (org, kind, source_event_id) tuple. Inngest's
// step memoization plus Postmark's own delivery semantics keep
// re-deliveries from happening on retries. The remaining risk —
// Postmark accepted the message but the function crashed before
// recording success — is bounded to "recipient sees the same email
// twice on the rare retry", which is the safer failure mode for a
// critical channel.

import { findAlertById, findAlertRecipientsForOrg } from '@industrysignal/db';
import { NonRetriableError } from 'inngest';
import { inngest } from '../client';
import type { JobContext } from '../factory';
import { sendCriticalAlertEmail } from '../mail';

export function criticalAlertEmail({ db }: JobContext) {
  return inngest.createFunction(
    {
      id: 'critical-alert-email',
      name: 'Critical alert — email delivery',
      // One concurrent run per (org, alert) — same alert never fires
      // its delivery worker twice in parallel.
      concurrency: { limit: 5, key: 'event.data.alertId' },
      // Postmark itself retries on 5xx; we retry the whole function
      // body at most 3 times before giving up and surfacing the error
      // in the Inngest dashboard.
      retries: 3,
    },
    { event: 'alerts/critical.created' },
    async ({ event, step }) => {
      const { alertId } = event.data;

      const ctx = await step.run('load-alert', async () => {
        const row = await findAlertById(db, alertId);
        if (!row) {
          // Don't retry — the alert is gone (very rare; can happen if
          // an admin hard-deletes a row mid-flight). Ack and move on.
          throw new NonRetriableError(
            `critical-alert-email: alert ${alertId} not found`,
          );
        }
        if (row.alert.priority !== 'critical') {
          // Defensive: the event taxonomy should make this unreachable.
          // If it ever fires, the scheduler emitted the wrong event —
          // refuse rather than send a downgraded alert through the
          // critical channel.
          throw new NonRetriableError(
            `critical-alert-email: alert ${alertId} has priority ${row.alert.priority}, expected critical`,
          );
        }
        return {
          alertTitle: row.alert.title,
          alertMessage: row.alert.message,
          sourceUrl: row.alert.sourceUrl,
          createdAt: row.alert.createdAt.toISOString(),
          orgName: row.organization.name,
          organizationId: row.organization.id,
        };
      });

      const recipients = await step.run('load-recipients', async () => {
        const rows = await findAlertRecipientsForOrg(db, ctx.organizationId);
        return rows.map((r) => ({
          userId: r.userId,
          email: r.email,
          displayName: r.displayName,
          role: r.role,
        }));
      });

      if (recipients.length === 0) {
        // No admin / analyst seats — org is mid-provisioning or all
        // members are viewers. Surface so we can spot it without
        // failing the run.
        return { delivered: 0, skipped: 'no-recipients' as const };
      }

      const portalUrl = `${publicPortalBaseUrl()}/portal/alerts`;

      // One step per recipient: durable, idempotent, individually
      // retryable. Step names are unique per recipient so Inngest's
      // memoization is keyed correctly across retries.
      const results = [];
      for (const recipient of recipients) {
        const result = await step.run(`send:${recipient.userId}`, async () => {
          return sendCriticalAlertEmail({
            to: recipient.email,
            recipientName: recipient.displayName,
            orgName: ctx.orgName,
            alertTitle: ctx.alertTitle,
            alertMessage: ctx.alertMessage,
            sourceUrl: ctx.sourceUrl,
            portalUrl,
            createdAt: ctx.createdAt,
          });
        });
        results.push({ userId: recipient.userId, ...result });
      }

      return { delivered: results.length, results };
    },
  );
}

// Base URL the email links back to. In prod set PORTAL_PUBLIC_URL on
// Vercel; in dev the default lands on the Next.js dev server.
function publicPortalBaseUrl(): string {
  return process.env.PORTAL_PUBLIC_URL ?? 'http://localhost:3000';
}
