// Server-side Claude runner (HANDOFF §5). The Anthropic SDK call lives
// here, behind the server boundary — the API key never reaches the client.
// Consumed by the mission research route through @industrysignal/db's
// `cachedLlmCall`, which adds the persistent cache + audit layer.
//
// The system prompt carries the stable, reusable part of a research call
// (client brief + rubric + output rules); a `cache_control` breakpoint on
// it lets Anthropic prompt-caching amortize cost across the several
// research moves an operator fires for one mission. The per-call task goes
// in the user turn.

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Sonnet for research / synthesis (BUILD-HANDOFF §2): ranking real connector
// candidates against the rubric, assigning role / priority / edges.
export const RESEARCH_MODEL = 'claude-sonnet-4-6';

// Haiku for cheap classification / normalization — mapping the brief's CZ
// NACE + keywords into FR NAF (APE) codes and search terms for the FR
// connector. Fast work that doesn't need Sonnet.
export const CLASSIFY_MODEL = 'claude-haiku-4-5';

export interface ClaudeJsonArgs {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeRunResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — the research route cannot call Claude.');
  }
  cached ??= new Anthropic();
  return cached;
}

/**
 * Single-shot text completion. The caller's prompt asks for a JSON array;
 * parsing + guardrails happen one layer up (lib/mission-research.ts) so
 * this stays a thin transport wrapper.
 */
export async function runClaudeJson(args: ClaudeJsonArgs): Promise<ClaudeRunResult> {
  const msg = await client().messages.create({
    model: args.model ?? RESEARCH_MODEL,
    max_tokens: args.maxTokens ?? 1500,
    temperature: args.temperature ?? 0.2,
    system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: args.user }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return {
    text,
    tokensIn: msg.usage?.input_tokens,
    tokensOut: msg.usage?.output_tokens,
  };
}
