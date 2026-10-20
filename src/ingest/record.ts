/**
 * From a licensee record to an index document.
 *
 * The mapping is strict, so only the seventeen ULI fields and the node's own
 * bookkeeping may be present. Everything else a source carries (an address, a
 * phone, a key) is dropped here, which is also the data-minimization section 2.3
 * asks for: the node holds the PII-safe subset and nothing more.
 *
 * The record key is deterministic, so re-ingesting a roster updates in place
 * rather than duplicating: the tenant plus the source's own member identifier,
 * or a digest of the subset when there is none.
 */

import { createHash } from 'node:crypto';
import { blockKey } from '../sdk/blocking.js';
import { type LicenseeRecord, ULI_FIELDS, ULI_IDENTIFIER_FIELD } from '../sdk/fields.js';
import type { MemberDoc } from '../node/store.js';

export interface Tenant {
  readonly uoi: string;
  readonly usi?: string;
  readonly ddVersion?: string;
}

/** Field names a source may use that are not Data Dictionary names, mapped to the DD name. */
export const FIELD_ALIASES: Readonly<Record<string, string>> = {
  // Not a Data Dictionary field; the 2022 pilot template carried it. An initial
  // is a weaker value than a middle name, and it lands in the middle-name field
  // only so that the column is not silently dropped.
  MemberMiddleInitial: 'MemberMiddleName',
};

const asString = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
};

/** Normalize a source record's keys to DD names and keep only the ULI fields; report what was dropped. */
export const canonicalRecord = (source: LicenseeRecord): { readonly record: Readonly<Record<string, string>>; readonly dropped: readonly string[] } => {
  const renamed = Object.entries(source).map(([k, v]) => [FIELD_ALIASES[k] ?? k, v] as const);
  const kept = renamed.filter(([k]) => (ULI_FIELDS as readonly string[]).includes(k) || k === ULI_IDENTIFIER_FIELD);
  const record = Object.fromEntries(kept.flatMap(([k, v]) => (asString(v) === undefined ? [] : [[k, asString(v) as string]])));
  const dropped = renamed.filter(([k]) => !(ULI_FIELDS as readonly string[]).includes(k) && k !== ULI_IDENTIFIER_FIELD).map(([k]) => k);
  return { record, dropped: [...new Set(dropped)] };
};

export const recordKeyFor = (uoi: string, record: Readonly<Record<string, string>>): string => {
  const mlsId = record['MemberMlsId'];
  if (mlsId !== undefined) return `${uoi}:${mlsId}`;
  const digest = createHash('sha256')
    .update(JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : 1)))))
    .digest('hex')
    .slice(0, 16);
  return `${uoi}:${digest}`;
};

export const toMemberDoc = (source: LicenseeRecord, tenant: Tenant, now: () => string = () => new Date().toISOString()): MemberDoc => {
  const { record } = canonicalRecord(source);
  const { [ULI_IDENTIFIER_FIELD]: uli, ...fields } = record;
  const key = blockKey(fields);
  return {
    recordKey: recordKeyFor(tenant.uoi, fields),
    uoi: tenant.uoi,
    ...(tenant.usi === undefined ? {} : { usi: tenant.usi }),
    ddVersion: tenant.ddVersion ?? '2.1',
    ...(uli === undefined ? {} : { uli }),
    ingestedAt: now(),
    ...(key === undefined ? {} : { blockKey: key }),
    ...fields,
  };
};
