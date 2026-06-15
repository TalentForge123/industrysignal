import { analyzeAutomotive } from './automotive';
import { analyzeEnergy } from './energy';

export const SEGMENT_ANALYZERS = {
  energy: analyzeEnergy,
  automotive: analyzeAutomotive,
} as const;

export type SegmentKey = keyof typeof SEGMENT_ANALYZERS;
