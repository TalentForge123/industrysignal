// Segment analyzer orchestrator.
//
// Takes a structured SegmentReportInput + an injected LlmRunner and
// produces a draft section per language. Persistence + caching happens
// through @industrysignal/db's `cachedLlmCall` — the same row that backs
// the call audit becomes the source of truth for "this draft was
// derived from which inputs", which the Studio audit panel reads later.

import { cachedLlmCall, type Database } from '@industrysignal/db';
import { buildSegmentDraftPrompt } from './prompts';
import type { LlmRunner } from './runner';
import type {
  SegmentReportInput,
  SegmentReportDraft,
  SegmentRunResult,
} from './types';

export interface RunSegmentAnalyzerArgs {
  db: Database;
  input: SegmentReportInput;
  /** Display label for the segment in the prompt — "Automotive", "Energetika". */
  segmentLabel: string;
  /** Model to use. Defaults to Claude Sonnet 4.5 per HANDOFF §5. */
  model?: string;
  /** Production runner (Anthropic SDK) or a stub for dev / tests. */
  runner: LlmRunner;
  /** Back-pointer for the audit log — usually `report:<id>`. */
  consumerRef?: string;
  promptVersion?: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const DEFAULT_PROMPT_VERSION = 'segment-draft-v1';

export async function runSegmentAnalyzer(
  args: RunSegmentAnalyzerArgs,
): Promise<SegmentRunResult> {
  const model = args.model ?? DEFAULT_MODEL;
  const promptVersion = args.promptVersion ?? DEFAULT_PROMPT_VERSION;

  const [csOut, enOut] = await Promise.all([
    runForLanguage(args, model, promptVersion, 'cs'),
    runForLanguage(args, model, promptVersion, 'en'),
  ]);

  return {
    draftCs: csOut.draft,
    draftEn: enOut.draft,
    llmCacheKeyCs: csOut.cacheKey,
    llmCacheKeyEn: enOut.cacheKey,
    cachedCs: csOut.cached,
    cachedEn: enOut.cached,
  };
}

async function runForLanguage(
  args: RunSegmentAnalyzerArgs,
  model: string,
  promptVersion: string,
  language: 'cs' | 'en',
): Promise<{ draft: SegmentReportDraft; cacheKey: string; cached: boolean }> {
  const systemPrompt = buildSegmentDraftPrompt({
    segmentLabel: args.segmentLabel,
    language,
  });

  const sources = buildSources(args.input);
  const userPayload = {
    segment: args.input.segmentKey,
    quarter: args.input.quarter,
    macro: args.input.macro,
    company_movements: args.input.companyMovements,
    insolvency_count: args.input.insolvencyCount,
    news: args.input.news.slice(0, 20),
    sources,
  };

  const { cached, row, result } = await cachedLlmCall(
    args.db,
    {
      kind: 'segment_draft',
      model,
      systemPrompt,
      input: { language, ...userPayload },
      promptId: 'segment-draft',
      promptVersion,
      consumerRef: args.consumerRef,
    },
    async () => {
      const out = await args.runner({
        model,
        systemPrompt,
        userPrompt: JSON.stringify(userPayload),
        temperature: 0.2,
        maxTokens: 1200,
      });
      return out;
    },
  );

  const parsed = parseModelOutput(
    result?.output ?? row.output,
    args.input.segmentKey,
  );

  return {
    draft: {
      segmentKey: args.input.segmentKey,
      section: {
        id: args.input.segmentKey,
        kind: args.segmentLabel,
        title: parsed.title,
        summary: parsed.summary,
        body: parsed.body,
        sources,
      },
    },
    cacheKey: row.cacheKey,
    cached,
  };
}

interface ParsedModelOutput {
  title: string;
  summary: string;
  body: string[];
}

function parseModelOutput(raw: unknown, segmentKey: string): ParsedModelOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Segment ${segmentKey}: model returned no JSON output`);
  }
  const obj = raw as Record<string, unknown>;
  const title = String(obj.title ?? '').trim();
  const summary = String(obj.summary ?? '').trim();
  const body = Array.isArray(obj.body)
    ? (obj.body as unknown[]).map((p) => String(p)).filter((p) => p.length > 0)
    : [];
  if (!title || !summary || body.length === 0) {
    throw new Error(
      `Segment ${segmentKey}: model output missing required fields (title/summary/body)`,
    );
  }
  return { title, summary, body };
}

/** Flatten the input into an indexed sources array that the LLM cites by N. */
function buildSources(
  input: SegmentReportInput,
): Array<{ n: number; label: string; url?: string }> {
  const out: Array<{ n: number; label: string; url?: string }> = [];
  let n = 1;
  for (const m of input.macro) {
    out.push({
      n: n++,
      label: `${m.nameCs} (${m.latestPeriod ?? '—'}) = ${m.latestValue ?? '—'} ${m.unit}`,
    });
  }
  for (const mv of input.companyMovements.slice(0, 8)) {
    out.push({
      n: n++,
      label: `${mv.name} (IČO ${mv.ico}) — ${mv.changeKind}${
        mv.detail ? `: ${mv.detail}` : ''
      }`,
    });
  }
  if (input.insolvencyCount > 0) {
    out.push({
      n: n++,
      label: `Insolvenční rejstřík ISIR: ${input.insolvencyCount} aktivních řízení v segmentu`,
    });
  }
  for (const news of input.news.slice(0, 8)) {
    out.push({ n: n++, label: news.title, url: news.url });
  }
  return out;
}
