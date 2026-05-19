// Critical-alert email sender — dev/prod fork + Postmark payload shape.
// No real network: prod path is exercised against a fetch stub.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sendCriticalAlertEmail,
  type CriticalAlertEmailPayload,
} from '../src/mail';

function makePayload(over: Partial<CriticalAlertEmailPayload> = {}): CriticalAlertEmailPayload {
  return {
    to: 'recipient@example.cz',
    recipientName: 'Jan Novák',
    orgName: 'Acme Industrial s.r.o.',
    alertTitle: 'Insolvenční návrh — Vítkovice Steel a.s.',
    alertMessage: 'Spisová značka INS 628/2024 (Senát 60). Stav: ZAHÁJENÍ ÚPADKU.',
    sourceUrl: 'https://isir.justice.cz/case/abc',
    portalUrl: 'https://industrysignal.cz/portal/alerts',
    createdAt: '2026-05-19T08:42:11.000Z',
    ...over,
  };
}

describe('sendCriticalAlertEmail — dev path', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalToken = process.env.POSTMARK_TOKEN;

  beforeEach(() => {
    // The fork checks NODE_ENV at call time — make sure we're outside prod.
    process.env.NODE_ENV = 'test';
    delete process.env.POSTMARK_TOKEN;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalToken !== undefined) process.env.POSTMARK_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it('returns sent=false and logs to stdout without hitting fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await sendCriticalAlertEmail(makePayload());
    expect(result.sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('sendCriticalAlertEmail — prod path', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalToken = process.env.POSTMARK_TOKEN;
  const originalFrom = process.env.POSTMARK_FROM_EMAIL;
  const originalStream = process.env.POSTMARK_ALERT_STREAM;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.POSTMARK_TOKEN = 'test-token';
    process.env.POSTMARK_FROM_EMAIL = 'alerts@industrysignal.cz';
    process.env.POSTMARK_ALERT_STREAM = 'broadcast';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.POSTMARK_TOKEN = originalToken;
    process.env.POSTMARK_FROM_EMAIL = originalFrom;
    process.env.POSTMARK_ALERT_STREAM = originalStream;
    vi.restoreAllMocks();
  });

  it('posts the expected Postmark payload and returns the message id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ MessageID: 'pm-msg-123' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendCriticalAlertEmail(makePayload());

    expect(result).toEqual({ sent: true, postmarkMessageId: 'pm-msg-123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.postmarkapp.com/email');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Postmark-Server-Token']).toBe('test-token');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.From).toBe('alerts@industrysignal.cz');
    expect(body.To).toBe('recipient@example.cz');
    expect(body.Subject).toBe('[KRITICKÝ] Insolvenční návrh — Vítkovice Steel a.s.');
    expect(body.MessageStream).toBe('broadcast');
    expect(body.Tag).toBe('critical-alert');
    expect(typeof body.HtmlBody).toBe('string');
    expect(typeof body.TextBody).toBe('string');
    expect(body.TextBody).toContain('INS 628/2024');
    expect(body.HtmlBody).toContain('Acme Industrial s.r.o.');
  });

  it('escapes HTML in user-controlled fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ MessageID: 'pm-msg-456' }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await sendCriticalAlertEmail(
      makePayload({
        orgName: 'Acme <script>alert(1)</script> s.r.o.',
        alertTitle: 'Bug & Co s "quotes"',
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body.HtmlBody).not.toContain('<script>');
    expect(body.HtmlBody).toContain('&lt;script&gt;');
    expect(body.HtmlBody).toContain('&quot;quotes&quot;');
    // Subject + text body keep raw text — they aren't HTML contexts.
    expect(body.Subject).toContain('Bug & Co s "quotes"');
  });

  it('throws when POSTMARK_TOKEN is missing in production', async () => {
    delete process.env.POSTMARK_TOKEN;
    await expect(sendCriticalAlertEmail(makePayload())).rejects.toThrow(
      /POSTMARK_TOKEN/,
    );
  });

  it('throws when Postmark responds non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => '{"ErrorCode":300,"Message":"Invalid From address"}',
      json: async () => ({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendCriticalAlertEmail(makePayload())).rejects.toThrow(
      /Postmark send failed: 422/,
    );
  });
});
