#!/usr/bin/env node
/**
 * Drives the two-node stand-up from the host and prints every call and what
 * came back, so the claim "node B answered node A over HTTP" is shown rather
 * than asserted.
 *
 *   node federation/demo.mjs
 *
 * Node A is 127.0.0.1:3001 and node B 127.0.0.1:3002 on the host. Inside the
 * compose network they are node-a:3000 and node-b:3000, which is what every URL
 * in the activities says.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PREFIX = '/uli-service/v1';
const A = { name: 'node-a', uoi: 'M00000001', base: process.env.NODE_A ?? 'http://127.0.0.1:3001', token: 'tok-node-a' };
const B = { name: 'node-b', uoi: 'M00000002', base: process.env.NODE_B ?? 'http://127.0.0.1:3002', token: 'tok-node-b' };
const keys = JSON.parse(readFileSync(join(here, 'keys.json'), 'utf8'));

const show = (v) => JSON.stringify(v, null, 2).split('\n').map((l) => `    ${l}`).join('\n');

const call = async (node, method, path, body, { token = node.token, quiet = false } = {}) => {
  const url = `${node.base}${PREFIX}${path}`;
  const res = await fetch(url, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token === null ? {} : { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = text === '' ? undefined : JSON.parse(text);
  if (!quiet) console.log(`\n-> ${method} ${url}${body === undefined ? '' : ` ${JSON.stringify(body).slice(0, 120)}`}\n<- ${res.status}`);
  return { status: res.status, body: parsed };
};

const step = (title) => console.log(`\n${'='.repeat(100)}\n${title}\n${'='.repeat(100)}`);
const fail = (msg) => {
  console.error(`\nFAILED: ${msg}`);
  process.exit(1);
};

step('1. Both nodes are up, and each lists the other in R');
for (const n of [A, B]) {
  const h = await call(n, 'GET', '/health');
  console.log(show(h.body));
  if (!h.body?.ok) fail(`${n.name} not healthy`);
}

step("2. Node A's actor document, as node B would discover it (bearer-gated; no publicKey term; key one link away)");
const unauth = await call(A, 'GET', `/actors/${A.uoi}`, undefined, { token: null });
console.log(`    without a token: ${unauth.status} (${JSON.stringify(unauth.body)})`);
const actor = await call(A, 'GET', `/actors/${A.uoi}`);
console.log(show(actor.body));
if (JSON.stringify(actor.body).includes('publicKey')) fail('actor carries a publicKey term');

step('3. Ingest each node its own roster (tenant partitions in the one OpenSearch)');
const seedA = JSON.parse(readFileSync(join(here, 'seed-a.json'), 'utf8'));
const seedB = JSON.parse(readFileSync(join(here, 'seed-b.json'), 'utf8'));
console.log(show((await call(A, 'POST', `/ingest?uoi=${A.uoi}`, seedA)).body));
console.log(show((await call(B, 'POST', `/ingest?uoi=${B.uoi}`, seedB)).body));

step('4. Node A broadcasts John Smith (no ULI anywhere). Node B must answer No Match through A inbox.');
const b1 = await call(A, 'POST', '/broadcast', { recordKey: `${A.uoi}:A1001` });
if (b1.status !== 200) fail(`broadcast: ${JSON.stringify(b1.body)}`);
const t1 = b1.body.thread;
console.log('    tally:', JSON.stringify(b1.body.tally));
console.log('    replies:', JSON.stringify(t1.replies));
console.log('    the reply Note in A thread (attributed to B actor on node-b, threaded under A root):');
console.log(show(t1.activities[1]));
if (t1.replies.length !== 1 || t1.replies[0].resolver !== B.uoi) fail('B did not reply');
if (!String(t1.activities[1].attributedTo).startsWith('http://node-b:3000/')) fail('reply is not attributed to node-b');
if (!b1.body.tally.reached) fail('consensus not reached');

step("5. The delivery logs: A's POST to B's inbox, and B's POST back to A's inbox");
console.log('    node-a:', show((await call(A, 'GET', '/federation', undefined, { quiet: true })).body));
console.log('    node-b:', show((await call(B, 'GET', '/federation', undefined, { quiet: true })).body));

step("6. Node B's outbox lists the reply it sent into A's thread; B originated no thread of its own");
console.log(show((await call(B, 'GET', `/actors/${B.uoi}/outbox?page=1`)).body));
const bThreads = await call(B, 'GET', `/threads?uoi=${B.uoi}`);
console.log(`    threads node-b originated: ${JSON.stringify(bThreads.body.threads.map((t) => t.id))} (expected [])`);
const allThreads = await call(B, 'GET', '/threads', undefined, { quiet: true });
console.log(`    threads visible to node-b in the shared uli-threads index: ${JSON.stringify(allThreads.body.threads.map((t) => `${t.id} by ${t.originator}`))}`);
console.log('    (the index is shared in this compose, so A\'s record is visible from B; B did not write it, and nothing in B reads it.');
console.log('     The in-process test in tests/activitypub.test.ts runs the same flow over two separate memory stores.)');

step('7. Node A mints at no-match consensus; node B verifies the ULI against A key from its own governance copy');
const m = await call(A, 'POST', `/threads/${t1.id}/mint`);
if (m.status !== 200) fail(`mint: ${JSON.stringify(m.body)}`);
console.log(`    minted: ${m.body.uli}`);
const v = await call(B, 'POST', '/verify', { uli: m.body.uli });
console.log(show(v.body));
if (!v.body.ok) fail('ULI minted on A does not verify on B');
console.log(`    node-b's copy of A's key: ${(await call(B, 'GET', '/governance', undefined, { quiet: true })).body.resolvers.find((r) => r.uoi === A.uoi).publicKeys[0]}`);
console.log(`    the key make-env.mjs generated for A:  ${keys.a.publicKey}`);

step('8. Node A broadcasts Jane. Node B holds her under a ULI it minted: a match, score behind B link, A adopts.');
const b2 = await call(A, 'POST', '/broadcast', { recordKey: `${A.uoi}:A0001` });
if (b2.status !== 200) fail(`broadcast: ${JSON.stringify(b2.body)}`);
const t2 = b2.body.thread;
console.log('    tally:', JSON.stringify(b2.body.tally));
const match = t2.activities.find((x) => x.content === 'Matches Found');
console.log('    the match reply (no score in it; the link is on node-b and bearer-gated):');
console.log(show(match));
if (JSON.stringify(match).includes(String(b2.body.tally.best?.score))) fail('score leaked into the activity');
if (b2.body.tally.outcome !== 'adopt') fail('expected an adopt outcome');
const ad = await call(A, 'POST', `/threads/${t2.id}/adopt`);
if (ad.status !== 200) fail(`adopt: ${JSON.stringify(ad.body)}`);
console.log(`    adopted ${ad.body.uli}`);
console.log(`    (B's Jane was seeded under ${keys.janeUli}; same? ${ad.body.uli === keys.janeUli})`);

step('9. Node A outbox: the Create (mint) and the two broadcast Notes, newest first');
console.log(show((await call(A, 'GET', `/actors/${A.uoi}/outbox?page=1`)).body));

step('Done: broadcast from A answered by B over HTTP (no-match and match), consensus, mint, verified on B, adopt.');
