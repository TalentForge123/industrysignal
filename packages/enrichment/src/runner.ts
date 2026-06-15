// Provider-agnostic LLM runner contract.
//
// The Anthropic SDK is intentionally NOT imported here — the segment
// pipeline depends on an injected `LlmRunner` so unit tests can stub
// the model. The production runner lives in apps/workers and wires
// Claude Sonnet + cost tracking; the test runner returns a fixture.
//
// Shape mirrors what @industrysignal/db's `cachedLlmCall` expects
// `runner()` to return.

export interface LlmRunnerInput {
  model: string;
  systemPrompt: string;
  /** Stringified user payload — runner is responsible for any wrapping
   *  (e.g. Anthropic's `messages: [{role:'user', content: ...}]`). */
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmRunnerOutput {
  /** Parsed JSON from the model when `responseFormat=json`, else raw text in .text. */
  output: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
}

export type LlmRunner = (args: LlmRunnerInput) => Promise<LlmRunnerOutput>;

/**
 * Test-only runner that returns a deterministic placeholder draft.
 * Useful for the Studio editor "LLM draft" action in dev environments
 * without an ANTHROPIC_API_KEY.
 */
export function makeStubLlmRunner(label = 'stub'): LlmRunner {
  return async ({ systemPrompt, userPrompt }) => {
    const parsed: { segment?: string } = (() => {
      try {
        return JSON.parse(userPrompt);
      } catch {
        return {};
      }
    })();
    const segment = parsed.segment ?? 'segment';
    return {
      output: {
        title: `${segment} — placeholder draft (${label})`,
        summary: `Stub draft pro segment ${segment}. Žádný LLM call nebyl proveden.`,
        body: [
          'Toto je deterministický placeholder vygenerovaný stub runnerem.',
          'V produkci bude tento výstup nahrazen voláním Claude Sonnet 4.5 s povinnými citacemi.',
        ],
      },
      // Counts approximate tokens at the standard ~4 chars/token ratio.
      // The `tokens_in` column is an integer — keep the division floored
      // so a non-integer never reaches Postgres.
      tokensIn: Math.floor(systemPrompt.length / 4),
      tokensOut: 120,
      costUsd: 0,
      latencyMs: 5,
    };
  };
}
