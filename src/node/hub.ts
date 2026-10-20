/**
 * The ULI hub: the operations a node performs, with the specification's rules
 * enforced in one place. The adapters are transports over this; the SDK is the
 * arithmetic under it.
 *
 * Every operation returns an Outcome rather than throwing, because a refusal is
 * a normal result here and its reason is the useful part: a certification
 * runner reads the code, a UI shows the reason.
 *
 * The rules that live here are the ones about sequence: a broadcast needs the
 * identifiability gate (2.4); a reply may not carry a match below threshold
 * (2.5); a mint waits for a no-match consensus and is never unilateral (2.4,
 * 2.7); an adopt posts nothing (2.7); a decline is a rebroadcast in the same
 * thread (2.7); a tombstone is a holder's act over a verifiable better match
 * (2.7). Delivery is not here: the adapter fans a broadcast out, immediately in
 * process locally or through a queue in production.
 */

import {
  type Activity, broadcastNote, matchReply, noMatchReply, tombstone, uliCreated,
} from '../sdk/activities.js';
import { type Reply, tally as tallyReplies, type Tally } from '../sdk/consensus.js';
import { type LicenseeRecord, ULI_FIELDS, uliSubset } from '../sdk/fields.js';
import { identifiability, type Identifiability } from '../sdk/identifiability.js';
import { type Ranked, rankCandidates } from '../sdk/match.js';
import { memberPayload, resolutionPayload } from '../sdk/rcf.js';
import { fieldAgreements, score, type ScoreResult } from '../sdk/score.js';
import { mintUli, parseUli, type Verification, verifyUli } from '../sdk/uli.js';
import type { WeightSet } from '../sdk/weights.js';
import type { Governance, Signer } from './governance.js';
import type { MemberDoc, OutcomeKind, OutcomeRecord, Stores, ThreadRecord } from './store.js';

export type Refusal =
  | 'invalid'
  | 'not-identifiable'
  | 'record-not-found'
  | 'thread-not-found'
  | 'conflict-not-found'
  | 'not-in-pool'
  | 'below-threshold'
  | 'no-uli-to-offer'
  | 'consensus-not-reached'
  | 'wrong-outcome'
  | 'thread-closed'
  | 'no-signing-key'
  | 'not-a-holder'
  | 'merge-required';

export type Outcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: Refusal; readonly reason: string };

const no = <T>(code: Refusal, reason: string): Outcome<T> => ({ ok: false, code, reason });
const yes = <T>(value: T): Outcome<T> => ({ ok: true, value });

export interface HubConfig {
  readonly stores: Stores;
  readonly governance: Governance;
  readonly signer: Signer;
  /** Base URL that identifiers and payload links are minted under. */
  readonly origin: string;
  /** Path prefix of the protected payload routes, under the origin. */
  readonly payloadPath?: string;
  readonly now?: () => string;
  readonly ids?: () => string;
}

export interface Hit {
  readonly _id: string;
  readonly _source: Readonly<Record<string, unknown>>;
  readonly uli?: string;
  readonly uoi: string;
  readonly result: ScoreResult;
  readonly fieldAgreements: Readonly<Record<string, boolean>>;
}

export interface SearchResult {
  readonly query: Readonly<Record<string, unknown>>;
  readonly threshold: number;
  readonly identifiability: Identifiability;
  readonly hits: readonly Hit[];
}

export interface ActionItem {
  readonly id: string;
  readonly type: 'resolve' | 'review';
  readonly description: string;
  readonly score: number;
  readonly band: string;
  readonly timestamp: string;
}

export interface Dashboard {
  readonly uoi: string;
  readonly newMatchesCount: number;
  readonly reports: { readonly records: number; readonly ulisBound: number; readonly threadsOpen: number; readonly outcomes: number };
  readonly actionItems: readonly ActionItem[];
  readonly threshold: number;
}

export interface Conflict {
  readonly id: string;
  readonly existing: Hit;
  readonly incoming: Hit;
  readonly result: ScoreResult;
  readonly reason: string;
}

