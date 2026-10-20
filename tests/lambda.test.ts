import { describe, expect, it } from 'vitest';
import { apiHandlerWith, replyHandlerWith } from '../src/adapters/lambda.js';
import type { RouteDeps } from '../src/adapters/routes.js';
import { toMemberDoc } from '../src/ingest/record.js';
import { memoryQueue, queuedFederation } from '../src/node/federation.js';
import { localGovernance, memorySigner, uoiUrn } from '../src/node/governance.js';
import { createHub } from '../src/node/hub.js';
import { memoryStores } from '../src/node/store-memory.js';
import { generateKeyPair } from '../src/sdk/uli.js';
import { SEED_A1, SEED_B1 } from './fixtures.js';

/**
 * The Lambda adapter, invoked as API Gateway and SQS would invoke it, over
 * memory stores. No AWS service is touched: the queue is in memory and the
 * handler receives event shapes directly.
 */

const P1 = 'M00000001';
const P2 = 'M00000002';

const build = () => {
  const keys = { [P1]: generateKeyPair(), [P2]: generateKeyPair() };
  const stores = memoryStores([toMemberDoc(SEED_A1, { uoi: P1 }), toMemberDoc(SEED_B1, { uoi: P2 })]);
  const governance = localGovernance({
    resolvers: [P1, P2].map((uoi) => ({ uoi, uoiUrn: uoiUrn(uoi), actor: `https://uli.test/actors/${uoi}`, publicKeys: [keys[uoi].publicKey], status: 'active' as const, certified: true })),
  });
  const hub = createHub({ stores, governance, signer: memorySigner({ [P1]: keys[P1].privateKeyPem, [P2]: keys[P2].privateKeyPem }), origin: 'https://uli.test' });
  const queue = memoryQueue();
  const deps: RouteDeps = { hub, stores, governance, federation: queuedFederation(queue, hub), auth: { allows: (b) => b === 'tok', guardsOperations: true }, nodeUoi: P1 };
  return { api: apiHandlerWith({ deps, hub }), reply: replyHandlerWith({ deps, hub }), queue, hub };
};

const event = (method: string, rawPath: string, body?: unknown, headers: Record<string, string> = {}) => ({
  rawPath,
  requestContext: { http: { method } },
  headers: { 'content-type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe('the Lambda handler', () => {
  it('guards every operation when configured to, with a 401 challenge', async () => {
    const { api } = build();
    const r = await api(event('GET', '/uli-service/v1/health'));
    expect(r.statusCode).toBe(401);
    expect(r.headers['www-authenticate']).toBe('Bearer realm="uli"');
  });

  it('answers the same route table as Express', async () => {
    const { api } = build();
    const r = await api(event('GET', '/uli-service/v1/health', undefined, { authorization: 'Bearer tok' }));
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toMatchObject({ ok: true, threshold: 1250 });
  });

  it('a broadcast enqueues delivery and returns before any reply exists', async () => {
    const { api, queue } = build();
    const r = await api(event('POST', '/uli-service/v1/broadcast', { recordKey: `${P1}:A1001` }, { authorization: 'Bearer tok' }));
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body) as { tally: { replied: number; reached: boolean } };
    expect(body.tally).toMatchObject({ replied: 0, reached: false });
    expect(queue.messages).toHaveLength(1);
    expect(queue.messages[0].resolver).toBe(P2);
  });

  it('the reply handler drains the queue and the thread reaches consensus', async () => {
    const { api, reply, queue, hub } = build();
    const r = await api(event('POST', '/uli-service/v1/broadcast', { recordKey: `${P1}:A1001` }, { authorization: 'Bearer tok' }));
    const threadId = (JSON.parse(r.body) as { thread: { id: string } }).thread.id;
    const result = await reply({ Records: queue.messages.map((m, i) => ({ messageId: `m${i}`, body: JSON.stringify(m) })) });
    expect(result.batchItemFailures).toEqual([]);
    const t = await hub.tally(threadId);
    expect(t.ok && t.value.tally).toMatchObject({ replied: 1, needed: 1, reached: true, outcome: 'mint' });
  });

  it('reports a malformed message as a batch failure so the queue retries it', async () => {
    const { reply } = build();
    const result = await reply({ Records: [{ messageId: 'bad', body: JSON.stringify({ threadId: 'nope', resolver: P2 }) }] });
    expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'bad' }]);
  });

  it('decodes a base64 body and a query string', async () => {
    const { api } = build();
    const r = await api({
      rawPath: '/uli-service/v1/search',
      rawQueryString: `uoi=${P2}`,
      requestContext: { http: { method: 'POST' } },
      headers: { 'content-type': 'application/json', authorization: 'Bearer tok' },
      body: Buffer.from(JSON.stringify({ record: SEED_A1 })).toString('base64'),
      isBase64Encoded: true,
    });
    expect(r.statusCode).toBe(200);
    expect((JSON.parse(r.body) as { hits: { _id: string }[] }).hits[0]._id).toBe(`${P2}:B2002`);
  });
});
