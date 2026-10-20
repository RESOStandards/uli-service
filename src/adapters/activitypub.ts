/**
 * The ActivityPub surface: an actor per tenant, its inbox and its outbox.
 *
 * The actor document and the collections are not built by the SDK, which
 * builds the protocol's activities, so they are built here with the same rule:
 * Activity Streams terms only (section 2.2), checked with the SDK's `purity`
 * before anything leaves. The SDK's type list stops at `OrderedCollection`,
 * so the pages are not run through its `seal`; `OrderedCollectionPage` is a
 * core Activity Streams type, not an extension.
 *
 * The inbox is where the two directions of a thread meet over HTTP. A broadcast
 * arriving for one of this node's tenants is answered the way `resolverReply`
 * answers in process: read the subset behind the link, search the tenant's own
 * partition, reply into the thread. The reply goes back through the
 * originator's inbox, not through a function call. A reply arriving for a
 * thread this node originated is recorded in that thread with the guards
 * `resolverReply` applies, and the hub tallies it as it would any reply. The
 * hub itself has no operation that records a reply received from elsewhere,
 * so the thread record is written here; that is noted in the report rather
 * than changed in the hub.
 *
 * Every route here is gated by the node's bearer tokens whatever the
 * configuration says about its other operations: in the pilot the activities
 * are not public (section 2.11, "access to the network MUST be authenticated").
 */

import type { ResolverEntry } from '../node/governance.js';
import { AS2_MEDIA_TYPE, newActivityId, withoutContext } from '../node/federation-http.js';
import { type Activity, AS2, CONTENT, create, matchReply, noMatchReply, purity } from '../sdk/activities.js';
import type { Reply } from '../sdk/consensus.js';
import { checkMemberPayload, type RcfPayload, resolutionPayload } from '../sdk/rcf.js';
import { parseUli } from '../sdk/uli.js';
import type { NodeRequest, NodeResponse, RouteDeps } from './routes.js';

const PAGE_SIZE = 20;

const json = (status: number, body: unknown): NodeResponse => ({ status, body });
const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const now = (): string => new Date().toISOString();
const methodNotAllowed = (allow: string): NodeResponse => ({ status: 405, body: { error: 'method not allowed' }, headers: { allow } });

/** An Activity Streams document leaves only after the SDK's purity check; a foreign term here is a programming error. */
const as2 = (doc: Activity): NodeResponse => {
  const impure = purity(doc);
  if (impure.length > 0) throw new Error(`document carries non-AS2 terms: ${impure.join(', ')}`);
  return { status: 200, body: doc, headers: { 'content-type': AS2_MEDIA_TYPE } };
};

/** The actor URL is `<api base>/actors/<uoi>`, so the base of the node's other routes is what precedes `/actors/`. */
const apiBaseOf = (actor: string): string | undefined => {
  const i = actor.lastIndexOf('/actors/');
  return i < 0 ? undefined : actor.slice(0, i);
};

/** The tenants this node acts for: configured, else every tenant in the member store plus the default one. */
const isLocalTenant = async (deps: RouteDeps, uoi: string): Promise<boolean> =>
  deps.tenants === undefined ? uoi === deps.nodeUoi || (await deps.stores.members.tenants()).includes(uoi) : deps.tenants.includes(uoi);

const hrefOf = (object: Readonly<Record<string, unknown>>): string | undefined => (isRecord(object['url']) ? str(object['url']['href']) : undefined);

/** A decline rebroadcast is `<root>/round/<n>` (section 2.7); the first round is the root itself. */
const roundOf = (id: string | undefined): number => {
  const m = /\/round\/(\d+)$/.exec(id ?? '');
  return m === null ? 1 : Number(m[1]);
};

export const handleActivityPub = async (deps: RouteDeps, req: NodeRequest, parts: readonly string[]): Promise<NodeResponse> => {
  const uoi = parts[1];
  const box = parts[2];
  if (uoi === undefined || parts.length > 3) return json(404, { error: 'not found' });
  const entry = deps.governance.entry(uoi);
  if (entry === undefined || !(await isLocalTenant(deps, uoi))) return json(404, { error: 'not found', reason: `${uoi} is not a tenant this node acts for` });
  if (box === undefined) return req.method === 'GET' ? actorDocument(entry) : methodNotAllowed('GET');
  if (box === 'inbox') return req.method === 'POST' ? inbox(deps, entry, req.body) : methodNotAllowed('POST');
  if (box === 'outbox') return req.method === 'GET' ? outbox(deps, entry, req.query) : methodNotAllowed('GET');
  return json(404, { error: 'not found' });
};

