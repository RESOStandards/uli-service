/**
 * The identifiability gate of section 2.4.
 *
 * "A node MUST NOT broadcast a record that does not clear the identifiability
 * threshold: the record's own present factors MUST score highly enough that a
 * full match could reach the match threshold. In practice this requires at
 * least two primary identifiers, since a single primary identifier cannot reach
 * the threshold alone."
 *
 * The record's own present factors are exactly what it scores against itself,
 * so the gate is the self-score: the ceiling any candidate could reach. Both
 * halves of the sentence are checked, the score and the two-primary count,
 * because the scorer's own gate makes them equivalent today and a refitted
 * weight set could pull them apart.
 */

import type { LicenseeRecord } from './fields.js';
import { score, type ScoreResult } from './score.js';
import { DEFAULT_WEIGHTS, type WeightSet } from './weights.js';

export interface Identifiability {
  readonly identifiable: boolean;
  /** The record scored against itself: the most any candidate could score. */
  readonly ceiling: ScoreResult;
  readonly threshold: number;
  readonly primariesPresent: number;
  readonly reason?: string;
}

export const identifiability = (record: LicenseeRecord, w: WeightSet = DEFAULT_WEIGHTS): Identifiability => {
  const ceiling = score(record, record, w);
  const primariesPresent = ceiling.primariesMatched;
  const reachesThreshold = ceiling.score >= ceiling.threshold;
  const twoPrimaries = primariesPresent >= 2;
  const identifiable = reachesThreshold && twoPrimaries;
  const reason = identifiable
    ? undefined
    : !twoPrimaries
      ? `only ${primariesPresent} primary identifier${primariesPresent === 1 ? '' : 's'} present; section 2.4 requires at least two`
      : `present factors reach ${ceiling.score}, below the ${ceiling.threshold} threshold (section 2.4)`;
  return { identifiable, ceiling, threshold: ceiling.threshold, primariesPresent, reason };
};
