/**
 * The governance feed, section 2.10, as a node sees it.
 *
 * RESO publishes an ordered, PII-free feed every resolver follows: who is
 * certified, each organization's Ed25519 public key, status changes and the
 * adopted weight set and threshold. `R` is the filtered view: a node is in R if
 * and only if it is certified, compliant and active. A feed position is the
 * version a broadcast pins.
 *
 * Locally there is no RESO feed, so this is an in-process one with the same
 * shape: the adapter registers each tenant it hosts as a resolver with a key.
 * In production this is replaced by a reader of the real feed; nothing in the
 * hub knows the difference.
 */

import { DEFAULT_WEIGHTS, derivedThreshold, invariants, type Invariants, type WeightSet } from '../sdk/weights.js';

export type ResolverStatus = 'active' | 'inactive' | 'noncompliant';

export interface ResolverEntry {
  /** The tenant key, as the index partitions it (for example `M00000001`). */
  readonly uoi: string;
  /** The RCP-55 URN the ULI carries (for example `urn:reso:uoi:1.0:T00000012:M00000001`). */
  readonly uoiUrn: string;
  readonly usi?: string;
  /** The resolver's actor URL on its node. */
  readonly actor: string;
  /** Raw Ed25519 public keys, base64url; more than one after a rotation. */
  readonly publicKeys: readonly string[];
  readonly status: ResolverStatus;
  readonly certified: boolean;
}

export interface Parameters {
  readonly weights: WeightSet;
  readonly threshold: number;
  readonly invariants: Invariants;
  readonly feedPosition: number;
}

export interface Governance {
  resolvers: () => readonly ResolverEntry[];
  /** R: the tenant keys of every certified, compliant, active resolver. */
  pool: () => readonly string[];
  entry: (uoi: string) => ResolverEntry | undefined;
  /** Keys by UOI URN, the lookup section 2.8's verifier performs. */
  keysFor: (uoiUrn: string) => readonly string[];
  parameters: () => Parameters;
  feedPosition: () => number;
  /** Feed events: each advances the position. */
  register: (entry: ResolverEntry) => void;
  setStatus: (uoi: string, status: ResolverStatus) => void;
  setWeights: (weights: WeightSet) => void;
}

/** The RESO-issued issuer segment the specification's examples use. */
export const DEFAULT_ISSUER = 'T00000012';

/** A tenant key to its RCP-55 URN; a value already in URN form passes through. */
export const uoiUrn = (uoi: string, issuer = DEFAULT_ISSUER): string =>
  uoi.startsWith('urn:reso:uoi:') ? uoi : `urn:reso:uoi:1.0:${issuer}:${uoi}`;

export interface LocalGovernanceConfig {
  readonly weights?: WeightSet;
  readonly resolvers?: readonly ResolverEntry[];
}

export const localGovernance = (config: LocalGovernanceConfig = {}): Governance => {
  // Feed state, scoped to this closure: a position that only advances, and the
  // entries as of that position.
  const state = {
    position: 0,
    weights: config.weights ?? DEFAULT_WEIGHTS,
    entries: new Map<string, ResolverEntry>((config.resolvers ?? []).map((r) => [r.uoi, r])),
  };
  state.position = state.entries.size;

  const advance = (): void => {
    state.position += 1;
  };

  return {
    resolvers: () => [...state.entries.values()],
    pool: () =>
      [...state.entries.values()]
        .filter((r) => r.certified && r.status === 'active')
        .map((r) => r.uoi)
        .sort(),
    entry: (uoi) => state.entries.get(uoi),
    keysFor: (urn) => [...state.entries.values()].filter((r) => r.uoiUrn === urn).flatMap((r) => r.publicKeys),
    parameters: () => ({
      weights: state.weights,
      threshold: derivedThreshold(state.weights),
      invariants: invariants(state.weights),
      feedPosition: state.position,
    }),
    feedPosition: () => state.position,
    register: (entry) => {
      state.entries.set(entry.uoi, entry);
      advance();
    },
    setStatus: (uoi, status) => {
      const existing = state.entries.get(uoi);
      if (existing === undefined) return;
      state.entries.set(uoi, { ...existing, status });
      advance();
    },
    setWeights: (weights) => {
      state.weights = weights;
      advance();
    },
  };
};

/** What a node keeps privately: its own signing keys, never on the feed. */
export interface Signer {
  privateKeyFor: (uoi: string) => string | undefined;
}

export const memorySigner = (keys: Readonly<Record<string, string>>): Signer => ({
  privateKeyFor: (uoi) => keys[uoi],
});
