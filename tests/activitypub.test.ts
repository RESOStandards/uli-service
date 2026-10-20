import { createServer } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, listen } from '../src/adapters/express.js';
import { API_PREFIX } from '../src/adapters/routes.js';
import { toMemberDoc } from '../src/ingest/record.js';
import { httpFederation, httpPeers, type Peers } from '../src/node/federation-http.js';
import { localFederation } from '../src/node/federation.js';
import { type Governance, localGovernance, memorySigner, type ResolverEntry, uoiUrn } from '../src/node/governance.js';
import { createHub, type Hub } from '../src/node/hub.js';
import { memoryStores } from '../src/node/store-memory.js';
import type { MemberDoc, Stores, ThreadRecord } from '../src/node/store.js';
import { AS2, purity } from '../src/sdk/activities.js';
import { generateKeyPair, mintUli } from '../src/sdk/uli.js';
import { JANE_P1, JANE_P8, SEED_A1, SEED_B1 } from './fixtures.js';

/**
 * Two nodes in one process, each with its own stores, governance, hub and
 * Express listener, so the only path between them is HTTP. Node A originates;
 * node B answers through A's inbox. Nothing is shared: B holds no thread
 * record, and A learns B's reply only because B POSTed it.
 */

const A = 'M00000001';
const B = 'M00000002';
const C = 'M00000003';
const D = 'M00000004';
/** The token each node accepts, and therefore the one a peer must present to it. */
const TOKENS: Readonly<Record<string, string>> = { [A]: 'tok-a', [B]: 'tok-b', [C]: 'tok-c', [D]: 'tok-d' };
const keys = Object.fromEntries([A, B, C].map((u) => [u, generateKeyPair()]));

interface Node {
  readonly uoi: string;
  readonly base: string;
  readonly actor: string;
  readonly stores: Stores;
  readonly hub: Hub;
  readonly governance: Governance;
  readonly peers?: Peers;
  readonly close: () => Promise<void>;
}

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
      s.close(() => resolve(port));
    });
  });

const entryFor = (uoi: string, base: string): ResolverEntry => ({
  uoi,
  uoiUrn: uoiUrn(uoi),
  actor: `${base}${API_PREFIX}/actors/${uoi}`,
  publicKeys: [keys[uoi]?.publicKey ?? 'none'],
  status: 'active',
  certified: true,
});

const started: Node[] = [];

/** A node acting for one tenant. `tokenFor` is its prearranged grant per peer (section 2.1). */
const startNode = async (uoi: string, seed: readonly MemberDoc[], tokenFor: (peer: string) => string | undefined, options: { readonly federated?: boolean } = {}): Promise<Node> => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const stores = memoryStores(seed);
  const governance = localGovernance();
  const hub = createHub({ stores, governance, signer: memorySigner({ [uoi]: keys[uoi].privateKeyPem }), origin: base });
  const peers = options.federated === false ? undefined : httpPeers({ tokenFor, timeoutMs: 2000 });
  const app = createApp({
    hub,
    stores,
    governance,
    federation: peers === undefined ? localFederation(hub) : httpFederation(hub, governance, peers),
    auth: { allows: (b) => b === TOKENS[uoi], guardsOperations: false },
    nodeUoi: uoi,
    peers,
    tenants: [uoi],
  });
  const listening = await listen(app, port);
  const node: Node = { uoi, base, actor: `${base}${API_PREFIX}/actors/${uoi}`, stores, hub, governance, peers, close: listening.close };
  started.push(node);
  return node;
};

/** Each node knows the other as a resolver with its real actor URL and key: the governance feed, as the pilot configures it. */
const introduce = (...nodes: readonly Node[]): void => {
  nodes.forEach((n) => nodes.forEach((other) => n.governance.register(entryFor(other.uoi, other.base))));
};

interface Res {
  readonly status: number;
  readonly body: Record<string, unknown>;
  readonly headers: Headers;
}

