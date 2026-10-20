/**
 * Candidate retrieval: the query a resolver runs over its own index.
 *
 * This is the search layer of section 2.9's three layers, private to each
 * resolver and measured for recall and precision, never for parity. Nothing it
 * returns is a score: OpenSearch relevance is corpus-relative and is discarded;
 * every candidate it retrieves is scored by the SDK afterward.
 *
 * The shape: an exact hit on a strong identifier, or the block, or a fuzzy
 * name, any one of which retrieves the candidate. Blocking on surname plus
 * state keeps name-based retrieval narrow; the identifier terms keep recall
 * when a name has changed.
 */

import { blockKey } from '../sdk/blocking.js';
import type { LicenseeRecord } from '../sdk/fields.js';
import { normalize } from '../sdk/score.js';

export interface RetrievalOptions {
  readonly uoi?: string;
  readonly excludeKey?: string;
  readonly size?: number;
}

type Clause = Readonly<Record<string, unknown>>;

const term = (field: string, value: string): Clause => ({ term: { [field]: value } });
const fuzzy = (field: string, value: string): Clause => ({ match: { [field]: { query: value, fuzziness: 'AUTO', operator: 'and' } } });

export const retrievalClauses = (query: LicenseeRecord): readonly Clause[] => {
  const nrds = normalize(query['MemberNationalAssociationId']);
  const license = normalize(query['MemberStateLicense']);
  const block = blockKey(query);
  const full = normalize(query['MemberFullName']);
  const first = normalize(query['MemberFirstName']);
  const last = normalize(query['MemberLastName']);
  const nick = normalize(query['MemberNickname']);
  return [
    ...(nrds === undefined ? [] : [term('MemberNationalAssociationId', nrds)]),
    ...(license === undefined ? [] : [term('MemberStateLicense', license)]),
    ...(block === undefined ? [] : [term('blockKey', block)]),
    ...(full === undefined ? [] : [fuzzy('MemberFullName', full)]),
    ...(first !== undefined && last !== undefined ? [{ bool: { must: [fuzzy('MemberFirstName', first), fuzzy('MemberLastName', last)] } }] : []),
    ...(nick !== undefined && last !== undefined ? [{ bool: { must: [fuzzy('MemberNickname', nick), fuzzy('MemberLastName', last)] } }] : []),
  ];
};

/** The OpenSearch request body, or undefined when the query carries nothing retrievable. */
export const retrievalBody = (query: LicenseeRecord, options: RetrievalOptions = {}): Readonly<Record<string, unknown>> | undefined => {
  const should = retrievalClauses(query);
  if (should.length === 0) return undefined;
  return {
    size: options.size ?? 50,
    query: {
      bool: {
        filter: options.uoi === undefined ? [] : [term('uoi', options.uoi)],
        must_not: options.excludeKey === undefined ? [] : [term('recordKey', options.excludeKey)],
        should,
        minimum_should_match: 1,
      },
    },
  };
};