/**
 * The actor, section 2.10's identity on the wire. The Ed25519 public key is
 * not on it: `publicKey` is W3C security vocabulary, not Activity Streams, and
 * section 2.2 forbids custom terms. A verifier takes the key from the
 * governance feed (sections 2.8 and 2.10), which this node serves at the `url`
 * below. Where HTTP Signatures are introduced for a public network, that is
 * also the key they would be checked against.
 */
const actorDocument = (entry: ResolverEntry): NodeResponse => {
  const base = apiBaseOf(entry.actor);
  return as2({
    '@context': AS2,
    id: entry.actor,
    // A resolver's identity is its organization (section 2.10); `Service` would describe the software instead.
    type: 'Organization',
    preferredUsername: entry.uoi,
    name: entry.uoiUrn,
    inbox: `${entry.actor}/inbox`,
    outbox: `${entry.actor}/outbox`,
    ...(base === undefined ? {} : { url: { type: 'Link', href: `${base}/governance`, mediaType: 'application/json' } }),
  });
};

const inbox = async (deps: RouteDeps, entry: ResolverEntry, body: unknown): Promise<NodeResponse> => {
  // SEAM: a request signature check would go here, before the body is read. On a public network an
  // HTTP Signature (RFC 9421 or the draft-cavage form ActivityPub servers use) over the request,
  // verified against the sending organization's certified Ed25519 key on the governance feed, would
  // establish who posted this. The pilot authenticates peers by prearranged bearer token instead
  // (section 2.11, "access to the network MUST be authenticated"), and the gate in routes.ts has
  // already applied it. Not built, by decision.
  if (deps.peers === undefined) {
    return json(501, { error: 'no-peer-transport', reason: 'this node federates in process and has no HTTP peer transport, so it cannot read the subset behind a broadcast or reply into a remote thread; configure peers (ULI_PEER_TOKENS) to federate over HTTP' });
  }
  if (!isRecord(body)) return json(400, { error: 'invalid', reason: 'an Activity Streams activity is required' });
  const impure = purity(body);
  if (impure.length > 0) return json(400, { error: 'invalid', reason: `activity carries non-AS2 terms: ${impure.join(', ')} (section 2.2)` });

  // Server-to-server delivery wraps an object in a Create (section 2.12.1); the thread is made of the objects.
  const object = body['type'] === 'Create' && isRecord(body['object']) ? body['object'] : body;
  const attributedTo = str(object['attributedTo']) ?? str(body['actor']);
  const sender = deps.governance.resolvers().find((r) => r.actor === attributedTo);
  if (sender === undefined) return json(403, { error: 'not-in-pool', reason: `${attributedTo ?? '(no actor)'} is not a certified resolver on this node's governance feed (section 2.10)` });
  if (!deps.governance.pool().includes(sender.uoi)) return json(403, { error: 'not-in-pool', reason: `${sender.uoi} is not certified, compliant and active (section 2.10)` });
  if (sender.uoi === entry.uoi) return json(400, { error: 'invalid', reason: 'a tenant does not post to its own inbox' });

  const content = str(object['content']);
  if (object['type'] === 'Note' && content === CONTENT.request) return receiveBroadcast(deps, entry, sender, object);
  if (object['type'] === 'Note' && (content === CONTENT.noMatch || content === CONTENT.matchesFound)) return receiveReply(deps, entry, sender, object);
  if (object['type'] === 'Tombstone' || (object['type'] === 'Note' && str(object['inReplyTo']) !== undefined)) return keep(deps, entry, object);
  return json(422, { error: 'invalid', reason: `${String(object['type'])} "${content ?? ''}" is not an RCP-54 thread activity (section 2.12)` });
};

/**
 * A broadcast for one of this node's tenants: the inbound half of section 2.5,
 * done the way `resolverReply` does it in process.
 */
