/**
 * The local node. The tenants it acts for are registered as resolvers on an
 * in-process governance feed, each with a signing key, so a broadcast from one
 * tenant is answered by the others and the ULI it mints verifies. Other nodes'
 * resolvers are registered from ULI_RESOLVERS, and when any are, delivery goes
 * over HTTP to their inboxes.
 *
 *   OPENSEARCH_URL    http://localhost:9200
 *   PORT              3000
 *   ULI_HOST          127.0.0.1 - the bind address. Loopback by default on purpose: an
 *                     unauthenticated local node holding licensee data must not be reachable
 *                     from the network. A container sets 0.0.0.0 explicitly, because a
 *                     published port arrives on the container interface and never on loopback.
 *   ULI_ORIGIN        http://localhost:3000   (identifiers, actor URLs and payload links are minted under it;
 *                     for a federating node it must be the address other nodes can reach)
 *   ULI_NODE_UOI      the tenant the node acts for by default; the first tenant when unset
 *   ULI_NODE_TENANTS  comma-separated tenants this node acts for. Unset means every tenant in the index
 *                     plus ULI_NODE_UOI. Set it when the index is shared with other nodes, or every
 *                     tenant in it would be treated as this node's own.
 *   ULI_NODE_TOKENS   comma-separated bearer tokens this node accepts (a default is generated)
 *   ULI_SIGNING_KEYS  JSON { "<uoi>": "<pkcs8 pem>" }; generated per run when unset
 *   ULI_RESOLVERS     JSON array of resolver entries on other nodes: { uoi, uoiUrn, actor, publicKeys, status, certified }
 *   ULI_PEER_TOKENS   JSON { "<uoi>": "<bearer token that node accepts from us>" }, the prearranged
 *                     grant of section 2.1, one per peer. Any entry here, or in ULI_RESOLVERS, turns
 *                     delivery over to HTTP.
 */

import { randomBytes } from 'node:crypto';
import { createApp, listen } from '../adapters/express.js';
import { API_PREFIX } from '../adapters/routes.js';
import { httpFederation, httpPeers } from '../node/federation-http.js';
import { localFederation } from '../node/federation.js';
import { localGovernance, memorySigner, type ResolverEntry, uoiUrn } from '../node/governance.js';
import { createHub } from '../node/hub.js';
import { openSearch } from '../node/opensearch.js';
import { ensureIndices, openSearchStores } from '../node/store-opensearch.js';
import { generateKeyPair, publicKeyOf } from '../sdk/uli.js';

const list = (value: string | undefined): readonly string[] => (value ?? '').split(',').map((t) => t.trim()).filter((t) => t !== '');
const parseJson = <T>(value: string | undefined, fallback: T): T => (value === undefined || value.trim() === '' ? fallback : (JSON.parse(value) as T));

const main = async (): Promise<void> => {
  const os = openSearch({ url: process.env['OPENSEARCH_URL'] ?? 'http://localhost:9200' });
  if (!(await os.ping())) {
    console.error(`OpenSearch is not reachable at ${os.url}; start it with docker compose -f docker-compose.opensearch.yml up -d`);
    process.exit(1);
  }
  await ensureIndices(os);
  const stores = openSearchStores(os);
  const port = Number(process.env['PORT'] ?? 3000);
  const origin = process.env['ULI_ORIGIN'] ?? `http://localhost:${port}`;

  const configuredTenants = list(process.env['ULI_NODE_TENANTS']);
  const nodeUoiEnv = process.env['ULI_NODE_UOI'];
  const indexTenants = await stores.members.tenants();
  const tenants = configuredTenants.length > 0 ? configuredTenants : [...new Set([...indexTenants, ...(nodeUoiEnv === undefined ? [] : [nodeUoiEnv])])].sort();
  const configuredKeys = parseJson<Record<string, string>>(process.env['ULI_SIGNING_KEYS'], {});
  const privateKeys = Object.fromEntries(tenants.map((uoi) => [uoi, configuredKeys[uoi] ?? generateKeyPair().privateKeyPem]));
  const local: readonly ResolverEntry[] = tenants.map((uoi) => ({
    uoi,
    uoiUrn: uoiUrn(uoi),
    actor: `${origin}${API_PREFIX}/actors/${uoi}`,
    publicKeys: [publicKeyOf(privateKeys[uoi])],
    status: 'active' as const,
    certified: true,
  }));
  const remote = parseJson<readonly ResolverEntry[]>(process.env['ULI_RESOLVERS'], []).filter((r) => !tenants.includes(r.uoi));
  const governance = localGovernance({ resolvers: [...local, ...remote] });
  const nodeUoi = nodeUoiEnv ?? tenants[0] ?? 'M00000000';
  const tokens = list(process.env['ULI_NODE_TOKENS'] ?? randomBytes(12).toString('base64url'));
  const peerTokens = parseJson<Record<string, string>>(process.env['ULI_PEER_TOKENS'], {});

  const hub = createHub({ stores, governance, signer: memorySigner(privateKeys), origin });
  const federated = remote.length > 0 || Object.keys(peerTokens).length > 0;
  // A local tenant is reached through this node's own inbox, with a token this node accepts.
  const peers = federated ? httpPeers({ tokenFor: (uoi) => peerTokens[uoi] ?? (tenants.includes(uoi) ? tokens[0] : undefined) }) : undefined;
  const app = createApp({
    hub,
    stores,
    governance,
    federation: peers === undefined ? localFederation(hub) : httpFederation(hub, governance, peers),
    auth: { allows: (b) => b !== undefined && tokens.includes(b), guardsOperations: false },
    nodeUoi,
    peers,
    tenants,
  });
  const host = process.env['ULI_HOST'] ?? '127.0.0.1';
  const started = await listen(app, port, host);
  console.log(`ULI node listening at ${started.url}${API_PREFIX}`);
  console.log(`node tenant ${nodeUoi}; acting for ${tenants.join(', ') || '(none; ingest a roster first)'}; resolvers in R: ${governance.pool().join(', ') || '(none)'}`);
  console.log(`federation: ${peers === undefined ? 'in process' : `http, peers ${remote.map((r) => `${r.uoi} at ${r.actor}`).join('; ') || '(none remote)'}`}`);
  console.log(`threshold ${governance.parameters().threshold} (derived); bearer token: ${tokens[0]}`);
  governance.resolvers().forEach((r) => console.log(`  ${r.uoiUrn} key ${r.publicKeys[0]} actor ${r.actor}`));
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
