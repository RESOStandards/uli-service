import type { MemberStore } from '../node/store.js';
import type { LicenseeRecord } from '../sdk/fields.js';
import { canonicalRecord, type Tenant, toMemberDoc } from './record.js';

export interface IngestReport {
  readonly indexed: number;
  readonly skipped: number;
  /** Source columns that are not ULI fields and were not carried. */
  readonly droppedFields: readonly string[];
}

/** Index a batch of source records for one tenant. Records with no ULI field at all are skipped. */
export const ingestRecords = async (store: MemberStore, tenant: Tenant, sources: readonly LicenseeRecord[]): Promise<IngestReport> => {
  const docs = sources.map((s) => ({ doc: toMemberDoc(s, tenant), dropped: canonicalRecord(s).dropped }));
  const kept = docs.filter(({ doc }) => Object.keys(doc).some((k) => k.startsWith('Member') || k.startsWith('Office') || k.endsWith('SystemID') || k.endsWith('SystemName')));
  const indexed = await store.put(kept.map(({ doc }) => doc));
  return {
    indexed,
    skipped: docs.length - kept.length,
    droppedFields: [...new Set(docs.flatMap(({ dropped }) => dropped))].sort(),
  };
};
