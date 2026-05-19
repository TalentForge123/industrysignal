// Inngest client surface used by the portal app.
//
// Production / dev: the real `@industrysignal/jobs` client — emits events
// that the dev Inngest server (or Inngest Cloud) picks up.
//
// E2E: `E2E_INNGEST_MOCK=1` swaps to a no-op stub so Playwright specs can
// exercise Watch List add / remove without needing the Inngest dev
// server running and without the company/refresh handler hitting ARES.
// Background-job behavior is covered by vitest in @industrysignal/jobs
// instead — the E2E concern is the portal HTTP surface, not the fan-out.

import { inngest as realInngest } from '@industrysignal/jobs';

interface SendArgs {
  name: string;
  data: unknown;
}

interface SendResult {
  ids: string[];
}

interface InngestLike {
  send: (event: SendArgs | SendArgs[]) => Promise<SendResult>;
}

function buildMock(): InngestLike {
  let counter = 0;
  return {
    async send(event) {
      const events = Array.isArray(event) ? event : [event];
      const ids = events.map(() => `mock-evt-${++counter}`);
      // Loud-but-cheap log so failed tests are easy to debug. Stays on
      // stderr so it doesn't pollute structured server output.
      process.stderr.write(
        `[inngest/mock] send ${events.map((e) => e.name).join(',')} → ${ids.join(',')}\n`,
      );
      return { ids };
    },
  };
}

const useMock = process.env.E2E_INNGEST_MOCK === '1';

export const inngest: InngestLike = useMock ? buildMock() : (realInngest as unknown as InngestLike);
