/**
 * Delivery over HTTP: the third Federation.
 *
 * A broadcast leaves this node as an ActivityPub `Create` carrying the round's
 * `Note`, POSTed to the inbox of every resolver in the thread's pinned pool
 * except the originator. Section 2.4 addresses the Note to the resolver
 * collection, which every resolver follows; there is no Follow machinery here,
 * so following is modeled as delivery to every member of the pinned pool. The
 * inbox URL is read from each resolver's actor document, and the actor URL from
 * the governance feed (section 2.10), so there is one source for where a
 * resolver lives.
 *
 * A resolver that is down, or that refuses, is a resolver that did not reply.
 * Section 2.6 reaches consensus over the replies that arrive, so delivery never
 * fails a broadcast; it records what it attempted and what failed, and the
 * tally reads the thread as it stands.
 *
 * Replies do not come back through this object. They arrive at the originator's
 * inbox (`src/adapters/activitypub.ts`), which records them in the thread. This
 * re-reads the thread once the round has been offered to everyone, which is why
 * `deliver` returns a thread that may already carry replies.
 *
 * Authentication between nodes is a bearer token prearranged per peer (section
 * 2.1, section 2.11): the pilot runs the whole network behind auth. HTTP
 * Signatures are not implemented; the inbox names where a check would go.
 */

import { randomUUID } from 'node:crypto';
import { type Activity, CONTENT, create, RESOLVERS_COLLECTION } from '../sdk/activities.js';
import type { Federation } from './federation.js';
import type { Governance } from './governance.js';
import type { Hub } from './hub.js';

/** Where a peer can be reached: its tenant key and its actor URL, as the governance feed lists it. */
export interface PeerAddress {
  readonly uoi: string;
  readonly actor?: string;
}

/** One delivery attempt, kept so a broadcast can say who it reached and who it did not. */
export interface DeliveryRecord {
  readonly at: string;
  readonly threadId?: string;
  readonly resolver: string;
  readonly actor?: string;
  readonly inbox?: string;
  readonly activityId?: string;
  readonly ok: boolean;
  readonly status?: number;
  readonly error?: string;
}

export interface PeerResult {
  readonly ok: boolean;
  readonly status?: number;
  readonly body?: unknown;
  readonly error?: string;
}

export interface Peers {
  /** POST an activity to a resolver's inbox, discovered from its actor document. Never throws. */
  post: (to: PeerAddress, activity: Activity, context?: { readonly threadId?: string }) => Promise<PeerResult>;
  /** GET an OAuth2-protected link a peer's activity carries, as the reader this node is to that peer. Never throws. */
  fetch: (href: string, from: PeerAddress) => Promise<PeerResult>;
  /** Every attempt, oldest first. */
  readonly deliveries: readonly DeliveryRecord[];
}

export interface PeersConfig {
  /** The outbound bearer token prearranged with a peer (section 2.1). Undefined means no arrangement exists. */
  readonly tokenFor: (uoi: string) => string | undefined;
  readonly fetch?: typeof fetch;
  /** A liveness bound on each call, so a down resolver cannot hang a broadcast. A bound, not a delay. */
  readonly timeoutMs?: number;
  readonly now?: () => string;
}

/** The media type ActivityPub servers exchange, as the specification's examples write it. */
export const AS2_MEDIA_TYPE = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"';

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => v !== null && typeof v === 'object' && !Array.isArray(v);

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** The reason a call failed, from the transport or from the peer's own structured refusal. */
const reasonOf = (r: PeerResult): string | undefined =>
  r.error ?? (r.ok ? undefined : isRecord(r.body) && typeof r.body['reason'] === 'string' ? `HTTP ${r.status}: ${r.body['reason']}` : `HTTP ${r.status}`);