const api = async (node: Node, method: string, path: string, body?: unknown, token: string | null = TOKENS[node.uoi]): Promise<Res> => {
  const res = await fetch(`${node.base}${API_PREFIX}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/activity+json' }), ...(token === null ? {} : { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? {} : (JSON.parse(text) as Record<string, unknown>), headers: res.headers };
};

const threadOf = (r: Res): ThreadRecord => r.body.thread as ThreadRecord;

let a: Node;
let b: Node;
let bUli: string;

beforeEach(async () => {
  bUli = mintUli({ uoi: uoiUrn(B), privateKeyPem: keys[B].privateKeyPem });
  a = await startNode(A, [toMemberDoc(SEED_A1, { uoi: A }), toMemberDoc(JANE_P1, { uoi: A })], (peer) => TOKENS[peer]);
  b = await startNode(B, [toMemberDoc(SEED_B1, { uoi: B }), toMemberDoc({ ...JANE_P8, UniqueLicenseeIdentifier: bUli }, { uoi: B })], (peer) => TOKENS[peer]);
  introduce(a, b);
});

afterEach(async () => {
  await Promise.all(started.splice(0).map((n) => n.close()));
});

describe('two nodes federate over HTTP', () => {
  it('a broadcast from A is answered by B through A inbox, consensus is reached, and the minted ULI verifies on B', async () => {
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` });
    expect(r.status).toBe(200);
    expect(r.body.tally).toMatchObject({ r: 2, needed: 1, replied: 1, reached: true, outcome: 'mint' });
    const thread = threadOf(r);
    expect(thread.replies).toEqual([{ resolver: B, kind: 'no-match' }]);

    // The reply in A's thread is B's Note: attributed to B's actor on B's host, threaded under A's root, a bare Note with its context.
    const reply = thread.activities[1];
    expect(reply).toMatchObject({ '@context': AS2, type: 'Note', attributedTo: b.actor, inReplyTo: thread.rootId, content: 'No Match' });
    expect(String(reply.id)).toMatch(new RegExp(`^${b.actor}/notes/`));

    // A delivered to B's inbox, discovered from B's actor document; B delivered its reply to A's inbox.
    expect(a.peers?.deliveries).toMatchObject([{ resolver: B, actor: b.actor, inbox: `${b.actor}/inbox`, threadId: thread.id, ok: true, status: 200 }]);
    expect(b.peers?.deliveries).toMatchObject([{ resolver: A, inbox: `${a.actor}/inbox`, threadId: thread.id, ok: true, status: 200 }]);
    expect((await api(a, 'GET', '/federation')).body).toMatchObject({ transport: 'http', deliveries: [{ resolver: B, ok: true }] });

    // B holds no thread record at all: what A knows, it learned over the wire.
    expect(await b.stores.threads.list()).toEqual([]);
    expect((await b.stores.activities.list(B, 'inbox')).map((x) => x.content)).toEqual(['ULI Resolution Request']);

    const m = await api(a, 'POST', `/threads/${thread.id}/mint`);
    expect(m.status).toBe(200);
    const uli = m.body.uli as string;
    const v = await api(b, 'POST', '/verify', { uli });
    expect(v.body).toMatchObject({ ok: true, uoi: uoiUrn(A) });
  });

  it('a match reply carries its score behind B link, which A reads over HTTP, and A adopts', async () => {
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A0001` });
    expect(r.body.tally).toMatchObject({ reached: true, outcome: 'adopt', best: { resolver: B, uli: bUli, score: 2905 } });
    const thread = threadOf(r);
    const reply = thread.activities.find((x) => x.content === 'Matches Found') as Record<string, unknown>;
    const href = (reply.url as { href: string }).href;
    expect(href).toMatch(new RegExp(`^${b.base}${API_PREFIX}/rcf/thread/${thread.id}/reply/${B}/1$`));
    expect(JSON.stringify(reply)).not.toMatch(/2905/);

    // The score lives behind B's link, for an authorized reader only.
    const direct = await fetch(href, { headers: { authorization: `Bearer ${TOKENS[B]}` } });
    expect(await direct.json()).toMatchObject({ uli: bUli, score: 2905 });
    expect((await fetch(href)).status).toBe(401);

    const adopted = await api(a, 'POST', `/threads/${thread.id}/adopt`);
    expect(adopted.status).toBe(200);
    expect(adopted.body.uli).toBe(bUli);
    expect((await a.stores.members.get(`${A}:A0001`))?.uli).toBe(bUli);
  });

  it('a decline rebroadcasts round two over HTTP and B answers it', async () => {
    const first = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A0001` });
    const id = threadOf(first).id;
    const d = await api(a, 'POST', `/threads/${id}/decline`, { record: { ...JANE_P1, MemberFullName: 'Janet Smith', MemberFirstName: 'Janet', MemberNickname: 'Jay', MemberNationalAssociationId: '111222333', MemberStateLicense: 'SL000001' } });
    expect(d.status).toBe(200);
    expect(threadOf(d).round).toBe(2);
    expect(d.body.tally).toMatchObject({ replied: 1, reached: true, outcome: 'mint' });
    const delivered = a.peers?.deliveries.at(-1);
    expect(delivered).toMatchObject({ resolver: B, ok: true });
    expect((await b.stores.activities.list(B, 'inbox'))[0]?.id).toBe(`${threadOf(d).rootId}/round/2`);
  });
});

