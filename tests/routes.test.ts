import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, listen } from '../src/adapters/express.js';
import { toMemberDoc } from '../src/ingest/record.js';
import { localFederation } from '../src/node/federation.js';
import { localGovernance, memorySigner, uoiUrn } from '../src/node/governance.js';
import { createHub, type Hub, pairId } from '../src/node/hub.js';
import { memoryStores } from '../src/node/store-memory.js';
import type { Stores } from '../src/node/store.js';
import { generateKeyPair } from '../src/sdk/uli.js';
import { JANE_P1, JANE_P8, SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

/**
 * The Express adapter, over a real socket. The protocol checks that are about
 * a status code or a header (section 2.11's refusal of an unauthenticated
 * dereference) can only be observed over the wire, so they are tested here and
 * nowhere else.
 */

const P1 = 'M00000001';
const P2 = 'M00000002';
const P8 = 'M00000888';
const TOKEN = 'tok-resolver';
const keys = Object.fromEntries([P1, P2, P8].map((u) => [u, generateKeyPair()]));
const P8_ULI = `urn:reso:uli:1.0:${uoiUrn(P8)}:9f2c2b6e4f1a:${'A'.repeat(86)}`;

let stores: Stores;
let hub: Hub;
let governance: ReturnType<typeof localGovernance>;
let base: string;
let stop: () => Promise<void>;

const api = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, unknown>; headers: Headers }> => {
  const res = await fetch(`${base}/uli-service/v1${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': typeof body === 'string' ? 'text/csv' : 'application/json' }), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text === '' ? {} : (JSON.parse(text) as Record<string, unknown>), headers: res.headers };
};

beforeEach(async () => {
  stores = memoryStores([
    toMemberDoc(SEED_A1, { uoi: P1 }),
    toMemberDoc(JANE_P1, { uoi: P1 }),
    toMemberDoc(SEED_B1, { uoi: P2 }),
    toMemberDoc(SEED_B2, { uoi: P2 }),
    toMemberDoc({ ...JANE_P8, UniqueLicenseeIdentifier: P8_ULI }, { uoi: P8 }),
  ]);
  governance = localGovernance({
    resolvers: [P1, P2, P8].map((uoi) => ({ uoi, uoiUrn: uoiUrn(uoi), actor: `http://node.test/actors/${uoi}`, publicKeys: [keys[uoi].publicKey], status: 'active' as const, certified: true })),
  });
  hub = createHub({ stores, governance, signer: memorySigner(Object.fromEntries(Object.entries(keys).map(([u, k]) => [u, k.privateKeyPem]))), origin: 'http://node.test' });
  const app = createApp({ hub, stores, governance, federation: localFederation(hub), auth: { allows: (b) => b === TOKEN, guardsOperations: false }, nodeUoi: P1 });
  const started = await listen(app, 0);
  base = started.url;
  stop = started.close;
});

afterEach(async () => {
  await stop();
});

