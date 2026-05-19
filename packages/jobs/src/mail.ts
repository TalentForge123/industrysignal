// Postmark transport for alert delivery.
//
// Same dev/prod fork as apps/portal/lib/mail.ts (magic links): dev =
// stdout log so a developer can verify the payload without leaving the
// terminal; prod = Postmark via REST. Sender + token are required in
// prod and the function throws on missing config rather than silently
// degrading — same reasoning as the magic-link sender.
//
// Why a separate file from the magic-link sender: jobs runs on the
// background worker pool (eventually apps/workers on Hetzner) and
// magic-link runs on the request path (apps/portal on Vercel). Keeping
// the two transports isolated lets each app pin its own Postmark
// message stream (transactional for auth, broadcasts for alerts) and
// scope env vars separately.

export interface CriticalAlertEmailPayload {
  to: string;
  /** Recipient display name — used in the salutation when present. */
  recipientName: string | null;
  /** Owning org's display name. */
  orgName: string;
  /** "Insolvenční návrh — Vítkovice Steel a.s." */
  alertTitle: string;
  /** Human-readable body (the same string the in-app feed renders). */
  alertMessage: string;
  /** Public link to the upstream artifact (e.g. ISIR case detail). */
  sourceUrl: string | null;
  /** Direct link back to /portal/alerts so the recipient can act fast. */
  portalUrl: string;
  /** Created-at on the alert, ISO string. */
  createdAt: string;
}

export interface SendResult {
  /** True when a network send was attempted; false when the dev console
   *  fallback was used. The Inngest function uses this for step output. */
  sent: boolean;
  /** Set when sent=true; absent for dev fallback. */
  postmarkMessageId?: string;
}

export async function sendCriticalAlertEmail(
  payload: CriticalAlertEmailPayload,
): Promise<SendResult> {
  if (process.env.NODE_ENV === 'production') {
    const token = process.env.POSTMARK_TOKEN;
    if (!token) {
      throw new Error(
        '[mail] POSTMARK_TOKEN is not set in production. Critical-alert send refuses to silently degrade — set POSTMARK_TOKEN (and POSTMARK_FROM_EMAIL on a DKIM-verified domain) before deploying.',
      );
    }
    const from = process.env.POSTMARK_FROM_EMAIL ?? 'alerts@industrysignal.cz';
    const stream = process.env.POSTMARK_ALERT_STREAM ?? 'broadcast';
    return sendViaPostmark(payload, { token, from, stream });
  }
  logToDevConsole(payload);
  return { sent: false };
}

function logToDevConsole(p: CriticalAlertEmailPayload): void {
  const bar = '='.repeat(78);
  const lines = [
    '',
    bar,
    `  [mail/dev]  CRITICAL ALERT  →  ${p.to}`,
    `  [mail/dev]  Org: ${p.orgName}`,
    `  [mail/dev]  Title: ${p.alertTitle}`,
    `  [mail/dev]  ${p.alertMessage}`,
    p.sourceUrl ? `  [mail/dev]  Source: ${p.sourceUrl}` : '  [mail/dev]  (no source URL)',
    `  [mail/dev]  Portal: ${p.portalUrl}`,
    bar,
    '',
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

interface PostmarkConfig {
  token: string;
  from: string;
  stream: string;
}

async function sendViaPostmark(
  p: CriticalAlertEmailPayload,
  cfg: PostmarkConfig,
): Promise<SendResult> {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': cfg.token,
    },
    body: JSON.stringify({
      From: cfg.from,
      To: p.to,
      Subject: `[KRITICKÝ] ${p.alertTitle}`,
      HtmlBody: renderHtml(p),
      TextBody: renderText(p),
      MessageStream: cfg.stream,
      Tag: 'critical-alert',
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `[mail] Postmark send failed: ${response.status} ${response.statusText} — ${detail.slice(0, 240)}`,
    );
  }
  const parsed = (await response.json().catch(() => null)) as
    | { MessageID?: string }
    | null;
  return { sent: true, postmarkMessageId: parsed?.MessageID };
}

function renderHtml(p: CriticalAlertEmailPayload): string {
  const greeting = p.recipientName ? `Dobrý den, ${escapeHtml(p.recipientName)},` : 'Dobrý den,';
  const sourceLink = p.sourceUrl
    ? `<p style="font-size:12px;line-height:1.6;color:#6B675D;margin:16px 0 0;">Zdroj: <a href="${escapeAttr(
        p.sourceUrl,
      )}" style="color:#A57516;">${escapeHtml(p.sourceUrl)}</a></p>`
    : '';
  return `<!doctype html>
<html lang="cs">
<body style="margin:0;padding:48px 24px;background:#0F0F0F;color:#E9E5DC;font-family:'IBM Plex Serif',Georgia,serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
    <tr><td>
      <div style="font-family:'IBM Plex Serif',Georgia,serif;font-size:22px;font-weight:500;letter-spacing:-0.015em;margin:0 0 8px;color:#E9E5DC;">
        <span style="font-style:italic">Industry</span><strong>Signal</strong>
      </div>
      <div style="font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#D9534F;margin:0 0 24px;">
        ● Kritický alert · ${escapeHtml(p.orgName)}
      </div>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#E9E5DC;">${greeting}</p>
      <p style="font-size:18px;line-height:1.4;font-weight:500;margin:0 0 12px;color:#F2BB54;">${escapeHtml(
        p.alertTitle,
      )}</p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#C9C5BC;">${escapeHtml(
        p.alertMessage,
      )}</p>
      <p style="margin:24px 0;">
        <a href="${escapeAttr(
          p.portalUrl,
        )}" style="background:#F2BB54;color:#0F0F0F;padding:12px 24px;text-decoration:none;display:inline-block;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">
          Otevřít alert log
        </a>
      </p>
      ${sourceLink}
      <p style="font-size:11px;line-height:1.6;color:#6B675D;margin:32px 0 0;font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;letter-spacing:0.06em;">
        Vygenerováno ${escapeHtml(p.createdAt.slice(0, 16).replace('T', ' '))} UTC.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(p: CriticalAlertEmailPayload): string {
  return [
    `[KRITICKÝ ALERT] ${p.alertTitle}`,
    `Organizace: ${p.orgName}`,
    '',
    p.alertMessage,
    '',
    p.sourceUrl ? `Zdroj: ${p.sourceUrl}` : null,
    `Otevřít alert log: ${p.portalUrl}`,
    '',
    `Vygenerováno ${p.createdAt.slice(0, 16).replace('T', ' ')} UTC.`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
