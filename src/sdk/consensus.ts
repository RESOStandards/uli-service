/**
 * Consensus, section 2.6.
 *
 * "Consensus requires two independent conditions: at least floor(2/3 x R)
 * resolvers have replied in the thread, and every resolver on the requesting
 * node's mandatory list is among those replies. The mandatory resolvers are
 * always a subset of R and count toward the floor(2/3 x R); the remainder is
 * filled by nonmandatory replies. The mandatory condition is absolute."
 *
 * R is pinned at broadcast, so it arrives here as the list of resolver
 * identifiers the thread was pinned to, and only replies from members of that
 * list count. The outcome, once reached, follows section 2.6's last paragraph:
 * "adopt the highest-scoring match over threshold, else mint a new ULI."
 */

export interface MatchReply {
  readonly resolver: string;
  readonly kind: 'match';
  readonly uli: string;
  readonly score: number;
}

export interface NoMatchReply {
  readonly resolver: string;
  readonly kind: 'no-match';
}

export type Reply = MatchReply | NoMatchReply;

export interface TallyInput {
  /** The pinned pool: the resolver identifiers in R for this thread. */
  readonly pool: readonly string[];
  /** The originator's mandatory list, a subset of the pool. */
  readonly mandatory: readonly string[];
  readonly replies: readonly Reply[];
  readonly threshold: number;
}

export interface Tally {
  readonly r: number;
  readonly needed: number;
  readonly replied: number;
  readonly mandatoryMissing: readonly string[];
  readonly reached: boolean;
  /** Defined only once consensus is reached. */
  readonly outcome?: 'adopt' | 'mint';
  /** The highest-scoring match over threshold, when the outcome is adopt. */
  readonly best?: MatchReply;
  readonly matches: readonly MatchReply[];
}

/** floor(2/3 x R), as section 2.6 writes it; `floor` is the Workgroup's deliberate choice (section 6). */
export const consensusCount = (r: number): number => Math.floor((2 * r) / 3);

const byScoreThenUli = (x: MatchReply, y: MatchReply): number =>
  y.score - x.score || (x.uli < y.uli ? -1 : x.uli > y.uli ? 1 : 0);

export const tally = (input: TallyInput): Tally => {
  const pool = new Set(input.pool);
  const r = pool.size;
  const needed = consensusCount(r);
  const repliers = new Set(input.replies.map((x) => x.resolver).filter((id) => pool.has(id)));
  const mandatoryMissing = input.mandatory.filter((m) => pool.has(m) && !repliers.has(m));
  const reached = repliers.size >= needed && mandatoryMissing.length === 0;

  const matches = input.replies
    .filter((x): x is MatchReply => x.kind === 'match' && pool.has(x.resolver))
    .filter((x) => x.score >= input.threshold)
    .sort(byScoreThenUli);

  const base = { r, needed, replied: repliers.size, mandatoryMissing, reached, matches };
  if (!reached) return base;
  return matches.length > 0 ? { ...base, outcome: 'adopt', best: matches[0] } : { ...base, outcome: 'mint' };
};
