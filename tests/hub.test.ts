import { beforeEach, describe, expect, it } from 'vitest';
import { toMemberDoc } from '../src/ingest/record.js';
import { localFederation } from '../src/node/federation.js';
import { localGovernance, memorySigner, type ResolverEntry, uoiUrn } from '../src/node/governance.js';
import { createHub, type Hub, pairId } from '../src/node/hub.js';
import { memoryStores } from '../src/node/store-memory.js';
import type { Stores } from '../src/node/store.js';
import { conformance } from '../src/sdk/activities.js';
import { generateKeyPair } from '../src/sdk/uli.js';
import { CHEN_JR_CLONED, CHEN_JR_CORRECTED, CHEN_SR, JANE_P1, JANE_P8, SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

/**
 * The operations, over the in-memory stores, with the local federation
 * delivering. The cast: P1 originates; P8 holds Jane under a ULI it minted
 * earlier; P2 holds nothing; P5 holds Sr. Each `describe` names the
 * specification flow it executes.
 */

const ORIGIN = 'http://node.test';
const P1 = 'M00000123';
const P2 = 'M00000222';
const P5 = 'M00000555';
const P8 = 'M00000888';

const keys = Object.fromEntries([P1, P2, P5, P8].map((u) => [u, generateKeyPair()]));
const entry = (uoi: string): ResolverEntry => ({
  uoi,
  uoiUrn: uoiUrn(uoi),
  actor: `${ORIGIN}/actors/${uoi}`,
  publicKeys: [keys[uoi].publicKey],
  status: 'active',
  certified: true,
});

let stores: Stores;
let hub: Hub;
let counter: number;
const ids = (): string => `${String((counter += 1)).padStart(4, '0')}`;

const governance = () => localGovernance({ resolvers: [P1, P2, P5, P8].map(entry) });
const signer = memorySigner(Object.fromEntries(Object.entries(keys).map(([u, k]) => [u, k.privateKeyPem])));

/** P8's Jane already carries a ULI P8 minted; everyone else is unresolved. */
const seed = async (): Promise<string> => {
  const p8Uli = `urn:reso:uli:1.0:${uoiUrn(P8)}:9f2c2b6e4f1a:${'A'.repeat(86)}`;
  await stores.members.put([
    toMemberDoc(JANE_P1, { uoi: P1 }),
    toMemberDoc(SEED_A1, { uoi: P1 }),
    toMemberDoc({ ...JANE_P8, UniqueLicenseeIdentifier: p8Uli }, { uoi: P8 }),
    toMemberDoc(CHEN_SR, { uoi: P5 }),
    toMemberDoc(SEED_B1, { uoi: P2 }),
    toMemberDoc(SEED_B2, { uoi: P2 }),
  ]);
  return p8Uli;
};

let p8Uli: string;

beforeEach(async () => {
  counter = 0;
  stores = memoryStores();
  hub = createHub({ stores, governance: governance(), signer, origin: ORIGIN, ids, now: () => '2026-10-12T00:00:00Z' });
  p8Uli = await seed();
});

describe('search, local first (section 2.4)', () => {
  it('scores candidates in the tenant and reports identifiability', async () => {
    const r = await hub.search(P2, SEED_A1);
    expect(r.threshold).toBe(1250);
    expect(r.identifiability.identifiable).toBe(true);
    expect(r.hits.map((h) => [h._id, h.result.band])).toEqual([
      [`${P2}:B2002`, 'possible match'],
      [`${P2}:B2003`, 'rejected'],
    ]);
    expect(r.hits[0]._source).not.toHaveProperty('blockKey');
    expect(r.hits[0].fieldAgreements.MemberNationalAssociationId).toBe(true);
  });

  it('never reaches across tenants', async () => {
    const r = await hub.search(P1, SEED_B1);
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits.every((h) => h.uoi === P1)).toBe(true);
    expect(r.hits[0]._id).toBe(`${P1}:A1001`);
    expect(r.hits.map((h) => h._id)).not.toContain(`${P2}:B2002`);
  });
});

