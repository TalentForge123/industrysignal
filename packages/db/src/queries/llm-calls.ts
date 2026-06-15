// LLM call cache + audit (HANDOFF §5).
//
// Every Claude/OpenAI invocation goes through `cachedLlmCall()`. The
// cache_key is a stable SHA-256 of (model + system + user input +
// temperature); a hit returns the prior `output` JSONB without a
// network round-trip. Misses run the provided runner and persist the
// result. Failures are persisted too (status='error') so a retry on
// the same input deterministically replays the same error class until
// inputs change — useful for prompt/version debugging.
//
// This module is intentionally provider-agnostic: it only knows about
// cache keys and storage. The actual Anthropic SDK call lives in
// packages/enrichment.

import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../client';
import { llmCalls, type LlmCallKind } from '../schema';

export type LlmCallRow = typeof llmCalls.$inferSelect;

export interface LlmCallInput {
  kind: LlmCallKind;
  model: string;
  systemPrompt: string;
  /** The user payload — typically a JSON-serializable object passed to the model. */
  input: unknown;
  /** Temperature factored into the cache key so a re-tuned run is a cache miss. */
  temperature?: number;
  promptId?: string;
  promptVersion?: string;
  /** Free-form back-pointer to the consumer ('report:<id>', 'mission:<id>', ...). */
  consumerRef?: string;
}

export interface LlmCallResult {
  output: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
}

export function computeCacheKey(input: LlmCallInput): string {
  const hash = createHash('sha256');
  hash.update(input.model);
  hash.update('');
  hash.update(input.systemPrompt);
  hash.update('');
  hash.update(JSON.stringify(input.input));
  hash.update('');
  hash.update(String(input.temperature ?? 0));
  hash.update('');
  hash.update(input.promptId ?? '');
  hash.update('');
  hash.update(input.promptVersion ?? '');
  return hash.digest('hex');
}

export async function findLlmCallByCacheKey(
  db: Database,
  cacheKey: string,
): Promise<LlmCallRow | null> {
  const rows = await db.select().from(llmCalls).where(eq(llmCalls.cacheKey, cacheKey)).limit(1);
  return rows[0] ?? null;
}

/**
 * Run an LLM call with persistent caching. If the (model + prompt +
 * input + temperature) tuple has been seen before, returns the cached
 * `output` without invoking `runner`. Otherwise calls `runner`, stores
 * the result (success or error), and returns it.
 */
export async function cachedLlmCall<T extends LlmCallResult>(
  db: Database,
  input: LlmCallInput,
  runner: () => Promise<T>,
): Promise<{ cached: boolean; row: LlmCallRow; result: T | null }> {
  const cacheKey = computeCacheKey(input);

  const existing = await findLlmCallByCacheKey(db, cacheKey);
  if (existing && existing.status === 'ok') {
    return {
      cached: true,
      row: existing,
      result: { output: existing.output } as T,
    };
  }

  // Miss — invoke runner.
  const startedAt = Date.now();
  try {
    const result = await runner();
    const latencyMs = result.latencyMs ?? Date.now() - startedAt;
    const [row] = await db
      .insert(llmCalls)
      .values({
        kind: input.kind,
        cacheKey,
        model: input.model,
        promptId: input.promptId ?? null,
        promptVersion: input.promptVersion ?? null,
        systemPrompt: input.systemPrompt,
        input: input.input as object,
        output: (result.output ?? null) as object | null,
        tokensIn: result.tokensIn ?? null,
        tokensOut: result.tokensOut ?? null,
        costUsd: result.costUsd != null ? String(result.costUsd) : null,
        latencyMs,
        status: 'ok',
        consumerRef: input.consumerRef ?? null,
      })
      .onConflictDoNothing({ target: llmCalls.cacheKey })
      .returning();
    return {
      cached: false,
      row: row ?? (await findLlmCallByCacheKey(db, cacheKey))!,
      result,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const [row] = await db
      .insert(llmCalls)
      .values({
        kind: input.kind,
        cacheKey,
        model: input.model,
        promptId: input.promptId ?? null,
        promptVersion: input.promptVersion ?? null,
        systemPrompt: input.systemPrompt,
        input: input.input as object,
        output: null,
        latencyMs,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
        consumerRef: input.consumerRef ?? null,
      })
      .onConflictDoNothing({ target: llmCalls.cacheKey })
      .returning();
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
      llmCallRow: row,
    });
  }
}
