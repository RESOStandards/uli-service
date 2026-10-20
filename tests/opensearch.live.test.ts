import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openSearch } from '../src/node/opensearch.js';
import { ensureIndices, membersMapping, openSearchMemberStore, openSearchStores } from '../src/node/store-opensearch.js';
import { toMemberDoc } from '../src/ingest/record.js';
import { rankCandidates } from '../src/sdk/match.js';
import { SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

/**
 * Against the local OpenSearch, when it is up. Reads the seeded `uli-members`
 * and writes only to a throwaway `uli-members-test` index, deleted afterward.
 * Skipped, not failed, when the cluster is absent: a unit suite must not depend
 * on a container, but the retrieval query is only proven against the real mapping.
 */
const os = openSearch({ url: process.env['OPENSEARCH_URL'] ?? 'http://localhost:9200' });
const up = await os.ping();
const TEST_INDEX = 'uli-members-test';

describe.skipIf(!up)('OpenSearch, live', () => {
  const names = { members: TEST_INDEX, threads: 'uli-threads-test', outcomes: 'uli-outcomes-test', payloads: 'uli-payloads-test', activities: 'uli-activities-test' };

  beforeAll(async () => {
    await Promise.all(Object.values(names).map((n) => os.indexExists(n).then((e) => (e ? os.deleteIndex(n) : undefined))));
    await ensureIndices(os, names);
    await os.bulkIndex(TEST_INDEX, [toMemberDoc(SEED_A1, { uoi: 'M00000001', usi: 'S1' }), toMemberDoc(SEED_B1, { uoi: 'M00000002', usi: 'S2' }), toMemberDoc(SEED_B2, { uoi: 'M00000002', usi: 'S2' })], (d) => d.recordKey);
  });

  afterAll(async () => {
    await Promise.all(Object.values(names).map((n) => os.deleteIndex(n)));
  });

  it('the strict mapping accepts the generated documents', async () => {
    expect(await os.count(TEST_INDEX)).toBe(3);
  });

  it('retrieves the seeded records of the other tenant for A-1, and the scorer accepts one and rejects one', async () => {
    const store = openSearchMemberStore(os, TEST_INDEX);
    const docs = await store.retrieve('M00000002', SEED_A1);
    expect(docs.map((d) => d.recordKey).sort()).toEqual(['M00000002:B2002', 'M00000002:B2003']);
    const ranked = rankCandidates(SEED_A1, docs.map((d) => ({ key: d.recordKey, record: d })));
    expect(ranked[0].key).toBe('M00000002:B2002');
    expect(ranked[0].result.band).toBe('possible match');
    expect(ranked[1].result.band).toBe('rejected');
  });

  it('the normalizer folds case on keyword identifiers at query time', async () => {
    const store = openSearchMemberStore(os, TEST_INDEX);
    const docs = await store.retrieve('M00000002', { MemberStateLicense: 're-884120' });
    expect(docs.map((d) => d.recordKey)).toEqual(['M00000002:B2002']);
  });

  it('lists tenants and counts bound ULIs', async () => {
    const store = openSearchMemberStore(os, TEST_INDEX);
    expect(await store.tenants()).toEqual(['M00000001', 'M00000002']);
    expect(await store.countBound()).toBe(0);
    await store.bindUli('M00000001:A1001', 'urn:test');
    expect(await store.countBound('M00000001')).toBe(1);
    expect((await store.get('M00000001:A1001'))?.uli).toBe('urn:test');
  });

  it('the thread, outcome and payload stores round trip', async () => {
    const stores = openSearchStores(os, names);
    await stores.outcomes.record({ id: 'o1', kind: 'mint', at: '2026-10-12T00:00:00Z', originator: 'M00000001', threshold: 1250 });
    expect((await stores.outcomes.list('M00000001')).map((o) => o.id)).toEqual(['o1']);
    await stores.payloads.put('p1', { hello: 'world' });
    expect(await stores.payloads.get('p1')).toEqual({ hello: 'world' });
    expect(await stores.payloads.get('missing')).toBeUndefined();
  });

  it('the seeded production index holds the three pilot records untouched', async () => {
    expect(await os.count('uli-members')).toBe(3);
    expect(membersMapping()).toHaveProperty('mappings.dynamic', 'strict');
  });
});