export const httpPeers = (config: PeersConfig): Peers => {
  const f = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? 5000;
  const now = config.now ?? (() => new Date().toISOString());
  const deliveries: DeliveryRecord[] = [];

  const call = async (url: string, init: { readonly method: 'GET' | 'POST'; readonly token: string; readonly accept: string; readonly body?: string }): Promise<PeerResult> => {
    try {
      const res = await f(url, {
        method: init.method,
        headers: {
          accept: init.accept,
          authorization: `Bearer ${init.token}`,
          ...(init.body === undefined ? {} : { 'content-type': AS2_MEDIA_TYPE }),
        },
        body: init.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, body: text === '' ? undefined : parse(text) };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : String(cause) };
    }
  };

  /** The inbox is read from the actor document, never derived: an actor says where its inbox is. */
  const inboxOf = async (actor: string, token: string): Promise<PeerResult & { readonly inbox?: string }> => {
    const r = await call(actor, { method: 'GET', token, accept: AS2_MEDIA_TYPE });
    if (!r.ok) return r;
    const inbox = isRecord(r.body) && typeof r.body['inbox'] === 'string' ? r.body['inbox'] : undefined;
    return inbox === undefined ? { ok: false, status: r.status, error: `actor document at ${actor} names no inbox` } : { ...r, inbox };
  };

  return {
    deliveries,
    post: async (to, activity, context = {}) => {
      const base = { at: now(), threadId: context.threadId, resolver: to.uoi, actor: to.actor, activityId: typeof activity['id'] === 'string' ? activity['id'] : undefined };
      const failed = (error: string, status?: number): PeerResult => {
        deliveries.push({ ...base, ok: false, status, error });
        return { ok: false, status, error };
      };
      if (to.actor === undefined) return failed('no actor URL on the governance feed for this resolver (section 2.10)');
      const token = config.tokenFor(to.uoi);
      if (token === undefined) return failed('no bearer token prearranged with this resolver (section 2.1)');
      const discovered = await inboxOf(to.actor, token);
      if (!discovered.ok || discovered.inbox === undefined) return failed(reasonOf(discovered) ?? 'inbox discovery failed', discovered.status);
      const r = await call(discovered.inbox, { method: 'POST', token, accept: AS2_MEDIA_TYPE, body: JSON.stringify(activity) });
      // The peer's own structured reason travels with the result, so a caller relaying a refusal keeps it.
      const error = reasonOf(r);
      deliveries.push({ ...base, inbox: discovered.inbox, ok: r.ok, status: r.status, error });
      return { ...r, error };
    },
    fetch: async (href, from) => {
      const token = config.tokenFor(from.uoi);
      if (token === undefined) return { ok: false, error: `no bearer token prearranged with ${from.uoi} (section 2.1)` };
      return call(href, { method: 'GET', token, accept: 'application/json' });
    },
  };
};

/** The round's broadcast: the last request Note in the thread, since a decline adds one per round (section 2.7). */
export const currentRound = (activities: readonly Activity[]): Activity | undefined =>
  activities.filter((a) => a['content'] === CONTENT.request).at(-1);

/** The Note as it rides inside a Create: without a context of its own (section 2.12.1). */
export const withoutContext = (activity: Activity): Activity => Object.fromEntries(Object.entries(activity).filter(([k]) => k !== '@context'));

export const newActivityId = (): string => randomUUID().replace(/-/g, '').slice(0, 12);

export const httpFederation = (hub: Hub, governance: Governance, peers: Peers, now: () => string = () => new Date().toISOString()): Federation => ({
  deliver: async (thread) => {
    const round = currentRound(thread.activities);
    const actor = round?.['attributedTo'];
    if (round === undefined || typeof actor !== 'string') return thread;
    // Section 2.12.1: the server wraps the Note in a Create and federates that.
    const activity = create({ id: `${actor}/activities/${newActivityId()}`, actor, object: withoutContext(round), to: [RESOLVERS_COLLECTION], published: now() });
    // One resolver at a time, as localFederation does. A resolver replies inside the POST, into this
    // node's inbox, and two replies landing together would each read the thread before the other had
    // written it. Sequential delivery keeps the pilot's writes ordered; a versioned write is the
    // production fix, and it belongs in the thread store.
    await thread.pool
      .filter((r) => r !== thread.originator)
      .reduce<Promise<void>>(async (acc, resolver) => {
        await acc;
        await peers.post(governance.entry(resolver) ?? { uoi: resolver }, activity, { threadId: thread.id });
      }, Promise.resolve());
    return (await hub.thread(thread.id)) ?? thread;
  },
});