const receiveBroadcast = async (deps: RouteDeps, entry: ResolverEntry, sender: ResolverEntry, object: Readonly<Record<string, unknown>>): Promise<NodeResponse> => {
  const peers = deps.peers;
  if (peers === undefined) return json(501, { error: 'no-peer-transport' });
  const id = str(object['id']);
  // A decline rebroadcast replies to its root (section 2.7); the first round is the root.
  const root = str(object['inReplyTo']) ?? id;
  if (root === undefined) return json(422, { error: 'invalid', reason: 'a broadcast carries an id; replies reference it (section 2.12.1)' });
  const link = hrefOf(object);
  if (link === undefined) return json(422, { error: 'invalid', reason: 'a broadcast references the licensee subset by an OAuth2-protected link (section 2.4)' });
  const round = roundOf(id);
  const threadId = root.split('/').at(-1) ?? root;

  const fetched = await peers.fetch(link, sender);
  if (!fetched.ok) {
    // Section 2.1 makes reading the subset a prearranged grant, and says the originator must grant
    // enough resolvers to reach consensus. It does not say what a resolver that was not granted
    // access answers. This node answers nothing in the thread, because a No Match would claim a
    // search that did not happen, and it reports the refusal here so the originator's delivery log
    // carries the reason.
    return json(422, { error: 'not-authorized-to-read', reason: `could not read the licensee subset at ${link} (${fetched.error ?? `HTTP ${fetched.status}`}); section 2.1 makes that access prearranged and this resolver was not granted it, so it did not search and does not reply; RCP-54 does not define what an unauthorized recipient answers` });
  }
  const check = checkMemberPayload(fetched.body);
  if (!check.ok) return json(422, { error: 'invalid', reason: `the payload behind ${link} is not an RCF Member payload: ${check.problems.join('; ')} (section 2.3)` });
  const criteria = (fetched.body as RcfPayload).value[0] ?? {};
  await deps.stores.activities.put(entry.uoi, 'inbox', { '@context': AS2, ...object } as Activity);

  // The same selection resolverReply makes: a match needs a candidate over threshold that carries a
  // ULI to offer (section 2.5). A merge broadcast would exclude the ULIs being retired (section
  // 2.7), but nothing in the Note carries that list (section 2.12.4), so no exclusion is applied.
  const search = await deps.hub.search(entry.uoi, criteria);
  const offerable = search.hits.find((h) => h.result.band === 'possible match' && h.uli !== undefined);
  const noteId = `${entry.actor}/notes/${newActivityId()}`;
  const published = now();
  const base = apiBaseOf(entry.actor) ?? entry.actor;
  const reply =
    offerable === undefined || offerable.uli === undefined
      ? noMatchReply({ id: noteId, actor: entry.actor, inReplyTo: root, published })
      : await (async () => {
          const doc = await deps.stores.members.get(offerable._id);
          const key = `thread:${threadId}:reply:${entry.uoi}:${round}`;
          await deps.stores.payloads.put(key, resolutionPayload(offerable.uli as string, offerable.result.score, offerable._source, doc?.ddVersion));
          const href = `${base}/rcf/thread/${encodeURIComponent(threadId)}/reply/${encodeURIComponent(entry.uoi)}/${round}`;
          return matchReply({ id: noteId, actor: entry.actor, inReplyTo: root, published, href });
        })();
  await deps.stores.activities.put(entry.uoi, 'outbox', reply);

  // Back through the originator's inbox. Synchronous here, so the originator's broadcast returns with
  // this reply tallied; the production shape is a queue in front of this step.
  const envelope = create({ id: `${entry.actor}/activities/${newActivityId()}`, actor: entry.actor, object: withoutContext(reply), to: [sender.actor], published });
  const delivery = await peers.post(sender, envelope, { threadId });
  const replied = reply['content'] === CONTENT.noMatch ? 'no-match' : 'match';
  if (!delivery.ok) {
    return json(502, { error: 'reply-not-delivered', reason: `replied ${replied} as ${noteId} but the originator's inbox did not accept it (${delivery.error ?? `HTTP ${delivery.status}`})`, replied, reply: noteId });
  }
  return json(200, { ok: true, replied, reply: noteId, delivery: { ok: true, status: delivery.status } });
};

