// Studio's LLM runner selection.
//
// Sprint 4 ships with the stub runner (deterministic placeholder) so the
// "Generate LLM draft" button works in dev without an Anthropic API key.
// The production runner — Anthropic SDK + streaming + cost tracking —
// lands in apps/workers/src/llm during Sprint 6 (HANDOFF §5). When that
// arrives, swap the export here for the production runner gated on
// `process.env.ANTHROPIC_API_KEY`.

import { makeStubLlmRunner, type LlmRunner } from '@industrysignal/enrichment';

export function getLlmRunner(): LlmRunner {
  // Future: if (process.env.ANTHROPIC_API_KEY) return createAnthropicRunner(...)
  return makeStubLlmRunner('studio-dev');
}