describe('section 2.12.1: new ULI, no match found', () => {
  it('broadcasts, collects no-match replies, reaches consensus and mints a verifiable ULI', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const thread = b.value;
    expect(thread.pool).toEqual([P1, P2, P5, P8]);
    expect(thread.activities[0].content).toBe('ULI Resolution Request');
    expect(thread.activities[0].to).toEqual(['https://reso.org/resolvers']);
    expect(JSON.stringify(thread.activities[0])).not.toMatch(/Smith/);

    const delivered = await localFederation(hub).deliver(thread);
    expect(delivered.replies.map((r) => [r.resolver, r.kind])).toEqual([
      [P2, 'match'],
      [P5, 'no-match'],
      [P8, 'no-match'],
    ].map(([r, k]) => [r, r === P2 ? 'no-match' : k]));
  });

  it('P2 holds John Smith as B-1 but without a ULI, so it has nothing to offer and replies no match', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    const r = await hub.resolverReply(b.value.id, P2);
    expect(r.ok && r.value.reply.kind).toBe('no-match');
  });

  it('mints only after consensus, never unilaterally (section 2.4)', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    const early = await hub.mint(b.value.id);
    expect(early.ok).toBe(false);
    if (!early.ok) expect(early.code).toBe('consensus-not-reached');

    await localFederation(hub).deliver(b.value);
    const t = await hub.tally(b.value.id);
    expect(t.ok && t.value.tally).toMatchObject({ r: 4, needed: 2, replied: 3, reached: true, outcome: 'mint' });

    const m = await hub.mint(b.value.id);
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(hub.verify(m.value.uli).ok).toBe(true);
    expect(hub.verify(m.value.uli).uoi).toBe(uoiUrn(P1));
    expect((await stores.members.get(`${P1}:A1001`))?.uli).toBe(m.value.uli);
    const created = m.value.thread.activities.at(-1);
    expect(created?.type).toBe('Create');
    expect(m.value.thread.status).toBe('minted');
    expect((await hub.outcomes(P1)).map((o) => o.kind)).toEqual(['mint']);
    expect(conformance(m.value.thread.activities).pureAS2).toBe(true);
  });

  it('section 2.12.3: a late match lands in the thread after the Create, and the holder supersedes its mint', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A0001` });
    if (!b.ok) throw new Error(b.reason);
    // P2 and P5 reply; P8, which holds Jane, is slow. Two of four is the floor, so the mint goes ahead.
    await hub.resolverReply(b.value.id, P2);
    await hub.resolverReply(b.value.id, P5);
    const m = await hub.mint(b.value.id);
    expect(m.ok).toBe(true);
    if (!m.ok) return;

    const late = await hub.resolverReply(b.value.id, P8);
    expect(late.ok && late.value.reply).toMatchObject({ kind: 'match', uli: p8Uli, score: 2905 });
    expect(late.ok && late.value.thread.activities.map((a) => a.type)).toEqual(['Note', 'Note', 'Note', 'Create', 'Note']);
    const t = await hub.tally(b.value.id);
    expect(t.ok && t.value.tally.matches.map((x) => x.uli)).toEqual([p8Uli]);
    expect(t.ok && t.value.thread.status).toBe('minted');

    const s = await hub.supersede({ holder: P1, retiredUli: m.value.uli, successorUli: p8Uli, successorScore: 2905 });
    expect(s.ok && s.value.relinked).toBe(1);
    expect((await stores.members.get(`${P1}:A0001`))?.uli).toBe(p8Uli);
    const tomb = (await hub.thread(b.value.id))?.activities.at(-1);
    expect(tomb).toMatchObject({ type: 'Tombstone', id: m.value.thread.createdNoteId, url: { href: p8Uli } });
  });

  it('refuses a second mint on a closed thread', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    await localFederation(hub).deliver(b.value);
    await hub.mint(b.value.id);
    const again = await hub.mint(b.value.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('thread-closed');
  });
});

describe('section 2.12.2: existing ULI found and adopted', () => {
  it('P8 replies with its ULI and the score behind the link, and the originator adopts silently', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A0001` });
    if (!b.ok) throw new Error(b.reason);
    const delivered = await localFederation(hub).deliver(b.value);
    const match = delivered.replies.find((r) => r.kind === 'match');
    expect(match).toMatchObject({ resolver: P8, uli: p8Uli, score: 2905 });
    const reply = delivered.activities.find((a) => a.content === 'Matches Found');
    expect(JSON.stringify(reply)).not.toMatch(/2905/);
    const payload = await hub.payload(`thread:${b.value.id}:reply:${P8}:1`);
    expect(payload).toMatchObject({ uli: p8Uli, score: 2905 });

    const wrong = await hub.mint(b.value.id);
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.code).toBe('wrong-outcome');

    const before = delivered.activities.length;
    const a = await hub.adopt(b.value.id);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.value.uli).toBe(p8Uli);
    expect(a.value.thread.activities).toHaveLength(before);
    expect((await stores.members.get(`${P1}:A0001`))?.uli).toBe(p8Uli);
    expect((await hub.outcomes(P1))[0]).toMatchObject({ kind: 'adopt', uli: p8Uli, score: 2905 });
  });

  it('a manual reply refuses a candidate below the threshold (section 2.5)', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    await stores.members.bindUli(`${P2}:B2003`, 'urn:reso:uli:1.0:urn:reso:uoi:1.0:T00000012:M00000222:n:s');
    const r = await hub.reply(b.value.id, P2, `${P2}:B2003`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('below-threshold');
  });

  it('a manual reply refuses a candidate with no ULI to offer', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    const r = await hub.reply(b.value.id, P2, `${P2}:B2002`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('no-uli-to-offer');
  });
});