export interface BroadcastInput {
  readonly originator: string;
  readonly record?: LicenseeRecord;
  readonly recordKey?: string;
  readonly mandatory?: readonly string[];
  readonly excludeUlis?: readonly string[];
}

export interface TallyResult {
  readonly thread: ThreadRecord;
  readonly tally: Tally;
}

export interface Hub {
  parameters: () => { readonly weights: WeightSet; readonly threshold: number };
  search: (uoi: string, query: LicenseeRecord, options?: { readonly excludeKey?: string }) => Promise<SearchResult>;
  scorePair: (a: LicenseeRecord, b: LicenseeRecord) => ScoreResult;
  dashboard: (uoi: string) => Promise<Dashboard>;
  conflict: (uoi: string, id: string) => Promise<Outcome<Conflict>>;
  resolveConflict: (uoi: string, id: string, resolution: 'same' | 'different') => Promise<Outcome<{ readonly outcome: OutcomeRecord; readonly thread?: ThreadRecord }>>;
  broadcast: (input: BroadcastInput) => Promise<Outcome<ThreadRecord>>;
  /** A resolver searches its own data for the thread's criteria and replies (section 2.5). */
  resolverReply: (threadId: string, resolver: string) => Promise<Outcome<{ readonly reply: Reply; readonly thread: ThreadRecord }>>;
  /** A resolver replies with a named candidate, or no match when none is named. */
  reply: (threadId: string, resolver: string, candidateKey?: string) => Promise<Outcome<{ readonly reply: Reply; readonly thread: ThreadRecord }>>;
  tally: (threadId: string) => Promise<Outcome<TallyResult>>;
  mint: (threadId: string) => Promise<Outcome<{ readonly uli: string; readonly thread: ThreadRecord }>>;
  adopt: (threadId: string, uli?: string) => Promise<Outcome<{ readonly uli: string; readonly thread: ThreadRecord }>>;
  decline: (threadId: string, corrected: LicenseeRecord) => Promise<Outcome<ThreadRecord>>;
  supersede: (input: { readonly holder: string; readonly retiredUli: string; readonly successorUli: string; readonly successorScore: number }) => Promise<Outcome<{ readonly relinked: number; readonly activity: Activity }>>;
  verify: (uli: string) => Verification;
  threads: (originator?: string) => Promise<readonly ThreadRecord[]>;
  thread: (id: string) => Promise<ThreadRecord | undefined>;
  outcomes: (originator?: string) => Promise<readonly OutcomeRecord[]>;
  payload: (key: string) => Promise<unknown>;
}

const PAIR_SEPARATOR = '~';
export const pairId = (a: string, b: string): string => [a, b].sort().join(PAIR_SEPARATOR);

const recordOf = (doc: MemberDoc): Readonly<Record<string, unknown>> => uliSubset(doc);

const describe = (r: LicenseeRecord): string =>
  String(r['MemberFullName'] ?? [r['MemberFirstName'], r['MemberLastName']].filter((x) => x !== undefined).join(' ') ?? 'a licensee');

