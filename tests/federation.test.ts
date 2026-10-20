import { describe, expect, it } from 'vitest';
import { toMemberDoc } from '../src/ingest/record.js';
import { memoryQueue, queuedFederation } from '../src/node/federation.js';
import { localGovernance, memorySigner, uoiUrn } from '../src/node/governance.js';
import { createHub } from '../src/node/hub.js';
import { memoryStores } from '../src/node/store-memory.js';
import { generateKeyPair } from '../src/sdk/uli.js';
import { SEED_A1 } from './fixtures.js';

describe('queued delivery, the production shape', () => {
  it('enqueues one message per resolver and the reply handler drains them', async () => {
    const pair = generateKeyPair();
    const resolvers = ['M1', 'M2', 'M3'].map((uoi) => ({ uoi, uoiUrn: uoiUrn(uoi), actor: `http://n/${uoi}`, publicKeys: [pair.publicKey], status: 'active' as const, certified: true }));
    const stores = memoryStores([toMemberDoc(SEED_A1, { uoi: 'M1' })]);
    const hub = createHub({ stores, governance: localGovernance({ resolvers }), signer: memorySigner({ M1: pair.privateKeyPem }), origin: 'http://n' });
    const queue = memoryQueue();
    const b = await hub.broadcast({ originator: 'M1', recordKey: 'M1:A1001' });
    if (!b.ok) throw new Error(b.reason);
    await queuedFederation(queue, hub).deliver(b.value);
    expect(queue.messages).toEqual([
      { threadId: b.value.id, resolver: 'M2' },
      { threadId: b.value.id, resolver: 'M3' },
    ]);
    expect((await hub.thread(b.value.id))?.replies).toEqual([]);
    for (const m of queue.messages) await hub.resolverReply(m.threadId, m.resolver);
    const t = await hub.tally(b.value.id);
    expect(t.ok && t.value.tally).toMatchObject({ replied: 2, needed: 2, reached: true, outcome: 'mint' });
  });
});