describe('section 2.12.5: match found but declined on review', () => {
  it('the decline is a rebroadcast of corrected criteria in the same thread, and the corrected round mints', async () => {
    await stores.members.bindUli(`${P5}:${(await stores.members.list(P5))[0].recordKey.split(':')[1]}`, `urn:reso:uli:1.0:${uoiUrn(P5)}:a1b27c5d4a8e:${'B'.repeat(86)}`);
    const b = await hub.broadcast({ originator: P1, record: CHEN_JR_CLONED });
    if (!b.ok) throw new Error(b.reason);
    const round1 = await localFederation(hub).deliver(b.value);
    const t1 = await hub.tally(round1.id);
    expect(t1.ok && t1.value.tally.outcome).toBe('adopt');

    const d = await hub.decline(round1.id, CHEN_JR_CORRECTED);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.value.round).toBe(2);
    expect(d.value.replies).toEqual([]);
    expect(d.value.activities.at(-1)).toMatchObject({ type: 'Note', content: 'ULI Resolution Request', inReplyTo: round1.rootId });
    expect((await hub.outcomes(P1))[0]).toMatchObject({ kind: 'decline' });

    const round2 = await localFederation(hub).deliver(d.value);
    const t2 = await hub.tally(round2.id);
    expect(t2.ok && t2.value.tally.outcome).toBe('mint');
    const m = await hub.mint(round2.id);
    expect(m.ok).toBe(true);
  });
});

describe('section 2.7: tombstone and redirect by a holder', () => {
  it('relinks records bound to the retired ULI and posts the tombstone into the minting thread', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    await localFederation(hub).deliver(b.value);
    const m = await hub.mint(b.value.id);
    if (!m.ok) throw new Error(m.reason);
    const s = await hub.supersede({ holder: P1, retiredUli: m.value.uli, successorUli: p8Uli, successorScore: 1510 });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.value.relinked).toBe(1);
    expect(s.value.activity).toMatchObject({ type: 'Tombstone', id: m.value.thread.createdNoteId, content: `ULI Retired: ${m.value.uli}`, url: { type: 'Link', href: p8Uli } });
    expect((await stores.members.get(`${P1}:A1001`))?.uli).toBe(p8Uli);
  });

  it('only a holder may issue it, and only over a match that clears the threshold', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    await localFederation(hub).deliver(b.value);
    const m = await hub.mint(b.value.id);
    if (!m.ok) throw new Error(m.reason);
    const stranger = await hub.supersede({ holder: P2, retiredUli: m.value.uli, successorUli: p8Uli, successorScore: 1510 });
    expect(!stranger.ok && stranger.code).toBe('not-a-holder');
    const weak = await hub.supersede({ holder: P1, retiredUli: m.value.uli, successorUli: p8Uli, successorScore: 900 });
    expect(!weak.ok && weak.code).toBe('below-threshold');
  });
});