/** A reply into a thread this tenant originated: recorded with the guards `resolverReply` applies, then tallied by the hub. */
const receiveReply = async (deps: RouteDeps, entry: ResolverEntry, sender: ResolverEntry, object: Readonly<Record<string, unknown>>): Promise<NodeResponse> => {
  const peers = deps.peers;
  if (peers === undefined) return json(501, { error: 'no-peer-transport' });
  const root = str(object['inReplyTo']);
  if (root === undefined) return json(422, { error: 'invalid', reason: 'a reply carries inReplyTo, the thread root it answers (section 2.12.1)' });
  const thread = (await deps.stores.threads.list(entry.uoi)).find((t) => t.rootId === root);
  if (thread === undefined) return json(404, { error: 'thread-not-found', reason: `${entry.uoi} originated no thread rooted at ${root}` });
  if (!thread.pool.includes(sender.uoi)) return json(403, { error: 'not-in-pool', reason: `${sender.uoi} is not in this thread's pinned pool (section 2.6)` });
  if (sender.uoi === thread.originator) return json(400, { error: 'invalid', reason: 'the originator does not reply to its own broadcast' });
  const prior = thread.replies.find((r) => r.resolver === sender.uoi);
  if (prior !== undefined) return json(200, { ok: true, recorded: false, thread: thread.id, reply: prior, reason: 'a reply is recorded once per resolver' });

  const content = str(object['content']);
  const published = str(object['published']);
  const id = str(object['id']);
  const resolved: { readonly reply: Reply; readonly activity: Activity } | NodeResponse = await (async () => {
    if (content === CONTENT.noMatch) {
      return { reply: { resolver: sender.uoi, kind: 'no-match' } as const, activity: noMatchReply({ id, actor: sender.actor, inReplyTo: root, published }) };
    }
    const link = hrefOf(object);
    if (link === undefined) return json(422, { error: 'invalid', reason: 'a match reply links to its resolution payload; the score rides there (section 2.5)' });
    const fetched = await peers.fetch(link, sender);
    if (!fetched.ok) return json(422, { error: 'invalid', reason: `could not read the resolution payload at ${link} (${fetched.error ?? `HTTP ${fetched.status}`}); a match whose score cannot be read cannot be ranked (section 2.5)` });
    const payload = isRecord(fetched.body) ? fetched.body : {};
    const uli = str(payload['uli']);
    const score = payload['score'];
    if (uli === undefined || typeof score !== 'number') return json(422, { error: 'invalid', reason: 'a resolution payload carries uli and score (section 2.12.2)' });
    const parsed = parseUli(uli);
    if (!parsed.ok) return json(422, { error: 'invalid', reason: `the offered ULI does not parse: ${parsed.reason} (section 2.8)` });
    if (thread.excludeUlis.includes(uli)) {
      // The hub refuses the same offer from a local resolver. Over the wire the exclusion never
      // reached the replier: section 2.12.4's broadcast Note is identical to section 2.12.1's.
      return json(400, { error: 'invalid', reason: `${uli} is excluded from this thread's matching (section 2.7); the exclusion does not travel in the broadcast Note (section 2.12.4), so the resolver could not have known it` });
    }
    return { reply: { resolver: sender.uoi, kind: 'match', uli, score } as const, activity: matchReply({ id, actor: sender.actor, inReplyTo: root, published, href: link }) };
  })();
  if ('status' in resolved) return resolved;

  const updated = { ...thread, replies: [...thread.replies, resolved.reply], activities: [...thread.activities, resolved.activity], updatedAt: now() };
  await deps.stores.threads.put(updated);
  await deps.stores.activities.put(entry.uoi, 'inbox', resolved.activity);
  const t = await deps.hub.tally(thread.id);
  return json(200, {
    ok: true,
    recorded: true,
    thread: thread.id,
    reply: resolved.reply,
    ...(t.ok ? { tally: { replied: t.value.tally.replied, needed: t.value.tally.needed, reached: t.value.tally.reached, outcome: t.value.tally.outcome } } : {}),
  });
};

/**
 * A thread message this node has no state for: a Create posting a minted ULI,
 * or a Tombstone, in a thread another node originated. It is kept in the
 * tenant's inbox and nothing is done with it. Acting on it (relinking records
 * on a redirect, section 2.7) is not built.
 */
const keep = async (deps: RouteDeps, entry: ResolverEntry, object: Readonly<Record<string, unknown>>): Promise<NodeResponse> => {
  await deps.stores.activities.put(entry.uoi, 'inbox', { '@context': AS2, ...object } as Activity);
  return json(202, { accepted: true, kept: 'inbox', reason: 'this node keeps no state for threads it did not originate; the activity is kept in the inbox and not acted on' });
};

const publishedOf = (a: Activity): string => str(a['published']) ?? str(a['deleted']) ?? '';

/**
 * The tenant's activities: the ones the hub wrote into thread records on this
 * node, attributed to this actor, and the ones sent into other nodes' threads.
 * A derived view, so the hub's records stay the single source for its own.
 */
const outbox = async (deps: RouteDeps, entry: ResolverEntry, query: Readonly<Record<string, string>>): Promise<NodeResponse> => {
  const own = (await deps.stores.threads.list()).flatMap((t) => t.activities).filter((a) => a['attributedTo'] === entry.actor || a['actor'] === entry.actor);
  const sent = await deps.stores.activities.list(entry.uoi, 'outbox');
  const seen = new Set<string>();
  const all = [...own, ...sent]
    .filter((a) => {
      const id = str(a['id']);
      if (id === undefined) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((a, b) => (publishedOf(a) < publishedOf(b) ? 1 : publishedOf(a) > publishedOf(b) ? -1 : 0));
  const url = `${entry.actor}/outbox`;
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  if (query['page'] === undefined) {
    return as2({ '@context': AS2, id: url, type: 'OrderedCollection', totalItems: all.length, first: `${url}?page=1`, last: `${url}?page=${pages}` });
  }
  const page = Number(query['page']);
  if (!Number.isInteger(page) || page < 1) return json(400, { error: 'invalid', reason: 'page is a positive integer' });
  return as2({
    '@context': AS2,
    id: `${url}?page=${page}`,
    type: 'OrderedCollectionPage',
    partOf: url,
    orderedItems: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    ...(page > 1 ? { prev: `${url}?page=${page - 1}` } : {}),
    ...(page < pages ? { next: `${url}?page=${page + 1}` } : {}),
  });
};
