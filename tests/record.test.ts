import { describe, expect, it } from 'vitest';
import { canonicalRecord, recordKeyFor, toMemberDoc } from '../src/ingest/record.js';
import { ingestRecords } from '../src/ingest/index.js';
import { memoryMemberStore } from '../src/node/store-memory.js';
import { SEED_A1 } from './fixtures.js';

const tenant = { uoi: 'M00000001', usi: 'S1', ddVersion: '2.1' };
const now = () => '2026-10-12T00:00:00Z';

describe('index documents', () => {
  it('carries the seventeen fields plus bookkeeping, in the seeded shape', () => {
    const doc = toMemberDoc(SEED_A1, tenant, now);
    expect(doc).toEqual({
      recordKey: 'M00000001:A1001',
      uoi: 'M00000001',
      usi: 'S1',
      ddVersion: '2.1',
      ingestedAt: '2026-10-12T00:00:00Z',
      blockKey: 'smith|IN',
      ...SEED_A1,
    });
  });

  it('drops fields outside the ULI set, so the strict mapping accepts the document', () => {
    const { record, dropped } = canonicalRecord({ ...SEED_A1, MemberEmail: 'x@y', MemberKey: 'K1', OfficeAddress1: '1 Main' });
    expect(Object.keys(record)).not.toContain('MemberEmail');
    expect(dropped).toEqual(['MemberEmail', 'MemberKey', 'OfficeAddress1']);
  });

  it('maps the invented 2022 column onto the Data Dictionary field', () => {
    const { record, dropped } = canonicalRecord({ MemberMiddleInitial: 'W', MemberLastName: 'Smith' });
    expect(record.MemberMiddleName).toBe('W');
    expect(record).not.toHaveProperty('MemberMiddleInitial');
    expect(dropped).toEqual([]);
  });

  it('keys on the tenant and the member MLS id, or a digest without one', () => {
    expect(recordKeyFor('M1', { MemberMlsId: 'A1001' })).toBe('M1:A1001');
    const a = recordKeyFor('M1', { MemberFullName: 'Jane Smith' });
    expect(a).toMatch(/^M1:[0-9a-f]{16}$/);
    expect(recordKeyFor('M1', { MemberFullName: 'Jane Smith' })).toBe(a);
    expect(recordKeyFor('M1', { MemberFullName: 'Jane Smyth' })).not.toBe(a);
  });

  it('keeps a ULI the source already carries', () => {
    const doc = toMemberDoc({ ...SEED_A1, UniqueLicenseeIdentifier: 'urn:x' }, tenant, now);
    expect(doc.uli).toBe('urn:x');
    expect(doc).not.toHaveProperty('UniqueLicenseeIdentifier');
  });

  it('treats blanks and nulls as absent', () => {
    const doc = toMemberDoc({ MemberFullName: '  ', MemberLastName: null, MemberFirstName: 'Jane' }, tenant, now);
    expect(doc).not.toHaveProperty('MemberFullName');
    expect(doc).not.toHaveProperty('MemberLastName');
    expect(doc.MemberFirstName).toBe('Jane');
    expect(doc.blockKey).toBeUndefined();
  });
});

describe('ingest', () => {
  it('indexes a roster into the tenant and reports what it dropped', async () => {
    const store = memoryMemberStore();
    const report = await ingestRecords(store, tenant, [{ ...SEED_A1, Extra: 'x' }, { MemberFullName: 'Jane Smith', MemberMlsId: 'Z9' }, { Nothing: 'here' }]);
    expect(report.indexed).toBe(2);
    expect(report.skipped).toBe(1);
    expect(report.droppedFields).toEqual(['Extra', 'Nothing']);
    expect(await store.count('M00000001')).toBe(2);
    expect(await store.tenants()).toEqual(['M00000001']);
  });

  it('is idempotent on re-ingest', async () => {
    const store = memoryMemberStore();
    await ingestRecords(store, tenant, [SEED_A1]);
    await ingestRecords(store, tenant, [{ ...SEED_A1, OfficeName: 'Prairie Realty LLC' }]);
    expect(await store.count()).toBe(1);
    expect((await store.get('M00000001:A1001'))?.OfficeName).toBe('Prairie Realty LLC');
  });
});