export const createHub = (config: HubConfig): Hub => {
  const { stores, governance, signer, origin } = config;
  const now = config.now ?? (() => new Date().toISOString());
  const ids = config.ids ?? (() => crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  const payloadPath = config.payloadPath ?? '/uli-service/v1/rcf';

  const weights = (): WeightSet => governance.parameters().weights;
  const threshold = (): number => governance.parameters().threshold;
  const actorOf = (uoi: string): string => governance.entry(uoi)?.actor ?? `${origin}/actors/${uoi}`;
  const href = (...parts: readonly string[]): string => `${origin}${payloadPath}/${parts.map(encodeURIComponent).join('/')}`;

  const hit = (doc: MemberDoc, query: LicenseeRecord, result: ScoreResult): Hit => ({
    _id: doc.recordKey,
    _source: { ...recordOf(doc), ...(doc.uli === undefined ? {} : { UniqueLicenseeIdentifier: doc.uli }) },
    ...(doc.uli === undefined ? {} : { uli: doc.uli }),
    uoi: doc.uoi,
    result,
    fieldAgreements: fieldAgreements(query, doc),
  });

  const rankInTenant = async (uoi: string, query: LicenseeRecord, options: { readonly excludeKey?: string; readonly excludeUlis?: readonly string[] } = {}): Promise<readonly (Ranked & { readonly doc: MemberDoc })[]> => {
    const docs = await stores.members.retrieve(uoi, query, { excludeKey: options.excludeKey });
    const ranked = rankCandidates(
      query,
      docs.map((d) => ({ key: d.recordKey, record: recordOf(d), ...(d.uli === undefined ? {} : { uli: d.uli }) })),
      weights(),
      { excludeKey: options.excludeKey, excludeUlis: options.excludeUlis }
    );
    const byKey = new Map(docs.map((d) => [d.recordKey, d]));
    return ranked.map((r) => ({ ...r, doc: byKey.get(r.key) as MemberDoc }));
  };

  const record = async (kind: OutcomeKind, originator: string, rest: Partial<OutcomeRecord> = {}): Promise<OutcomeRecord> => {
    const outcome: OutcomeRecord = { id: `o-${ids()}`, kind, at: now(), originator, threshold: threshold(), ...rest };
    await stores.outcomes.record(outcome);
    return outcome;
  };

  const save = async (thread: ThreadRecord): Promise<ThreadRecord> => {
    const updated = { ...thread, updatedAt: now() };
    await stores.threads.put(updated);
    return updated;
  };

  /** A thread an outcome may still be selected on. Replies are accepted on any thread: section 2.12.3 has a late match land after the Create. */
  const openThread = async (id: string): Promise<Outcome<ThreadRecord>> => {
    const thread = await stores.threads.get(id);
    if (thread === undefined) return no('thread-not-found', `no thread ${id}`);
    if (thread.status === 'minted' || thread.status === 'adopted') {
      return no('thread-closed', `thread ${id} already ${thread.status}; a later, better match is a supersession by the holder (section 2.7), not a second outcome`);
    }
    return yes(thread);
  };

  const anyThread = async (id: string): Promise<Outcome<ThreadRecord>> => {
    const thread = await stores.threads.get(id);
    return thread === undefined ? no('thread-not-found', `no thread ${id}`) : yes(thread);
  };

  const currentTally = (thread: ThreadRecord): Tally =>
    tallyReplies({ pool: thread.pool, mandatory: thread.mandatory, replies: thread.replies, threshold: thread.threshold });

  const postReply = async (thread: ThreadRecord, resolver: string, candidate?: Ranked & { readonly doc: MemberDoc }): Promise<{ readonly reply: Reply; readonly thread: ThreadRecord }> => {
    const actor = actorOf(resolver);
    const noteId = `${actor}/notes/${ids()}`;
    if (candidate === undefined || candidate.uli === undefined) {
      const reply: Reply = { resolver, kind: 'no-match' };
      const activity = noMatchReply({ id: noteId, actor, inReplyTo: thread.rootId, published: now() });
      const updated = await save({ ...thread, replies: [...thread.replies, reply], activities: [...thread.activities, activity] });
      return { reply, thread: updated };
    }
    const key = `thread:${thread.id}:reply:${resolver}:${thread.round}`;
    await stores.payloads.put(key, resolutionPayload(candidate.uli, candidate.result.score, candidate.record, candidate.doc.ddVersion));
    const reply: Reply = { resolver, kind: 'match', uli: candidate.uli, score: candidate.result.score };
    const activity = matchReply({ id: noteId, actor, inReplyTo: thread.rootId, published: now(), href: href('thread', thread.id, 'reply', resolver, String(thread.round)) });
    const updated = await save({ ...thread, replies: [...thread.replies, reply], activities: [...thread.activities, activity] });
    return { reply, thread: updated };
  };

  const alreadyReplied = (thread: ThreadRecord, resolver: string): Reply | undefined => thread.replies.find((r) => r.resolver === resolver);

  const hub: Hub = {
    parameters: () => ({ weights: weights(), threshold: threshold() }),

    search: async (uoi, query, options = {}) => {
      const subset = uliSubset(query);
      const ranked = await rankInTenant(uoi, subset, { excludeKey: options.excludeKey });
      return {
        query: subset,
        threshold: threshold(),
        identifiability: identifiability(subset, weights()),
        hits: ranked.map((r) => hit(r.doc, subset, r.result)),
      };
    },

    scorePair: (a, b) => score(uliSubset(a), uliSubset(b), weights()),

    dashboard: async (uoi) => {
      const docs = await stores.members.list(uoi, 500);
      const outcomes = await stores.outcomes.list(uoi);
      const settled = new Set(
        outcomes
          .filter((o) => (o.kind === 'local-same' || o.kind === 'local-different') && o.recordKey !== undefined && o.candidateKey !== undefined)
          .map((o) => pairId(o.recordKey as string, o.candidateKey as string))
      );
      const seen = new Set<string>();
      const items = (
        await Promise.all(
          docs.map(async (doc) => {
            const ranked = await rankInTenant(uoi, recordOf(doc), { excludeKey: doc.recordKey });
            return ranked
              .filter((r) => r.result.band !== 'rejected')
              .map((r) => ({ id: pairId(doc.recordKey, r.key), doc, other: r.doc, result: r.result }));
          })
        )
      )
        .flat()
        .filter((p) => !settled.has(p.id))
        .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
        .sort((a, b) => b.result.score - a.result.score);
      const threads = await stores.threads.list(uoi);
      return {
        uoi,
        newMatchesCount: items.filter((p) => p.result.band === 'possible match').length,
        reports: {
          records: await stores.members.count(uoi),
          ulisBound: await stores.members.countBound(uoi),
          threadsOpen: threads.filter((t) => t.status === 'open' || t.status === 'consensus').length,
          outcomes: outcomes.length,
        },
        actionItems: items.map((p) => ({
          id: p.id,
          type: p.result.band === 'possible match' ? 'resolve' : 'review',
          description: `${describe(p.doc)} (${p.doc.recordKey}) and ${describe(p.other)} (${p.other.recordKey}) score ${p.result.score}: ${p.result.band}`,
          score: p.result.score,
          band: p.result.band,
          timestamp: p.other.ingestedAt,
        })),
        threshold: threshold(),
      };
    },

    conflict: async (uoi, id) => {
      const [a, b] = id.split(PAIR_SEPARATOR);
      if (a === undefined || b === undefined) return no('conflict-not-found', `${id} is not a pair`);
      const [existing, incoming] = await Promise.all([stores.members.get(a), stores.members.get(b)]);
      if (existing === undefined || incoming === undefined || existing.uoi !== uoi || incoming.uoi !== uoi) {
        return no('conflict-not-found', `no pair ${id} in ${uoi}`);
      }
      const result = score(recordOf(existing), recordOf(incoming), weights());
      const factors = result.breakdown.map((e) => e.factor).join(', ');
      return yes({
        id,
        existing: hit(existing, recordOf(incoming), result),
        incoming: hit(incoming, recordOf(existing), result),
        result,
        reason: `${result.band} at ${result.score} of ${result.threshold}: ${factors || 'nothing'} agree${result.breakdown.length === 1 ? 's' : ''}`,
      });
    },

    resolveConflict: async (uoi, id, resolution) => {
      const c = await hub.conflict(uoi, id);
      if (!c.ok) return c;
      const { existing, incoming, result } = c.value;
      if (resolution === 'different') {
        const outcome = await record('local-different', uoi, { recordKey: existing._id, candidateKey: incoming._id, score: result.score, note: 'reviewed as different licensees' });
        return yes({ outcome });
      }
      if (existing.uli !== undefined && incoming.uli !== undefined && existing.uli !== incoming.uli) {
        return no('merge-required', 'both records already carry different ULIs; collapsing them is a merge, the composition of section 2.7, which this node does not yet drive');
      }
      const held = existing.uli ?? incoming.uli;
      if (held !== undefined) {
        await Promise.all([stores.members.bindUli(existing._id, held), stores.members.bindUli(incoming._id, held)]);
        const outcome = await record('local-same', uoi, { recordKey: existing._id, candidateKey: incoming._id, score: result.score, uli: held, note: 'bound locally to the ULI one record already held' });
        return yes({ outcome });
      }
      const outcome = await record('local-same', uoi, { recordKey: existing._id, candidateKey: incoming._id, score: result.score, note: 'reviewed as one licensee; broadcasting the combined record' });
      const merged = { ...incoming._source, ...existing._source };
      const broadcast = await hub.broadcast({ originator: uoi, record: merged, recordKey: existing._id });
      if (!broadcast.ok) return broadcast;
      return yes({ outcome, thread: broadcast.value });
    },

    broadcast: async (input) => {
      const doc = input.recordKey === undefined ? undefined : await stores.members.get(input.recordKey);
      if (input.recordKey !== undefined && doc === undefined) return no('record-not-found', `no record ${input.recordKey}`);
      // Narrow rather than assert. An `as MemberDoc` here read as a MemberDoc when the caller gave
      // neither a record nor a key, and the subset then threw on undefined: a 500 where the caller
      // deserved a 400. The assertion is what hid it from the compiler.
      const subject = input.record ?? doc;
      if (subject === undefined) return no('invalid', 'a record or a recordKey is required');
      const criteria = uliSubset(subject);
      const gate = identifiability(criteria, weights());
      if (!gate.identifiable) return no('not-identifiable', gate.reason ?? 'not identifiable');
      const pool = governance.pool();
      if (!pool.includes(input.originator)) return no('not-in-pool', `${input.originator} is not a certified, compliant, active resolver`);
      const mandatory = (input.mandatory ?? []).filter((m) => pool.includes(m) && m !== input.originator);
      const id = `t-${ids()}`;
      const rootId = `${origin}/threads/${id}`;
      const ddVersion = doc?.ddVersion ?? '2.0';
      await stores.payloads.put(`thread:${id}:request:1`, memberPayload([criteria], ddVersion));
      const activity = broadcastNote({
        id: rootId,
        actor: actorOf(input.originator),
        href: href('thread', id, 'request', '1'),
        published: now(),
        mandatory: mandatory.map(actorOf),
      });
      const thread = await save({
        id,
        rootId,
        originator: input.originator,
        ...(input.recordKey === undefined ? {} : { recordKey: input.recordKey }),
        criteria,
        pool,
        feedPosition: governance.feedPosition(),
        mandatory,
        excludeUlis: input.excludeUlis ?? [],
        threshold: threshold(),
        replies: [],
        activities: [activity],
        status: 'open',
        createdAt: now(),
        updatedAt: now(),
        round: 1,
      });
      return yes(thread);
    },

    resolverReply: async (threadId, resolver) => {
      const t = await anyThread(threadId);
      if (!t.ok) return t;
      const thread = t.value;
      if (!thread.pool.includes(resolver)) return no('not-in-pool', `${resolver} is not in this thread's pinned pool`);
      if (resolver === thread.originator) return no('invalid', 'the originator does not reply to its own broadcast');
      const prior = alreadyReplied(thread, resolver);
      if (prior !== undefined) return yes({ reply: prior, thread });
      const ranked = await rankInTenant(resolver, thread.criteria, { excludeUlis: thread.excludeUlis });
      // A match reply carries a candidate ULI (section 2.5); a candidate the
      // resolver holds without a ULI cannot be offered, so it replies no match.
      const offerable = ranked.filter((r) => r.result.band === 'possible match' && r.uli !== undefined);
      return yes(await postReply(thread, resolver, offerable[0]));
    },

    reply: async (threadId, resolver, candidateKey) => {
      const t = await anyThread(threadId);
      if (!t.ok) return t;
      const thread = t.value;
      if (!thread.pool.includes(resolver)) return no('not-in-pool', `${resolver} is not in this thread's pinned pool`);
      if (resolver === thread.originator) return no('invalid', 'the originator does not reply to its own broadcast');
      if (candidateKey === undefined) return yes(await postReply(thread, resolver));
      const doc = await stores.members.get(candidateKey);
      if (doc === undefined || doc.uoi !== resolver) return no('record-not-found', `${resolver} holds no record ${candidateKey}`);
      if (doc.uli === undefined) return no('no-uli-to-offer', `${candidateKey} carries no ULI to offer as a match (section 2.5)`);
      if (thread.excludeUlis.includes(doc.uli)) return no('invalid', `${doc.uli} is excluded from this thread's matching (section 2.7)`);
      const result = score(thread.criteria, recordOf(doc), weights());
      if (result.band !== 'possible match') {
        return no('below-threshold', `${candidateKey} scores ${result.score} against a ${result.threshold} threshold; section 2.5 forbids a match reply below it`);
      }
      return yes(await postReply(thread, resolver, { key: doc.recordKey, record: recordOf(doc), uli: doc.uli, result, doc }));
    },

    tally: async (threadId) => {
      const thread = await stores.threads.get(threadId);
      if (thread === undefined) return no('thread-not-found', `no thread ${threadId}`);
      const result = currentTally(thread);
      const updated = result.reached && thread.status === 'open' ? await save({ ...thread, status: 'consensus' }) : thread;
      return yes({ thread: updated, tally: result });
    },

    mint: async (threadId) => {
      const t = await openThread(threadId);
      if (!t.ok) return t;
      const thread = t.value;
      const result = currentTally(thread);
      if (!result.reached) return no('consensus-not-reached', `${result.replied} of ${result.needed} replies${result.mandatoryMissing.length > 0 ? `, mandatory missing: ${result.mandatoryMissing.join(', ')}` : ''}; a ULI is never minted unilaterally (section 2.4)`);
      if (result.outcome !== 'mint') return no('wrong-outcome', `consensus found a match (${result.best?.uli}); adopt it rather than mint (section 2.6)`);
      const entry = governance.entry(thread.originator);
      const key = signer.privateKeyFor(thread.originator);
      if (entry === undefined || key === undefined) return no('no-signing-key', `${thread.originator} has no certified signing key`);
      const uli = mintUli({ uoi: entry.uoiUrn, privateKeyPem: key });
      const nonce = (parseUli(uli) as { ok: true; value: { nonce: string } }).value.nonce;
      if (thread.recordKey !== undefined) await stores.members.bindUli(thread.recordKey, uli);
      await stores.payloads.put(`uli:${nonce}`, memberPayload([{ ...thread.criteria, UniqueLicenseeIdentifier: uli }]));
      const noteId = `${origin}/uli/${nonce}`;
      const activity = uliCreated({ createId: `${actorOf(thread.originator)}/activities/${ids()}`, noteId, actor: actorOf(thread.originator), inReplyTo: thread.rootId, href: href('uli', nonce), published: now() });
      const updated = await save({ ...thread, status: 'minted', uli, createdNoteId: noteId, activities: [...thread.activities, activity] });
      await record('mint', thread.originator, { threadId, recordKey: thread.recordKey, uli, note: `no-match consensus, ${result.replied} of ${result.r} replied` });
      return yes({ uli, thread: updated });
    },

    adopt: async (threadId, requested) => {
      const t = await openThread(threadId);
      if (!t.ok) return t;
      const thread = t.value;
      const result = currentTally(thread);
      if (!result.reached) return no('consensus-not-reached', `${result.replied} of ${result.needed} replies; consensus first (section 2.6)`);
      if (result.outcome !== 'adopt' || result.best === undefined) return no('wrong-outcome', 'consensus found no match over threshold; mint rather than adopt (section 2.6)');
      const chosen = requested === undefined ? result.best : result.matches.find((m) => m.uli === requested);
      if (chosen === undefined) return no('invalid', `${requested} is not a match reply over threshold in this thread`);
      if (thread.recordKey !== undefined) await stores.members.bindUli(thread.recordKey, chosen.uli);
      // Adoption posts nothing: it changes no shared state (section 2.7).
      const updated = await save({ ...thread, status: 'adopted', uli: chosen.uli });
      await record('adopt', thread.originator, { threadId, recordKey: thread.recordKey, uli: chosen.uli, score: chosen.score, note: `adopted ${chosen.resolver}'s match over ${result.matches.length} match repl${result.matches.length === 1 ? 'y' : 'ies'}` });
      return yes({ uli: chosen.uli, thread: updated });
    },

    decline: async (threadId, corrected) => {
      const t = await openThread(threadId);
      if (!t.ok) return t;
      const thread = t.value;
      const result = currentTally(thread);
      const criteria = uliSubset(corrected);
      const gate = identifiability(criteria, weights());
      if (!gate.identifiable) return no('not-identifiable', gate.reason ?? 'not identifiable');
      const declined = result.best;
      await record('decline', thread.originator, { threadId, recordKey: thread.recordKey, uli: declined?.uli, score: declined?.score, note: declined === undefined ? 'declined on review with no match over threshold' : `declined ${declined.uli} on review; rebroadcast corrected criteria` });
      const round = thread.round + 1;
      await stores.payloads.put(`thread:${thread.id}:request:${round}`, memberPayload([criteria]));
      const activity = broadcastNote({
        id: `${thread.rootId}/round/${round}`,
        actor: actorOf(thread.originator),
        inReplyTo: thread.rootId,
        href: href('thread', thread.id, 'request', String(round)),
        published: now(),
        mandatory: thread.mandatory.map(actorOf),
      });
      return yes(await save({ ...thread, criteria, replies: [], round, status: 'open', activities: [...thread.activities, activity] }));
    },

    supersede: async (input) => {
      if (input.successorScore < threshold()) return no('below-threshold', `a supersession needs a better match that clears the ${threshold()} threshold (section 2.7)`);
      const parsed = parseUli(input.successorUli);
      if (!parsed.ok) return no('invalid', `successor is not a ULI: ${parsed.reason}`);
      const minted = (await stores.threads.list(input.holder)).find((t) => t.uli === input.retiredUli && t.status === 'minted');
      if (minted === undefined || minted.createdNoteId === undefined) return no('not-a-holder', `${input.holder} did not mint ${input.retiredUli}; only a holder issues the tombstone (section 2.7)`);
      const activity = tombstone({ id: minted.createdNoteId, actor: actorOf(input.holder), inReplyTo: minted.rootId, deleted: now(), retiredUli: input.retiredUli, successorUli: input.successorUli });
      const relinked = await stores.members.relink(input.retiredUli, input.successorUli);
      await save({ ...minted, activities: [...minted.activities, activity] });
      await record('tombstone', input.holder, { threadId: minted.id, uli: input.successorUli, score: input.successorScore, note: `retired ${input.retiredUli}; ${relinked} record${relinked === 1 ? '' : 's'} relinked` });
      return yes({ relinked, activity });
    },

    verify: (uli) => verifyUli(uli, governance.keysFor),
    threads: (originator) => stores.threads.list(originator),
    thread: (id) => stores.threads.get(id),
    outcomes: (originator) => stores.outcomes.list(originator),
    payload: (key) => stores.payloads.get(key),
  };

  return hub;
};

/** Which of the seventeen fields a query carried, for a results view. */
export const searchedFields = (query: LicenseeRecord): readonly string[] => ULI_FIELDS.filter((f) => query[f] !== undefined && query[f] !== '');
