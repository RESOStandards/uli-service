/**
 * The bulk join: resolving a whole roster at once. Not built, by decision.
 *
 * At 300,000 licensees the naive pair space is 45 billion and the blocked one
 * about 60 million. The compute would want a fan-out (a Step Functions map or a
 * container task), not a single 15-minute Lambda. But the compute is not the
 * obstacle: the specification defines single-licensee resolution only. All five
 * worked examples resolve one licensee, and 300,000 threads each waiting on
 * floor(2/3 x R) is a different mechanism, not a slower one. Issue #14 and the
 * Bulk Ingest milestone show this was known in 2022 and never reached the
 * specification. Section 2.12.3's self-healing is the candidate answer, and it
 * is a protocol decision before it is an engineering one.
 */

import type { Outcome } from './hub.js';

export interface BulkJoinRequest {
  readonly uoi: string;
}

export const bulkJoin = (_request: BulkJoinRequest): Outcome<never> => ({
  ok: false,
  code: 'invalid',
  reason: 'bulk resolution is not defined by RCP-54; the specification resolves one licensee per thread and a roster-scale flow needs a protocol decision first',
});
