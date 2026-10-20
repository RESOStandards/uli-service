/**
 * RESO Common Format payloads, sections 2.3 and 2.12.
 *
 * The licensee subset behind a broadcast link is a Member record in RCF:
 * `@reso.context` names the Data Dictionary version and resource, and `value`
 * carries the records. A match reply's link resolves to a resolution payload
 * carrying the ULI, the score and the candidate Member record (section 2.12.2);
 * the score rides here and never in the activity (section 2.5).
 *
 * The check here is light and structural: every field is one of section 2.3's
 * seventeen or the identifier, and every value is a string. Full Data
 * Dictionary validation (types, lookups, lengths) is the certification
 * toolkit's job and is not reimplemented.
 */

import { isUliField, type LicenseeRecord, ULI_IDENTIFIER_FIELD, uliSubset } from './fields.js';

export const rcfContext = (ddVersion: string): string => `urn:reso:metadata:${ddVersion}:resource:member`;

export interface RcfPayload {
  readonly '@reso.context': string;
  readonly value: readonly Readonly<Record<string, unknown>>[];
}

export interface ResolutionPayload {
  readonly uli: string;
  readonly score: number;
  readonly licensee: RcfPayload;
}

export const memberPayload = (records: readonly LicenseeRecord[], ddVersion = '2.0'): RcfPayload => ({
  '@reso.context': rcfContext(ddVersion),
  value: records.map(uliSubset),
});

export const resolutionPayload = (uli: string, score: number, candidate: LicenseeRecord, ddVersion = '2.0'): ResolutionPayload => ({
  uli,
  score,
  licensee: memberPayload([{ ...candidate, [ULI_IDENTIFIER_FIELD]: uli }], ddVersion),
});

export interface PayloadCheck {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

const CONTEXT = /^urn:reso:metadata:\d+\.\d+:resource:member$/;

/** Structural check of an RCF Member payload against section 2.3's field set. */
export const checkMemberPayload = (payload: unknown): PayloadCheck => {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, problems: ['payload is not an object'] };
  }
  const p = payload as Readonly<Record<string, unknown>>;
  const context = p['@reso.context'];
  const value = p['value'];
  const problems = [
    ...(typeof context === 'string' && CONTEXT.test(context) ? [] : ['@reso.context must be urn:reso:metadata:<version>:resource:member']),
    ...(Array.isArray(value) ? [] : ['value must be an array of Member records']),
    ...(Array.isArray(value)
      ? value.flatMap((record: unknown, i: number) => {
          if (record === null || typeof record !== 'object' || Array.isArray(record)) return [`value[${i}] is not a record`];
          return Object.entries(record as Record<string, unknown>).flatMap(([k, v]) => [
            ...(isUliField(k) || k === ULI_IDENTIFIER_FIELD ? [] : [`value[${i}].${k} is not a ULI field of section 2.3`]),
            ...(typeof v === 'string' ? [] : [`value[${i}].${k} must be a string`]),
          ]);
        })
      : []),
  ];
  return { ok: problems.length === 0, problems };
};
