import { describe, expect, it } from 'vitest';
import { retrievalBody, retrievalClauses } from '../src/node/retrieval.js';
import { memoryMemberStore } from '../src/node/store-memory.js';
import { toMemberDoc } from '../src/ingest/record.js';
import { SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

describe('retrieval query', () => {
  it('retrieves on an exact identifier, the block, or a fuzzy name, any one of which suffices', () => {
    const body = retrievalBody(SEED_A1, { uoi: 'M00000002', excludeKey: 'M00000001:A1001' });
    expect(body).toBeDefined();
    const bool = (body as { query: { bool: Record<string, unknown> } }).query.bool;
    expect(bool.minimum_should_match).toBe(1);
    expect(bool.filter).toEqual([{ term: { uoi: 'M00000002' } }]);
    expect(bool.must_not).toEqual([{ term: { recordKey: 'M00000001:A1001' } }]);
    const should = bool.should as readonly Record<string, unknown>[];
    expect(should).toContainEqual({ term: { MemberNationalAssociationId: '012345687' } });
    expect(should).toContainEqual({ term: { MemberStateLicense: 're-884120' } });
    expect(should).toContainEqual({ term: { blockKey: 'smith|IN' } });
  });

  it('builds nothing from a record with nothing retrievable', () => {
    expect(retrievalBody({ MemberType: 'Agent' })).toBeUndefined();
    expect(retrievalClauses({})).toEqual([]);
  });

  it('carries no score and no weight: relevance never crosses into scoring', () => {
    expect(JSON.stringify(retrievalBody(SEED_A1))).not.toMatch(/weight|boost|function_score/);
  });
});

describe('the in-memory retrieval mirrors the query', () => {
  const t = { uoi: 'M00000002' };
  const store = memoryMemberStore([toMemberDoc(SEED_A1, { uoi: 'M00000001' }), toMemberDoc(SEED_B1, t), toMemberDoc(SEED_B2, t)]);

  it('scopes to the tenant and excludes a key', async () => {
    const own = await store.retrieve('M00000001', SEED_A1, { excludeKey: 'M00000001:A1001' });
    expect(own).toEqual([]);
    const other = await store.retrieve('M00000002', SEED_A1);
    expect(other.map((d) => d.recordKey).sort()).toEqual(['M00000002:B2002', 'M00000002:B2003']);
  });

  it('finds a renamed person by identifier even when the block differs', async () => {
    const moved = { MemberNationalAssociationId: '012345687', MemberLastName: 'Jones', MemberStateLicenseState: 'OH' };
    expect((await store.retrieve('M00000002', moved)).map((d) => d.recordKey)).toEqual(['M00000002:B2002']);
  });
});
