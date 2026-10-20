/**
 * The weight set, and what is derived from it.
 *
 * Section 2.9 publishes the weights as a table and names a 1300 bar. The bar is
 * not taken from the table here; it is derived from it, as the sum of the two
 * smallest co-matchable primary weights. That is what makes "any two primary
 * identifiers clear" (section 2.4) true by construction, and it is why the
 * number is 1250 today rather than 1300: 1300 was right for an earlier set of
 * three primaries and went stale when two more were added without recomputing.
 *
 * Weights are a parameter, never a constant. Section 2.9 makes the weight set
 * and threshold network parameters posted to the governance feed, and requires
 * every node to rerun matching when they change, so nothing here is baked into
 * an index and nothing downstream may hardcode the threshold.
 */

export type Tier = 'primary' | 'secondary';

export interface WeightSet {
  readonly primary: Readonly<Record<string, number>>;
  /** Members of one cluster are alternatives: score the strongest that matched. */
  readonly primaryClusters: Readonly<Record<string, readonly string[]>>;
  readonly secondary: Readonly<Record<string, number>>;
  readonly secondaryClusters: Readonly<Record<string, readonly string[]>>;
  readonly rejectFloor: number;
}

/**
 * Section 2.9's table, as `pilot/score.py` carries it. Illustrative but correct
 * in idea; to be refitted against pilot data (section 6, "until that data exists").
 */
export const DEFAULT_WEIGHTS: WeightSet = {
  primary: {
    NRDS: 800,
    FullName: 700,
    FullNickname: 650,
    LicenseNST: 625,
    LicenseNS: 600,
  },
  primaryClusters: { license: ['LicenseNST', 'LicenseNS'] },
  secondary: {
    OfficeId: 100,
    OfficeName: 80,
    LastName: 10,
    FirstName: 10,
    MiddleName: 10,
    Nickname: 10,
    LicenseType: 10,
  },
  secondaryClusters: { office: ['OfficeId', 'OfficeName'] },
  rejectFloor: 700,
};

const clusteredMembers = (clusters: Readonly<Record<string, readonly string[]>>): ReadonlySet<string> =>
  new Set(Object.values(clusters).flat());

/**
 * The primary weights that can be matched together, ascending.
 *
 * Two members of one cluster are not co-matchable: a candidate matches at most
 * one of them, because the cluster scores its strongest member only. So each
 * cluster contributes its minimum once, and the unclustered primaries contribute
 * themselves. This is the subtlety that makes the threshold 1250 and not 1225:
 * the two smallest raw weights are the two license forms, and no candidate ever
 * matches both.
 */
export const coMatchablePrimaries = (w: WeightSet = DEFAULT_WEIGHTS): readonly number[] => {
  const clustered = clusteredMembers(w.primaryClusters);
  const singles = Object.entries(w.primary)
    .filter(([name]) => !clustered.has(name))
    .map(([, weight]) => weight);
  const perCluster = Object.values(w.primaryClusters).map((members) =>
    Math.min(...members.map((m) => w.primary[m] ?? Number.POSITIVE_INFINITY))
  );
  return [...singles, ...perCluster].sort((a, b) => a - b);
};

/** The match threshold: the two smallest co-matchable primaries, summed. Never a constant. */
export const derivedThreshold = (w: WeightSet = DEFAULT_WEIGHTS): number => {
  const co = coMatchablePrimaries(w);
  if (co.length < 2) {
    throw new Error('a weight set needs at least two co-matchable primary identifiers to derive a threshold');
  }
  return co[0] + co[1];
};

/** Every secondary, counted once per cluster at its strongest member. */
const secondaryTotal = (w: WeightSet): number => {
  const clustered = clusteredMembers(w.secondaryClusters);
  const clusters = Object.values(w.secondaryClusters).reduce(
    (sum, members) => sum + Math.max(...members.map((m) => w.secondary[m] ?? 0)),
    0
  );
  const singles = Object.entries(w.secondary)
    .filter(([name]) => !clustered.has(name))
    .reduce((sum, [, weight]) => sum + weight, 0);
  return clusters + singles;
};

export interface Invariants {
  readonly threshold: number;
  readonly derivation: string;
  /** True by construction of the threshold. */
  readonly twoPrimariesAlwaysClear: true;
  readonly noSinglePrimaryReachesThreshold: boolean;
  readonly secondariesCannotSubstitute: boolean;
  readonly secondaryHeadroom: number;
  readonly holds: boolean;
}

/**
 * The three checks a tuning panel runs on every weight change, exactly as
 * `pilot/score.py` states them: the threshold is derived; no single primary
 * reaches it; the strongest single primary plus every secondary still falls short.
 */
export const invariants = (w: WeightSet = DEFAULT_WEIGHTS): Invariants => {
  const threshold = derivedThreshold(w);
  const co = coMatchablePrimaries(w);
  const strongest = Math.max(...co);
  const secondaries = secondaryTotal(w);
  const noSingle = strongest < threshold;
  const noSubstitute = strongest + secondaries < threshold;
  return {
    threshold,
    derivation: `${co[0]} + ${co[1]}, the two smallest co-matchable primaries`,
    twoPrimariesAlwaysClear: true,
    noSinglePrimaryReachesThreshold: noSingle,
    secondariesCannotSubstitute: noSubstitute,
    secondaryHeadroom: threshold - strongest - secondaries,
    holds: noSingle && noSubstitute,
  };
};