describe('the actor document', () => {
  it('is gated by the node tokens even though its operations are open: 401 with a challenge, 403 for a stranger', async () => {
    const none = await api(a, 'GET', `/actors/${A}`, undefined, null);
    expect(none.status).toBe(401);
    expect(none.headers.get('www-authenticate')).toBe('Bearer realm="uli"');
    expect((await api(a, 'GET', `/actors/${A}`, undefined, 'stranger')).status).toBe(403);
    expect((await api(a, 'GET', '/health', undefined, null)).status).toBe(200);
  });

  it('is pure Activity Streams, names its inbox and outbox, and carries no publicKey term', async () => {
    const r = await api(a, 'GET', `/actors/${A}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('application/ld+json');
    expect(r.body).toMatchObject({ '@context': AS2, id: a.actor, type: 'Organization', preferredUsername: A, name: uoiUrn(A), inbox: `${a.actor}/inbox`, outbox: `${a.actor}/outbox` });
    expect(purity(r.body)).toEqual([]);
    expect(JSON.stringify(r.body)).not.toMatch(/publicKey/);
    // The key is one link away, on the governance feed as this node serves it (sections 2.8 and 2.10).
    const href = (r.body.url as { href: string }).href;
    expect(href).toBe(`${a.base}${API_PREFIX}/governance`);
    const feed = await (await fetch(href)).json() as { resolvers: ResolverEntry[] };
    expect(feed.resolvers.find((x) => x.uoi === A)?.publicKeys).toEqual([keys[A].publicKey]);
  });

  it('is 404 for a resolver this node knows but does not act for', async () => {
    const r = await api(a, 'GET', `/actors/${B}`);
    expect(r.status).toBe(404);
    expect(r.body.reason).toMatch(/not a tenant this node acts for/);
    expect((await api(a, 'POST', `/actors/${A}`, {})).status).toBe(405);
  });
});

describe('the outbox', () => {
  it('lists the tenant activities newest first, paged, as pure Activity Streams', async () => {
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` });
    await api(a, 'POST', `/threads/${threadOf(r).id}/mint`);
    const collection = await api(a, 'GET', `/actors/${A}/outbox`);
    expect(collection.body).toMatchObject({ '@context': AS2, type: 'OrderedCollection', id: `${a.actor}/outbox`, totalItems: 2, first: `${a.actor}/outbox?page=1`, last: `${a.actor}/outbox?page=1` });
    const page = await api(a, 'GET', `/actors/${A}/outbox?page=1`);
    expect(page.body).toMatchObject({ type: 'OrderedCollectionPage', partOf: `${a.actor}/outbox` });
    const items = page.body.orderedItems as Record<string, unknown>[];
    expect(items.map((x) => x.type)).toEqual(['Create', 'Note']);
    expect(items[1]).toMatchObject({ content: 'ULI Resolution Request', attributedTo: a.actor });
    expect(purity(page.body)).toEqual([]);
    expect('next' in page.body).toBe(false);

    // B's outbox holds the reply it sent into A's thread, which no thread record on B could hold.
    const bPage = await api(b, 'GET', `/actors/${B}/outbox?page=1`);
    expect((bPage.body.orderedItems as Record<string, unknown>[]).map((x) => x.content)).toEqual(['No Match']);
    expect((await api(a, 'GET', `/actors/${A}/outbox?page=0`)).status).toBe(400);
    expect(((await api(a, 'GET', `/actors/${A}/outbox?page=2`)).body.orderedItems as unknown[])).toEqual([]);
  });
});

