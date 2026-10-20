/**
 * The OpenSearch-backed stores. Members live in `uli-members` under the proven
 * mapping; threads, outcomes and payloads get their own small indices so that a
 * stateless adapter (Lambda) has somewhere to keep them.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LicenseeRecord } from '../sdk/fields.js';
import type { OpenSearch } from './opensearch.js';
import { retrievalBody } from './retrieval.js';
import type { Activity } from '../sdk/activities.js';
import type { ActivityStore, MemberDoc, MemberStore, OutcomeRecord, OutcomeStore, PayloadStore, Stores, ThreadRecord, ThreadStore } from './store.js';

export const INDICES = {
  members: 'uli-members',
  threads: 'uli-threads',
  outcomes: 'uli-outcomes',
  payloads: 'uli-payloads',
  activities: 'uli-activities',
} as const;

export interface IndexNames {
  readonly members: string;
  readonly threads: string;
  readonly outcomes: string;
  readonly payloads: string;
  readonly activities: string;
}

/** The members mapping, proven against a live cluster, carried with the package. */
export const membersMapping = (): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL('../../index/uli-members.mapping.json', import.meta.url)), 'utf8'));

/** Threads and outcomes are stored whole; only the fields queried are mapped, the rest is an opaque document. */
const threadsMapping = {
  settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },
  mappings: {
    dynamic: false,
    properties: { id: { type: 'keyword' }, originator: { type: 'keyword' }, status: { type: 'keyword' }, createdAt: { type: 'date' }, updatedAt: { type: 'date' } },
  },
};
const outcomesMapping = {
  settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },
  mappings: {
    dynamic: false,
    properties: { id: { type: 'keyword' }, kind: { type: 'keyword' }, originator: { type: 'keyword' }, threadId: { type: 'keyword' }, at: { type: 'date' }, score: { type: 'integer' } },
  },
};
const payloadsMapping = {
  settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },
  mappings: { dynamic: false, properties: { key: { type: 'keyword' } } },
};
/** Activities are stored whole; `seq` orders them, since a Tombstone carries `deleted` where a Note carries `published`. */
const activitiesMapping = {
  settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },
  mappings: { dynamic: false, properties: { uoi: { type: 'keyword' }, box: { type: 'keyword' }, id: { type: 'keyword' }, seq: { type: 'long' } } },
};

export const ensureIndices = async (os: OpenSearch, names: IndexNames = INDICES): Promise<void> => {
  await os.ensureIndex(names.members, membersMapping());
  await os.ensureIndex(names.threads, threadsMapping);
  await os.ensureIndex(names.outcomes, outcomesMapping);
  await os.ensureIndex(names.payloads, payloadsMapping);
  await os.ensureIndex(names.activities, activitiesMapping);
};

export const openSearchMemberStore = (os: OpenSearch, index: string = INDICES.members): MemberStore => ({
  retrieve: async (uoi, query: LicenseeRecord, options = {}) => {
    const body = retrievalBody(query, { uoi, excludeKey: options.excludeKey, size: options.size });
    if (body === undefined) return [];
    return (await os.search<MemberDoc>(index, body)).map((h) => h._source);
  },
  get: (recordKey) => os.get<MemberDoc>(index, recordKey),
  put: (docs) => os.bulkIndex(index, docs, (d) => d.recordKey),
  bindUli: (recordKey, uli) => os.update(index, recordKey, { uli }),
  list: async (uoi, size = 500) =>
    (await os.search<MemberDoc>(index, { size, query: { term: { uoi } }, sort: [{ recordKey: 'asc' }] })).map((h) => h._source),
  tenants: async () => {
    const raw = await os.searchRaw(index, { size: 0, aggs: { tenants: { terms: { field: 'uoi', size: 1000 } } } });
    const buckets =
      raw !== null && typeof raw === 'object' && 'aggregations' in raw
        ? ((raw as { aggregations?: { tenants?: { buckets?: readonly { key: string }[] } } }).aggregations?.tenants?.buckets ?? [])
        : [];
    return buckets.map((b) => b.key).sort();
  },
  relink: (fromUli, toUli) => os.updateByQuery(index, { term: { uli: fromUli } }, 'ctx._source.uli = params.to', { to: toUli }),
  count: (uoi) => os.count(index, uoi === undefined ? undefined : { term: { uoi } }),
  countBound: (uoi) =>
    os.count(index, { bool: { must: [{ exists: { field: 'uli' } }, ...(uoi === undefined ? [] : [{ term: { uoi } }])] } }),
});

export const openSearchThreadStore = (os: OpenSearch, index: string = INDICES.threads): ThreadStore => ({
  put: (thread) => os.index(index, thread.id, thread),
  get: (id) => os.get<ThreadRecord>(index, id),
  list: async (originator) =>
    (
      await os.search<ThreadRecord>(index, {
        size: 200,
        query: originator === undefined ? { match_all: {} } : { term: { originator } },
        sort: [{ createdAt: 'desc' }],
      })
    ).map((h) => h._source),
});

export const openSearchOutcomeStore = (os: OpenSearch, index: string = INDICES.outcomes): OutcomeStore => ({
  record: (outcome: OutcomeRecord) => os.index(index, outcome.id, outcome),
  list: async (originator) =>
    (
      await os.search<OutcomeRecord>(index, {
        size: 1000,
        query: originator === undefined ? { match_all: {} } : { term: { originator } },
        sort: [{ at: 'desc' }],
      })
    ).map((h) => h._source),
});

export const openSearchPayloadStore = (os: OpenSearch, index: string = INDICES.payloads): PayloadStore => ({
  put: (key, payload) => os.index(index, key, { key, payload }),
  get: async (key) => (await os.get<{ payload: unknown }>(index, key))?.payload,
});

export const openSearchActivityStore = (os: OpenSearch, index: string = INDICES.activities): ActivityStore => {
  // A monotonic sequence within this process, so two activities stored in the same millisecond keep their order.
  const counter = { n: 0 };
  return {
    put: async (uoi, box, activity) => {
      counter.n += 1;
      const seq = Date.now() * 1000 + (counter.n % 1000);
      const id = typeof activity['id'] === 'string' ? activity['id'] : `seq-${seq}`;
      await os.index(index, `${uoi}:${box}:${id}`, { uoi, box, id, seq, activity });
    },
    list: async (uoi, box) =>
      (
        await os.search<{ activity: Activity }>(index, {
          size: 1000,
          query: { bool: { filter: [{ term: { uoi } }, { term: { box } }] } },
          sort: [{ seq: 'desc' }],
        })
      ).map((h) => h._source.activity),
  };
};

export const openSearchStores = (os: OpenSearch, names: IndexNames = INDICES): Stores => ({
  members: openSearchMemberStore(os, names.members),
  threads: openSearchThreadStore(os, names.threads),
  outcomes: openSearchOutcomeStore(os, names.outcomes),
  payloads: openSearchPayloadStore(os, names.payloads),
  activities: openSearchActivityStore(os, names.activities),
});