describe('the node API', () => {
  it('reports health with the derived threshold and the pool', async () => {
    const r = await api('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, node: P1, threshold: 1250, pool: [P1, P2, P8] });
  });

  it('search returns scored hits in the shape the client reads, with no percentage anywhere', async () => {
    const r = await api('POST', '/search', { record: SEED_A1, uoi: P2 });
    expect(r.status).toBe(200);
    const hits = r.body.hits as readonly Record<string, unknown>[];
    expect(hits[0]).toMatchObject({ _id: `${P2}:B2002` });
    expect((hits[0].result as Record<string, unknown>).score).toBe(1510);
    expect(JSON.stringify(r.body)).not.toMatch(/confidence|%/);
  });

  it('the oracle endpoint scores a pair', async () => {
    const r = await api('POST', '/score', { a: JANE_P1, b: JANE_P8 });
    expect(r.body).toMatchObject({ score: 2905, band: 'possible match', threshold: 1250 });
  });

  it('broadcast delivers locally and returns the tally', async () => {
    const r = await api('POST', '/broadcast', { recordKey: `${P1}:A1001` });
    expect(r.status).toBe(200);
    expect(r.body.tally).toMatchObject({ r: 3, needed: 2, replied: 2, reached: true, outcome: 'mint' });
    const thread = r.body.thread as Record<string, unknown>;
    expect(thread.status).toBe('consensus');
  });

  it('broadcast without a record or a recordKey is refused with 400, never a 500', async () => {
    // Found by standing the container up and sending the wrong field name. The route passed
    // `record: undefined` through to the subset, which threw, and the framework answered with an
    // HTML 500. A caller who addressed us wrongly is owed a reason, not a stack trace.
    const r = await api('POST', '/broadcast', { criteria: { MemberFullName: 'Dana Alvarez' } });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('invalid');
    expect(r.body.reason).toContain('recordKey');
  });

  it('an unexpected throw answers in JSON, not the framework HTML error page', async () => {
    // The whole surface is JSON. A client that parses every response must not meet HTML on the one
    // status it did not plan for. The real hub is reused with one method replaced, so this exercises
    // the adapter's boundary and nothing else.
    const broken = {
      ...hub,
      parameters: () => {
        throw new Error('index unavailable');
      },
    };
    const app = createApp({ hub: broken, stores, governance, federation: localFederation(broken), auth: { allows: () => true, guardsOperations: false }, nodeUoi: P1 });
    const started = await listen(app, 0);
    try {
      const res = await fetch(`${started.url}/uli-service/v1/health`);
      expect(res.status).toBe(500);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(await res.json()).toMatchObject({ error: 'internal', reason: 'index unavailable' });
    } finally {
      await started.close();
    }
  });

  it('mint after consensus returns a ULI that verifies, and adopt is refused on a minted thread', async () => {
    const b = await api('POST', '/broadcast', { recordKey: `${P1}:A1001` });
    const id = (b.body.thread as { id: string }).id;
    const m = await api('POST', `/threads/${id}/mint`);
    expect(m.status).toBe(200);
    expect((m.body.verification as { ok: boolean }).ok).toBe(true);
    const a = await api('POST', `/threads/${id}/adopt`);
    expect(a.status).toBe(409);
    expect(a.body.error).toBe('thread-closed');
  });

  it('adopt on a match consensus binds the ULI and posts nothing', async () => {
    const b = await api('POST', '/broadcast', { recordKey: `${P1}:A0001` });
    expect(b.body.tally).toMatchObject({ outcome: 'adopt' });
    const id = (b.body.thread as { id: string }).id;
    const before = ((b.body.thread as { activities: unknown[] }).activities).length;
    const a = await api('POST', `/threads/${id}/adopt`);
    expect(a.status).toBe(200);
    expect(a.body.uli).toBe(P8_ULI);
    expect(((a.body.thread as { activities: unknown[] }).activities).length).toBe(before);
    expect((await stores.members.get(`${P1}:A0001`))?.uli).toBe(P8_ULI);
  });

  it('mint before consensus is refused with 409 and the reason', async () => {
    const b = await hub.broadcast({ originator: P1, recordKey: `${P1}:A1001` });
    if (!b.ok) throw new Error(b.reason);
    const m = await api('POST', `/threads/${b.value.id}/mint`);
    expect(m.status).toBe(409);
    expect(m.body.reason).toMatch(/never minted unilaterally/);
  });

  it('an under-identified broadcast is refused with 422', async () => {
    const r = await api('POST', '/broadcast', { record: { MemberFullName: 'John Smith' } });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe('not-identifiable');
  });

  it('the thread view carries a conformance report over its activities', async () => {
    const b = await api('POST', '/broadcast', { recordKey: `${P1}:A1001` });
    const id = (b.body.thread as { id: string }).id;
    const t = await api('GET', `/threads/${id}`);
    expect(t.body.conformance).toMatchObject({ pureAS2: true, contextCorrect: true, activities: 3 });
  });

  it('decline rebroadcasts and redelivers', async () => {
    const b = await api('POST', '/broadcast', { recordKey: `${P1}:A0001` });
    const id = (b.body.thread as { id: string }).id;
    // Corrected to a different person entirely: a changed NRDS and license alone would still match P8's Jane on name and nickname.
    const d = await api('POST', `/threads/${id}/decline`, { record: { ...JANE_P1, MemberFullName: 'Janet Smith', MemberFirstName: 'Janet', MemberNickname: 'Jay', MemberNationalAssociationId: '111222333', MemberStateLicense: 'SL000001' } });
    expect(d.status).toBe(200);
    expect(d.body.tally).toMatchObject({ outcome: 'mint' });
    expect((d.body.thread as { round: number }).round).toBe(2);
  });

  it('dashboard, conflict and resolve drive internal resolution', async () => {
    await stores.members.put([toMemberDoc({ ...SEED_B1, MemberMlsId: 'B2099' }, { uoi: P2 })]);
    const d = await api('GET', '/dashboard?uoi=' + P2);
    expect(d.body.newMatchesCount).toBe(1);
    const id = pairId(`${P2}:B2002`, `${P2}:B2099`);
    const c = await api('GET', `/conflicts/${encodeURIComponent(id)}?uoi=${P2}`);
    expect(c.status).toBe(200);
    expect((c.body.result as { band: string }).band).toBe('possible match');
    const r = await api('POST', `/conflicts/${encodeURIComponent(id)}/resolve`, { uoi: P2, resolution: 'same' });
    expect(r.status).toBe(200);
    expect(r.body.outcome).toMatchObject({ kind: 'local-same' });
    expect(r.body.tally).toMatchObject({ reached: true });
  });

  it('verify answers for any ULI', async () => {
    const r = await api('POST', '/verify', { uli: P8_ULI });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(false);
  });

  it('ingest accepts CSV and JSON', async () => {
    const csv = 'MemberFullName,MemberLastName,MemberStateLicense,MemberStateLicenseState,MemberMlsId\nAda Lovelace,Lovelace,L1,IN,Z1\n';
    const r = await api('POST', `/ingest?uoi=${P2}`, csv);
    expect(r.body).toMatchObject({ indexed: 1, skipped: 0 });
    const j = await api('POST', `/ingest?uoi=${P2}`, [{ MemberFullName: 'Grace Hopper', MemberMlsId: 'Z2' }]);
    expect(j.body).toMatchObject({ indexed: 1 });
    expect(await stores.members.count(P2)).toBe(4);
  });

  it('the bulk join is named as undefined by the specification, not improvised', async () => {
    const r = await api('POST', '/bulk-join');
    expect(r.status).toBe(400);
    expect(r.body.reason).toMatch(/not defined by RCP-54/);
  });

  it('an unknown route is 404', async () => {
    expect((await api('GET', '/nope')).status).toBe(404);
  });
});

describe('section 2.11: payload links refuse an unauthenticated dereference', () => {
  let threadId: string;
  beforeEach(async () => {
    const b = await api('POST', '/broadcast', { recordKey: `${P1}:A0001` });
    threadId = (b.body.thread as { id: string }).id;
  });

  it('401 with a challenge when no token is presented', async () => {
    const r = await api('GET', `/rcf/thread/${threadId}/request/1`);
    expect(r.status).toBe(401);
    expect(r.headers.get('www-authenticate')).toBe('Bearer realm="uli"');
  });

  it('403 for a token the node does not authorize', async () => {
    const r = await api('GET', `/rcf/thread/${threadId}/request/1`, undefined, { authorization: 'Bearer stranger' });
    expect(r.status).toBe(403);
  });

  it('serves the licensee subset as RCF to an authorized reader', async () => {
    const r = await api('GET', `/rcf/thread/${threadId}/request/1`, undefined, { authorization: `Bearer ${TOKEN}` });
    expect(r.status).toBe(200);
    expect(r.body['@reso.context']).toBe('urn:reso:metadata:2.1:resource:member');
    expect((r.body.value as unknown[])).toHaveLength(1);
  });

  it('serves the resolution payload with the score behind the link, never in the activity', async () => {
    const r = await api('GET', `/rcf/thread/${threadId}/reply/${P8}/1`, undefined, { authorization: `Bearer ${TOKEN}` });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ uli: P8_ULI, score: 2905 });
    const t = await api('GET', `/threads/${threadId}`);
    const reply = (t.body.thread as { activities: Record<string, unknown>[] }).activities.find((a) => a.content === 'Matches Found');
    expect(JSON.stringify(reply)).not.toMatch(/2905/);
    expect((reply?.url as { href: string }).href).toBe(`http://node.test/uli-service/v1/rcf/thread/${threadId}/reply/${P8}/1`);
  });

  it('404 for a payload that does not exist, and 405 for a write', async () => {
    expect((await api('GET', '/rcf/uli/nope', undefined, { authorization: `Bearer ${TOKEN}` })).status).toBe(404);
    expect((await api('POST', '/rcf/uli/nope', {}, { authorization: `Bearer ${TOKEN}` })).status).toBe(405);
  });
});