describe('the inbox guards', () => {
  const note = (fields: Record<string, unknown>): Record<string, unknown> => ({ '@context': AS2, type: 'Note', ...fields });

  it('refuses a sender that is not on the governance feed', async () => {
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: 'https://stranger.example/actor', inReplyTo: 'x', content: 'No Match' }));
    expect(r.status).toBe(403);
    expect(r.body.reason).toMatch(/not a certified resolver on this node's governance feed/);
  });

  it('refuses a sender that is on the feed but not in R', async () => {
    a.governance.register({ ...entryFor(C, 'http://c.invalid'), status: 'inactive' });
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: `http://c.invalid${API_PREFIX}/actors/${C}`, inReplyTo: 'x', content: 'No Match' }));
    expect(r.status).toBe(403);
    expect(r.body.reason).toMatch(/not certified, compliant and active/);
  });

  it('refuses an activity carrying a term outside Activity Streams, and names it', async () => {
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: b.actor, inReplyTo: 'x', content: 'No Match', score: 1450 }));
    expect(r.status).toBe(400);
    expect(r.body.reason).toMatch(/non-AS2 terms: score/);
  });

  it('refuses a reply to a thread this tenant did not originate', async () => {
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: b.actor, inReplyTo: `${a.base}/threads/t-nope`, content: 'No Match' }));
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('thread-not-found');
  });

  it('refuses a reply from a resolver outside the pinned pool', async () => {
    const thread = threadOf(await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` }));
    a.governance.register(entryFor(C, 'http://c.invalid'));
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: `http://c.invalid${API_PREFIX}/actors/${C}`, inReplyTo: thread.rootId, content: 'No Match' }));
    expect(r.status).toBe(403);
    expect(r.body.reason).toMatch(/pinned pool/);
  });

  it('records a reply once per resolver', async () => {
    const thread = threadOf(await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` }));
    const again = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: b.actor, inReplyTo: thread.rootId, content: 'No Match' }));
    expect(again.status).toBe(200);
    expect(again.body.recorded).toBe(false);
    expect((await a.hub.thread(thread.id))?.replies).toHaveLength(1);
  });

  it('refuses a match reply whose payload link cannot be read', async () => {
    const thread = threadOf(await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` }));
    a.governance.register(entryFor(C, 'http://c.invalid'));
    const fresh = threadOf(await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` }));
    expect(fresh.pool).toContain(C);
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: `http://c.invalid${API_PREFIX}/actors/${C}`, inReplyTo: fresh.rootId, content: 'Matches Found', url: { type: 'Link', href: `${b.base}${API_PREFIX}/rcf/uli/nope`, mediaType: 'application/json' } }));
    expect(r.status).toBe(422);
    expect(r.body.reason).toMatch(/cannot be ranked/);
    expect((await a.hub.thread(fresh.id))?.replies.map((x) => x.resolver)).toEqual([B]);
    expect(thread.id).not.toBe(fresh.id);
  });

  it('refuses a match reply that offers a ULI the thread excludes, and names the gap in the wire format', async () => {
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A0001`, excludeUlis: [bUli] });
    expect(r.body.tally).toMatchObject({ replied: 0, reached: false });
    const delivered = a.peers?.deliveries.at(-1);
    expect(delivered).toMatchObject({ resolver: B, ok: false, status: 502 });
    expect(delivered?.error).toMatch(/section 2\.12\.4/);
    expect(b.peers?.deliveries.at(-1)).toMatchObject({ resolver: A, ok: false, status: 400 });
  });

  it('a resolver that cannot read the subset does not reply, and the originator log carries the reason', async () => {
    const c = await startNode(C, [], (peer) => (peer === A ? 'not-the-grant' : TOKENS[peer]));
    introduce(a, b, c);
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` });
    expect(r.body.tally).toMatchObject({ r: 3, needed: 2, replied: 1, reached: false });
    const toC = a.peers?.deliveries.find((d) => d.resolver === C);
    expect(toC).toMatchObject({ ok: false, status: 422 });
    expect(toC?.error).toMatch(/section 2\.1 makes that access prearranged/);
    expect((await api(c, 'GET', `/actors/${C}/outbox`)).body.totalItems).toBe(0);
  });

  it('a resolver that is down is a resolver that did not reply', async () => {
    a.governance.register(entryFor(D, `http://127.0.0.1:${await freePort()}`));
    const r = await api(a, 'POST', '/broadcast', { recordKey: `${A}:A1001` });
    expect(r.status).toBe(200);
    expect(r.body.tally).toMatchObject({ r: 3, needed: 2, replied: 1, reached: false });
    const toD = a.peers?.deliveries.find((d) => d.resolver === D);
    expect(toD?.ok).toBe(false);
    expect(toD?.error).toMatch(/fetch failed|ECONNREFUSED/);
  });

  it('a node without a peer transport refuses its inbox and says so', async () => {
    const lone = await startNode(C, [], () => undefined, { federated: false });
    introduce(a, lone);
    const r = await api(lone, 'POST', `/actors/${C}/inbox`, note({ attributedTo: a.actor, inReplyTo: 'x', content: 'No Match' }));
    expect(r.status).toBe(501);
    expect(r.body.error).toBe('no-peer-transport');
    expect(r.body.reason).toMatch(/configure peers/);
  });

  it('keeps a Tombstone for a thread it did not originate, and says it acted on nothing', async () => {
    const r = await api(b, 'POST', `/actors/${B}/inbox`, { '@context': AS2, type: 'Tombstone', formerType: 'Note', id: `${a.base}/uli/x`, attributedTo: a.actor, inReplyTo: `${a.base}/threads/t-x`, deleted: '2026-10-12T00:00:00Z', content: 'ULI Retired: urn:x', url: { type: 'Link', href: 'urn:y' } });
    expect(r.status).toBe(202);
    expect(r.body.reason).toMatch(/not acted on/);
    expect((await b.stores.activities.list(B, 'inbox')).map((x) => x.type)).toEqual(['Tombstone']);
  });

  it('refuses something that is not an RCP-54 thread activity', async () => {
    const r = await api(a, 'POST', `/actors/${A}/inbox`, note({ attributedTo: b.actor, content: 'Hello' }));
    expect(r.status).toBe(422);
    expect(r.body.reason).toMatch(/not an RCP-54 thread activity/);
  });
});

describe('httpFederation.deliver', () => {
  it('is a no-op for a thread with no broadcast in it, and attempts nothing', async () => {
    const peers = httpPeers({ tokenFor: () => 'x' });
    const thread: ThreadRecord = { id: 't', rootId: 'r', originator: A, criteria: {}, pool: [A, B], feedPosition: 0, mandatory: [], excludeUlis: [], threshold: 1250, replies: [], activities: [], status: 'open', createdAt: '', updatedAt: '', round: 1 };
    expect(await httpFederation(a.hub, a.governance, peers).deliver(thread)).toBe(thread);
    expect(peers.deliveries).toEqual([]);
  });
});
