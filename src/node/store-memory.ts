/**
 * In-memory stores, for the tests and the playground. Retrieval here is the
 * same block-or-identifier rule as the OpenSearch query, evaluated in process,
 * so a hub test exercises the same candidate set a server would see.
 */

import { blockKey } from '../sdk/blocking.js';
import type { LicenseeRecord } from '../sdk/fields.js';
import { normalize } from '../sdk/score.js';
import type { Activity } from '../sdk/activities.js';
import type { ActivityBox, ActivityStore, MemberDoc, MemberStore, OutcomeRecord, OutcomeStore, PayloadStore, Stores, ThreadRecord, ThreadStore } from './store.js';

const tokens = (v: unknown): readonly string[] => (normalize(v) ?? '').split(/\s+/).filter((t) => t !== '');
const shareToken = (a: unknown, b: unknown): boolean => tokens(a).some((t) => tokens(b).includes(t));

/** Would the OpenSearch retrieval query return this document for this query? */
export const retrievable = (query: LicenseeRecord, doc: MemberDoc): boolean => {
  const nrds = normalize(query['MemberNationalAssociationId']);
  const license = normalize(query['MemberStateLicense']);
  const block = blockKey(query);
  const full = normalize(query['MemberFullName']);
  const first = normalize(query['MemberFirstName']);
  const last = normalize(query['MemberLastName']);
  return (
    (nrds !== undefined && nrds === normalize(doc.MemberNationalAssociationId)) ||
    (license !== undefined && license === normalize(doc.MemberStateLicense)) ||
    (block !== undefined && block === doc.blockKey) ||
    (full !== undefined && shareToken(full, doc.MemberFullName)) ||
    (first !== undefined && last !== undefined && first === normalize(doc.MemberFirstName) && last === normalize(doc.MemberLastName))
  );
};

export const memoryMemberStore = (seed: readonly MemberDoc[] = []): MemberStore => {
  const docs = new Map<string, MemberDoc>(seed.map((d) => [d.recordKey, d]));
  const all = (uoi?: string): readonly MemberDoc[] => [...docs.values()].filter((d) => uoi === undefined || d.uoi === uoi);
  return {
    retrieve: async (uoi, query, options = {}) =>
      all(uoi)
        .filter((d) => d.recordKey !== options.excludeKey)
        .filter((d) => retrievable(query, d))
        .slice(0, options.size ?? 50),
    get: async (recordKey) => docs.get(recordKey),
    put: async (incoming) => {
      incoming.forEach((d) => docs.set(d.recordKey, d));
      return incoming.length;
    },
    bindUli: async (recordKey, uli) => {
      const existing = docs.get(recordKey);
      if (existing !== undefined) docs.set(recordKey, { ...existing, uli });
    },
    relink: async (fromUli, toUli) => {
      const bound = all().filter((d) => d.uli === fromUli);
      bound.forEach((d) => docs.set(d.recordKey, { ...d, uli: toUli }));
      return bound.length;
    },
    list: async (uoi, size = 500) => [...all(uoi)].sort((a, b) => (a.recordKey < b.recordKey ? -1 : 1)).slice(0, size),
    tenants: async () => [...new Set(all().map((d) => d.uoi))].sort(),
    count: async (uoi) => all(uoi).length,
    countBound: async (uoi) => all(uoi).filter((d) => d.uli !== undefined).length,
  };
};

export const memoryThreadStore = (): ThreadStore => {
  const threads = new Map<string, ThreadRecord>();
  return {
    put: async (t) => {
      threads.set(t.id, t);
    },
    get: async (id) => threads.get(id),
    list: async (originator) =>
      [...threads.values()].filter((t) => originator === undefined || t.originator === originator).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
};

export const memoryOutcomeStore = (): OutcomeStore => {
  const outcomes: OutcomeRecord[] = [];
  return {
    record: async (o) => {
      outcomes.push(o);
    },
    list: async (originator) => outcomes.filter((o) => originator === undefined || o.originator === originator).slice().reverse(),
  };
};

export const memoryPayloadStore = (): PayloadStore => {
  const payloads = new Map<string, unknown>();
  return {
    put: async (key, payload) => {
      payloads.set(key, payload);
    },
    get: async (key) => payloads.get(key),
  };
};

export const memoryActivityStore = (): ActivityStore => {
  const kept: { readonly uoi: string; readonly box: ActivityBox; readonly activity: Activity }[] = [];
  return {
    put: async (uoi, box, activity) => {
      kept.push({ uoi, box, activity });
    },
    list: async (uoi, box) =>
      kept
        .filter((k) => k.uoi === uoi && k.box === box)
        .map((k) => k.activity)
        .reverse(),
  };
};

export const memoryStores = (seed: readonly MemberDoc[] = []): Stores => ({
  members: memoryMemberStore(seed),
  threads: memoryThreadStore(),
  outcomes: memoryOutcomeStore(),
  payloads: memoryPayloadStore(),
  activities: memoryActivityStore(),
});
