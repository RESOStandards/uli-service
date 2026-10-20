/**
 * Blocking: the candidate-retrieval key.
 *
 * Scoring every pair is the bulk join the brief rules out (45 billion naive
 * pairs at 300,000 licensees). A block key narrows retrieval to records that
 * could plausibly be the same person before any scoring runs. Surname plus
 * license state is the obvious key, and the index mapping already carries it as
 * `blockKey`, in the form the seeded records use: lowercase surname, a pipe,
 * the state as published (`smith|IN`).
 *
 * Blocking is a retrieval choice, private to each resolver (section 2.9's
 * three layers). It is in the SDK only so that ingest and search compute the
 * same key; it contributes nothing to a score.
 */

import type { LicenseeRecord } from './fields.js';
import { normalize } from './score.js';

export const BLOCK_SEPARATOR = '|';

export const blockKey = (record: LicenseeRecord): string | undefined => {
  const last = normalize(record['MemberLastName']);
  const stateRaw = record['MemberStateLicenseState'];
  const state = stateRaw === null || stateRaw === undefined ? '' : String(stateRaw).trim().toUpperCase();
  return last === undefined || state === '' ? undefined : `${last}${BLOCK_SEPARATOR}${state}`;
};

/** A record with only a surname still blocks on the surname alone, so it can be found. */
export const surnameKeyPrefix = (record: LicenseeRecord): string | undefined => {
  const last = normalize(record['MemberLastName']);
  return last === undefined ? undefined : `${last}${BLOCK_SEPARATOR}`;
};
