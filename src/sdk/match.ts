/**
 * The matcher: score every retrieved candidate and rank them.
 *
 * Ranking is deterministic, because section 2.9 pins tie-breaking to the
 * reference harness: score descending, then more primary identifiers matched,
 * then the candidate key ascending as a last resort so two engines holding the
 * same candidates list them in the same order.
 */

import type { LicenseeRecord } from './fields.js';
import { score, type ScoreResult } from './score.js';
import { DEFAULT_WEIGHTS, type WeightSet } from './weights.js';

export interface Candidate {
  /** The resolver's own key for the record. Opaque to the network. */
  readonly key: string;
  readonly record: LicenseeRecord;
  /** The ULI the candidate is bound to, if any. */
  readonly uli?: string;
}

export interface Ranked extends Candidate {
  readonly result: ScoreResult;
}

export interface RankOptions {
  /** ULIs excluded from matching, as a merge broadcast requires (section 2.7). */
  readonly excludeUlis?: readonly string[];
  /** A candidate key to leave out, typically the query record itself. */
  readonly excludeKey?: string;
}

/** The pinned tie-break. Exported so a harness can assert the order it implies. */
export const compareRanked = (x: Ranked, y: Ranked): number =>
  y.result.score - x.result.score ||
  y.result.primariesMatched - x.result.primariesMatched ||
  (x.key < y.key ? -1 : x.key > y.key ? 1 : 0);

export const rankCandidates = (
  query: LicenseeRecord,
  candidates: readonly Candidate[],
  w: WeightSet = DEFAULT_WEIGHTS,
  options: RankOptions = {}
): readonly Ranked[] => {
  const excluded = new Set(options.excludeUlis ?? []);
  return candidates
    .filter((c) => c.key !== options.excludeKey)
    .filter((c) => c.uli === undefined || !excluded.has(c.uli))
    .map((c) => ({ ...c, result: score(query, c.record, w) }))
    .sort(compareRanked);
};

/** The candidates a resolver may reply with: section 2.5 forbids a match reply below the threshold. */
export const matchesAtOrAboveThreshold = (ranked: readonly Ranked[]): readonly Ranked[] =>
  ranked.filter((r) => r.result.band === 'possible match');