describe('the gates', () => {
  it('a broadcast refuses an under-identified record (section 2.4)', async () => {
    const b = await hub.broadcast({ originator: P1, record: { MemberFullName: 'John Smith' } });
    expect(b.ok).toBe(false);
    if (!b.ok) {
      expect(b.code).toBe('not-identifiable');
      expect(b.reason).toMatch(/only 1 primary identifier/);
    }
  });

  it('a broadcast refuses an originator outside R', async () => {
    const b = await hub.broadcast({ originator: 'M00000999', record: JANE_P1 });
    expect(!b.ok && b.code).toBe('not-in-pool');
  });

  it('a mandatory resolver blocks consensus until it replies (section 2.6)', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001`, mandatory: [P8] });
    if (!b.ok) throw new Error(b.reason);
    expect(b.value.activities[0].tag).toEqual([{ type: 'Mention', href: `${ORIGIN}/actors/${P8}` }]);
    await hub.resolverReply(b.value.id, P2);
    await hub.resolverReply(b.value.id, P5);
    const t = await hub.tally(b.value.id);
    expect(t.ok && t.value.tally).toMatchObject({ replied: 2, needed: 2, reached: false, mandatoryMissing: [P8] });
    await hub.resolverReply(b.value.id, P8);
    const t2 = await hub.tally(b.value.id);
    expect(t2.ok && t2.value.tally.reached).toBe(true);
  });

  it('R is pinned at broadcast: a resolver joining later does not change the thread', async () => {
    const g = governance();
    const h = createHub({ stores, governance: g, signer, origin: ORIGIN, ids });
    const b = await h.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    g.register({ ...entry(P2), uoi: 'M00000777', uoiUrn: uoiUrn('M00000777'), publicKeys: [generateKeyPair().publicKey] });
    expect(b.value.pool).toHaveLength(4);
    expect(g.pool()).toHaveLength(5);
    const r = await h.resolverReply(b.value.id, 'M00000777');
    expect(!r.ok && r.code).toBe('not-in-pool');
  });

  it('a reply is recorded once per resolver', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    await hub.resolverReply(b.value.id, P2);
    const again = await hub.resolverReply(b.value.id, P2);
    expect(again.ok && again.value.thread.replies).toHaveLength(1);
  });

  it('the originator does not reply to itself', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    expect((await hub.resolverReply(b.value.id, P1)).ok).toBe(false);
  });

  it('a merge broadcast excludes the ULIs being retired from matching (section 2.7)', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A0001`, excludeUlis: [p8Uli] });
    if (!b.ok) throw new Error(b.reason);
    const r = await hub.resolverReply(b.value.id, P8);
    expect(r.ok && r.value.reply.kind).toBe('no-match');
  });
});

describe('the dashboard and internal resolution', () => {
  beforeEach(async () => {
    await stores.members.put([toMemberDoc({ ...SEED_B1, MemberMlsId: 'B2099' }, { uoi: P2 })]);
  });

  it('lists the pairs inside one tenant that need resolution, highest score first', async () => {
    const d = await hub.dashboard(P2);
    expect(d.reports.records).toBe(3);
    expect(d.newMatchesCount).toBe(1);
    expect(d.actionItems).toHaveLength(1);
    expect(d.actionItems[0]).toMatchObject({ id: pairId(`${P2}:B2002`, `${P2}:B2099`), type: 'resolve', band: 'possible match' });
  });

  it('a conflict shows both records with the score broken down', async () => {
    const c = await hub.conflict(P2, pairId(`${P2}:B2002`, `${P2}:B2099`));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.value.result.breakdown.map((e) => e.factor)).toContain('NRDS');
    expect(c.value.reason).toMatch(/possible match at/);
    expect((await hub.conflict(P1, c.value.id)).ok).toBe(false);
  });

  it('resolving as different records a labeled outcome and clears the item', async () => {
    const id = pairId(`${P2}:B2002`, `${P2}:B2099`);
    const r = await hub.resolveConflict(P2, id, 'different');
    expect(r.ok && r.value.outcome.kind).toBe('local-different');
    expect((await hub.dashboard(P2)).actionItems).toHaveLength(0);
  });

  it('resolving as the same licensee broadcasts the combined record', async () => {
    const id = pairId(`${P2}:B2002`, `${P2}:B2099`);
    const r = await hub.resolveConflict(P2, id, 'same');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.outcome.kind).toBe('local-same');
    expect(r.value.thread?.originator).toBe(P2);
    expect(r.value.thread?.criteria.MemberNationalAssociationId).toBe('012345687');
  });

  it('resolving as the same licensee binds locally when one record already holds a ULI', async () => {
    await stores.members.bindUli(`${P2}:B2099`, p8Uli);
    const id = pairId(`${P2}:B2002`, `${P2}:B2099`);
    const r = await hub.resolveConflict(P2, id, 'same');
    expect(r.ok && r.value.thread).toBeUndefined();
    expect((await stores.members.get(`${P2}:B2002`))?.uli).toBe(p8Uli);
  });

  it('two different ULIs on one person is a merge, which the node names rather than improvises', async () => {
    await stores.members.bindUli(`${P2}:B2099`, p8Uli);
    await stores.members.bindUli(`${P2}:B2002`, `urn:reso:uli:1.0:${uoiUrn(P2)}:zzzz:${'C'.repeat(86)}`);
    const r = await hub.resolveConflict(P2, pairId(`${P2}:B2002`, `${P2}:B2099`), 'same');
    expect(!r.ok && r.code).toBe('merge-required');
  });
});
