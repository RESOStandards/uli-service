/**
 * The ULI match scorer: a pure function of (record A, record B, weight set).
 *
 * No corpus statistics, no index, nothing node-local, which is what makes the
 * number comparable across organizations and what makes exact parity a sensible
 * certification bar (section 3.1). Ported from `pilot/score.py`, rule for rule.
 *
 * This is the certification oracle. There is exactly one of it: both adapters,
 * the ingest path and the client all call this function, because two
 * implementations would drift and the drift would be invisible until a vendor
 * failed parity against a bug.
 *
 * What is NOT here: fuzziness. An agreement is exact on normalized values. A
 * fuzzy agreement is the retrieval layer's business (section 2.9 names BM25 as
 * how the reference *retrieves*), and retrieval relevance is corpus-relative,
 * so it must never be the score that crosses the wire.
 */

import type { LicenseeRecord } from './fields.js';
import { ULI_FIELDS } from './fields.js';
import { DEFAULT_WEIGHTS, derivedThreshold, type Tier, type WeightSet } from './weights.js';

export type Band = 'possible match' | 'review' | 'rejected';

export interface BreakdownEntry {
  readonly factor: string;
  readonly tier: Tier;
  readonly bits: number;
  readonly note: string;
}

export interface ScoreResult {
  readonly score: number;
  readonly threshold: number;
  readonly band: Band;
  readonly primariesMatched: number;
  readonly gatePassed: boolean;
  readonly breakdown: readonly BreakdownEntry[];
}

/**
 * Normalization, pinned (section 2.9 "Exact parity"): trim and case-fold. No
 * accent folding and no nickname expansion in this version; both are retrieval
 * concerns until the reference test vectors say otherwise.
 */
export const normalize = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim().toLowerCase();
  return s === '' ? undefined : s;
};

export type Agreements = Readonly<Record<string, boolean>>;

/**
 * Which identifiers agree between two records. Exact on normalized values.
 * The keys are the factor names of the weight table, not field names: a factor
 * such as Full Name is satisfied by `MemberFullName` or by first and last name.
 */
export const agreements = (a: LicenseeRecord, b: LicenseeRecord): Agreements => {
  const eq = (f: string): boolean => {
    const x = normalize(a[f]);
    return x !== undefined && x === normalize(b[f]);
  };
  const both = (...fs: readonly string[]): boolean =>
    fs.every((f) => normalize(a[f]) !== undefined && normalize(b[f]) !== undefined);
  const alleq = (...fs: readonly string[]): boolean => both(...fs) && fs.every(eq);

  const fullName = eq('MemberFullName') || alleq('MemberFirstName', 'MemberLastName');
  const nick = both('MemberNickname', 'MemberLastName') ? eq('MemberNickname') && eq('MemberLastName') : false;
  const licenseNS = alleq('MemberStateLicense', 'MemberStateLicenseState');
  const licenseNST = licenseNS && alleq('MemberStateLicenseType');

  return {
    NRDS: eq('MemberNationalAssociationId'),
    FullName: fullName,
    FullNickname: nick,
    LicenseNST: licenseNST,
    LicenseNS: licenseNS,
    OfficeId: eq('OfficeMlsId'),
    OfficeName: eq('OfficeName'),
    LastName: eq('MemberLastName'),
    FirstName: eq('MemberFirstName'),
    MiddleName: eq('MemberMiddleName'),
    Nickname: eq('MemberNickname'),
    LicenseType: eq('MemberStateLicenseType'),
  };
};

/**
 * Field-level agreement, for a comparison view: `true` when both carry the
 * field and agree, `false` when both carry it and differ, absent when either
 * side lacks it. Display only; the score comes from `agreements`.
 */
export const fieldAgreements = (a: LicenseeRecord, b: LicenseeRecord): Readonly<Record<string, boolean>> =>
  Object.fromEntries(
    ULI_FIELDS.flatMap((f) => {
      const x = normalize(a[f]);
      const y = normalize(b[f]);
      return x === undefined || y === undefined ? [] : [[f, x === y] as const];
    })
  );

const byBitsDescending = (x: BreakdownEntry, y: BreakdownEntry): number => y.bits - x.bits;

/** Score candidate `b` against query `a` under weight set `w`. */
export const score = (a: LicenseeRecord, b: LicenseeRecord, w: WeightSet = DEFAULT_WEIGHTS): ScoreResult => {
  const agr = agreements(a, b);
  const threshold = derivedThreshold(w);

  // Clusters first: the strongest matched member only, and every member counted
  // as spoken for whether or not it matched.
  const tiers: readonly (readonly [Tier, Readonly<Record<string, readonly string[]>>])[] = [
    ['primary', w.primaryClusters],
    ['secondary', w.secondaryClusters],
  ];
  const clusterEntries = tiers.flatMap(([tier, clusters]) =>
    Object.entries(clusters).flatMap(([name, members]) => {
      const hit = members.filter((m) => agr[m] === true);
      if (hit.length === 0) return [];
      const best = hit.reduce((acc, m) => ((w[tier][m] ?? 0) > (w[tier][acc] ?? 0) ? m : acc));
      return [
        {
          factor: best,
          tier,
          bits: w[tier][best] ?? 0,
          note: `${name} cluster, strongest of ${hit.length} matched`,
        },
      ];
    })
  );
  const counted = new Set(tiers.flatMap(([, clusters]) => Object.values(clusters).flat()));

  const singleEntries = tiers.flatMap(([tier]) =>
    Object.entries(w[tier])
      .filter(([factor]) => !counted.has(factor) && agr[factor] === true)
      .map(([factor, bits]) => ({ factor, tier, bits, note: '' }))
  );

  const breakdown = [...clusterEntries, ...singleEntries].sort(byBitsDescending);
  const total = breakdown.reduce((sum, e) => sum + e.bits, 0);
  const primariesMatched = breakdown.filter((e) => e.tier === 'primary').length;
  const gatePassed = primariesMatched >= 2;
  const band: Band =
    total >= threshold && gatePassed ? 'possible match' : total < w.rejectFloor ? 'rejected' : 'review';

  return { score: total, threshold, band, primariesMatched, gatePassed, breakdown };
};
