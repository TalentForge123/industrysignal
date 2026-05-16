// Magic-link delivery.
//
// Dev (NODE_ENV !== 'production'): log the full link to stdout so the
// developer can Cmd+click it from the terminal. No network calls, no
// dependency on Postmark — useful while we have no verified sender
// domain yet.
//
// Prod (NODE_ENV === 'production'): require POSTMARK_TOKEN. If the
// token is missing the function throws rather than silently degrading
// to the console — auth would otherwise look fine in logs while no
// user could actually receive a link. Explicit failure is the point.

interface MagicLinkPayload {
  to: string;
  url: string;
  expiresAt: Date;
}

export async function sendMagicLink(payload: MagicLinkPayload): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const token = process.env.POSTMARK_TOKEN;
    if (!token) {
      throw new Error(
        '[mail] POSTMARK_TOKEN is not set in production. Magic-link send refuses to fall back to the dev console.log; auth would be silently broken otherwise. Set POSTMARK_TOKEN (and POSTMARK_FROM_EMAIL on a DKIM-verified domain) before deploying.',
      );
    }
    const from = process.env.POSTMARK_FROM_EMAIL ?? 'portal@industrysignal.cz';
    await sendViaPostmark(payload, { token, from });
    return;
  }
  sendToDevConsole(payload);
}

function sendToDevConsole({ to, url, expiresAt }: MagicLinkPayload): void {
  const bar = '='.repeat(78);
  const lines = [
    '',
    bar,
    `  [mail/dev]  Magic link  →  ${to}`,
    `  [mail/dev]  ${url}`,
    `  [mail/dev]  Expires at ${expiresAt.toISOString()}`,
    bar,
    '',
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

interface PostmarkConfig {
  token: string;
  from: string;
}

async function sendViaPostmark(
  { to, url, expiresAt }: MagicLinkPayload,
  cfg: PostmarkConfig,
): Promise<void> {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': cfg.token,
    },
    body: JSON.stringify({
      From: cfg.from,
      To: to,
      Subject: 'Přihlášení do IndustrySignal — váš jednorázový odkaz',
      HtmlBody: renderHtml({ url, expiresAt }),
      TextBody: renderText({ url, expiresAt }),
      MessageStream: 'outbound',
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `[mail] Postmark send failed: ${response.status} ${response.statusText} — ${detail.slice(0, 240)}`,
    );
  }
}

function renderHtml({ url, expiresAt }: { url: string; expiresAt: Date }): string {
  return `<!doctype html>
<html lang="cs">
<body style="margin:0;padding:48px 24px;background:#F4EFE4;color:#0F0F0F;font-family:'IBM Plex Serif',Georgia,serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
    <tr><td>
      <div style="font-family:'IBM Plex Serif',Georgia,serif;font-size:22px;font-weight:500;letter-spacing:-0.015em;margin:0 0 8px;">
        <span style="font-style:italic">Industry</span><strong>Signal</strong>
      </div>
      <div style="font-family:'IBM Plex Mono','SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#7A5210;margin:0 0 32px;">
        Přihlášení do portálu
      </div>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#0F0F0F;">
        Pro pokračování do klientského portálu otevřete následující odkaz. Platnost odkazu vyprší
        ${expiresAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.
      </p>
      <p style="margin:32px 0;">
        <a href="${url}" style="background:#A57516;color:#1B1B1B;padding:12px 24px;text-decoration:none;display:inline-block;font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:500;border-radius:4px;">
          Pokračovat
        </a>
      </p>
      <p style="font-size:12px;line-height:1.6;color:#6B675D;margin:32px 0 0;">
        Pokud jste o tento odkaz nepožádali, e-mail ignorujte. Žádný účet se bez kliknutí na odkaz nevytvoří ani nepřihlásí.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText({ url, expiresAt }: { url: string; expiresAt: Date }): string {
  return [
    'Přihlášení do IndustrySignal',
    '',
    'Pro pokračování do klientského portálu otevřete tento odkaz:',
    url,
    '',
    `Platnost odkazu vyprší ${expiresAt.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
    '',
    'Pokud jste o tento odkaz nepožádali, e-mail ignorujte.',
  ].join('\n');
}
