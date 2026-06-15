// Public surface for @industrysignal/enrichment.
//
// HANDOFF §4: each industrial segment has a fetcher (lives under
// data-sources/* in the wider repo) + an analyzer (here). The analyzer
// reads raw inputs from the database, derives metrics, and calls
// Claude for editorial synthesis. Output is an editorial draft — never
// the published copy directly; the Studio app handles human review.

export type { SegmentReportInput, SegmentReportDraft, SegmentRunResult } from './types';
export { makeStubLlmRunner, type LlmRunner, type LlmRunnerInput, type LlmRunnerOutput } from './runner';
export { runSegmentAnalyzer } from './pipeline';
export { analyzeEnergy } from './segments/energy';
export { analyzeAutomotive } from './segments/automotive';
export { SEGMENT_ANALYZERS, type SegmentKey } from './segments';
export { buildSegmentDraftPrompt } from './prompts';
