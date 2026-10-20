/**
 * The store interfaces the node operates over.
 *
 * One interface, two implementations each: in memory for the tests and the
 * playground, OpenSearch for the local and production adapters. The hub drives
 * the same operations through either, so the tests cannot drift from what a
 * server runs.
 *
 * Members are partitioned by `uoi`: section 2.1 makes a provider search its
 * own data and nothing else, and one host running many participants' nodes
 * turns that isolation into a tenant property. Every member read takes the
 * tenant; there is deliberately no read across tenants.
 */

import type { LicenseeRecord } from '../sdk/fields.js';
import type { Activity } from '../sdk/activities.js';
import type { Reply } from '../sdk/consensus.js';

/** A record as indexed: the ULI fields plus the node's bookkeeping. Matches the strict mapping. A type alias, not an interface, so it carries the implicit index signature the SDK's record type needs. */
export type MemberDoc = {
  readonly recordKey: string;
  readonly uoi: string;
  readonly usi?: string;
  readonly ddVersion: string;
  readonly uli?: string;
  readonly ingestedAt: string;
  readonly blockKey?: string;
  readonly MemberFullName?: string;
  readonly MemberFirstName?: string;
  readonly MemberMiddleName?: string;
  readonly MemberLastName?: string;
  readonly MemberNickname?: string;
  readonly MemberType?: string;
  readonly MemberNationalAssociationId?: string;
  readonly MemberStateLicense?: string;
  readonly MemberStateLicenseState?: string;
  readonly MemberStateLicenseType?: string;
  readonly MemberMlsId?: string;
  readonly OfficeMlsId?: string;
  readonly OfficeName?: string;
  readonly SourceSystemID?: string;
  readonly SourceSystemName?: string;
  readonly OriginatingSystemID?: string;
  readonly OriginatingSystemName?: string;
};

export interface MemberStore {
  /** Retrieve candidates for a query within one tenant. Retrieval, not scoring: the hub scores. */
  retrieve: (uoi: string, query: LicenseeRecord, options?: { readonly excludeKey?: string; readonly size?: number }) => Promise<readonly MemberDoc[]>;
  get: (recordKey: string) => Promise<MemberDoc | undefined>;
  put: (docs: readonly MemberDoc[]) => Promise<number>;
  bindUli: (recordKey: string, uli: string) => Promise<void>;
  /** Follow a redirect: every record bound to the retired ULI relinks to its successor (section 2.7). */
  relink: (fromUli: string, toUli: string) => Promise<number>;
  list: (uoi: string, size?: number) => Promise<readonly MemberDoc[]>;
  tenants: () => Promise<readonly string[]>;
  count: (uoi?: string) => Promise<number>;
  countBound: (uoi?: string) => Promise<number>;
}

export type ThreadStatus = 'open' | 'consensus' | 'minted' | 'adopted';

/** A resolution thread as the originator tracks it: pinned pool, replies, activities, outcome. */
export interface ThreadRecord {
  readonly id: string;
  readonly rootId: string;
  readonly originator: string;
  readonly recordKey?: string;
  readonly criteria: LicenseeRecord;
  /** R, pinned at broadcast (section 2.6), and the governance feed position it was read at. */
  readonly pool: readonly string[];
  readonly feedPosition: number;
  readonly mandatory: readonly string[];
  readonly excludeUlis: readonly string[];
  readonly threshold: number;
  readonly replies: readonly Reply[];
  readonly activities: readonly Activity[];
  readonly status: ThreadStatus;
  readonly uli?: string;
  /** The identifier of the Note that created the minted ULI, which a tombstone references. */
  readonly createdNoteId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Number of broadcasts in the thread: one, plus one per decline rebroadcast. */
  readonly round: number;
}

export interface ThreadStore {
  put: (thread: ThreadRecord) => Promise<void>;
  get: (id: string) => Promise<ThreadRecord | undefined>;
  list: (originator?: string) => Promise<readonly ThreadRecord[]>;
}

export type OutcomeKind = 'mint' | 'adopt' | 'decline' | 'local-same' | 'local-different' | 'tombstone';

/**
 * Every resolution outcome, kept: a mint says the network found no match, an
 * adopt says two records are one licensee, a decline says a scored candidate was
 * wrong. These are the labeled pairs weight calibration needs (section 6), and
 * they are only generated while the pilot runs.
 */
export interface OutcomeRecord {
  readonly id: string;
  readonly kind: OutcomeKind;
  readonly at: string;
  readonly originator: string;
  readonly threadId?: string;
  readonly recordKey?: string;
  readonly candidateKey?: string;
  readonly uli?: string;
  readonly score?: number;
  readonly threshold: number;
  readonly note?: string;
}

export interface OutcomeStore {
  record: (outcome: OutcomeRecord) => Promise<void>;
  list: (originator?: string) => Promise<readonly OutcomeRecord[]>;
}

/** A resolution payload a reply links to, served only to an authorized reader (section 2.11). */
export interface PayloadStore {
  put: (key: string, payload: unknown) => Promise<void>;
  get: (key: string) => Promise<unknown>;
}

export type ActivityBox = 'inbox' | 'outbox';

/**
 * Activities a tenant sent or received over the network, kept per tenant. The
 * hub's own activities live in the thread records it writes; this holds the
 * ones that have no thread record on this node: a reply sent into another
 * node's thread, and anything that arrived at the inbox.
 */
export interface ActivityStore {
  put: (uoi: string, box: ActivityBox, activity: Activity) => Promise<void>;
  /** Newest first. */
  list: (uoi: string, box: ActivityBox) => Promise<readonly Activity[]>;
}

export interface Stores {
  readonly members: MemberStore;
  readonly threads: ThreadStore;
  readonly outcomes: OutcomeStore;
  readonly payloads: PayloadStore;
  readonly activities: ActivityStore;
}
