/**
 * The production adapter: a Lambda handler over the same route table, with a
 * queue in front of delivery. Handler shape only. Nothing here is deployed and
 * nothing here calls AWS: the queue client and the request signer are
 * interfaces with local implementations, and the production implementations
 * are the two things to supply before this runs in an account.
 *
 * Two handlers: `apiHandler` answers API Gateway (HTTP API, payload v2), and
 * `replyHandler` consumes the queue, one message per resolver per thread, so a
 * broadcast returns before any resolver has replied and the thread fills in as
 * messages drain. That is the shape section 2.6 describes: replies accumulate
 * over time, and there is no fixed timeout.
 */

import { httpFederation, httpPeers } from '../node/federation-http.js';
import { localFederation, queuedFederation, type Queue } from '../node/federation.js';
import { localGovernance, memorySigner, type ResolverEntry } from '../node/governance.js';
import { createHub, type Hub } from '../node/hub.js';
import { openSearch } from '../node/opensearch.js';
import { ensureIndices, openSearchStores } from '../node/store-opensearch.js';
import type { Stores } from '../node/store.js';
import { API_PREFIX, handleRequest, type RouteDeps } from './routes.js';

/** The subset of the API Gateway v2 event the handler reads. Declared here so no AWS types package is needed. */
export interface HttpApiEvent {
  readonly rawPath: string;
  readonly rawQueryString?: string;
  readonly requestContext: { readonly http: { readonly method: string } };
  readonly headers?: Readonly<Record<string, string | undefined>>;
  readonly body?: string;
  readonly isBase64Encoded?: boolean;
}

export interface HttpApiResult {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface SqsEvent {
  readonly Records: readonly { readonly body: string; readonly messageId?: string }[];
}

export interface LambdaDeps {
  readonly deps: RouteDeps;
  readonly hub: Hub;
}

/**
 * Production wiring from the environment. The queue is required to be supplied:
 * the SQS client is not implemented here, so a handler built without one uses
 * in-process delivery and says so.
 */
export const depsFromEnv = async (env: Readonly<Record<string, string | undefined>>, queue?: Queue): Promise<LambdaDeps> => {
  const os = openSearch({ url: env['OPENSEARCH_URL'] ?? 'http://localhost:9200' });
  await ensureIndices(os);
  const stores: Stores = openSearchStores(os);
  const resolvers: readonly ResolverEntry[] = env['ULI_RESOLVERS'] === undefined ? [] : (JSON.parse(env['ULI_RESOLVERS']) as readonly ResolverEntry[]);
  const governance = localGovernance({ resolvers });
  const signer = memorySigner(env['ULI_SIGNING_KEYS'] === undefined ? {} : (JSON.parse(env['ULI_SIGNING_KEYS']) as Record<string, string>));
  const origin = env['ULI_ORIGIN'] ?? 'https://uli.reso.org';
  const nodeUoi = env['ULI_NODE_UOI'] ?? resolvers[0]?.uoi ?? 'M00000000';
  const hub = createHub({ stores, governance, signer, origin });
  const tokens = new Set((env['ULI_NODE_TOKENS'] ?? '').split(',').map((t) => t.trim()).filter((t) => t !== ''));
  // Peers on other nodes, when prearranged tokens exist for them (section 2.1). A queue still wins
  // for delivery, since a queued consumer replies in process; the inbox works either way.
  const peerTokens = env['ULI_PEER_TOKENS'] === undefined ? undefined : (JSON.parse(env['ULI_PEER_TOKENS']) as Record<string, string>);
  const peers = peerTokens === undefined ? undefined : httpPeers({ tokenFor: (uoi) => peerTokens[uoi] });
  const tenants = env['ULI_NODE_TENANTS'] === undefined ? undefined : env['ULI_NODE_TENANTS'].split(',').map((t) => t.trim()).filter((t) => t !== '');
  const deps: RouteDeps = {
    hub,
    stores,
    governance,
    federation: queue !== undefined ? queuedFederation(queue, hub) : peers !== undefined ? httpFederation(hub, governance, peers) : localFederation(hub),
    auth: { allows: (b) => b !== undefined && tokens.has(b), guardsOperations: true },
    nodeUoi,
    peers,
    tenants,
  };
  return { deps, hub };
};

const parseBody = (event: HttpApiEvent): unknown => {
  if (event.body === undefined || event.body === '') return undefined;
  const raw = event.isBase64Encoded === true ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const type = (event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? '').toLowerCase();
  if (type.startsWith('text/')) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/** Build the API handler over resolved dependencies, so a test can hand it memory stores. */
export const apiHandlerWith =
  (resolved: Promise<LambdaDeps> | LambdaDeps) =>
  async (event: HttpApiEvent): Promise<HttpApiResult> => {
    const { deps } = await resolved;
    const path = event.rawPath.startsWith(API_PREFIX) ? event.rawPath.slice(API_PREFIX.length) : event.rawPath;
    const query = Object.fromEntries(new URLSearchParams(event.rawQueryString ?? '').entries());
    const headers = Object.fromEntries(Object.entries(event.headers ?? {}).flatMap(([k, v]) => (v === undefined ? [] : [[k.toLowerCase(), v]])));
    const response = await handleRequest(deps, { method: event.requestContext.http.method, path: path === '' ? '/' : path, query, body: parseBody(event), headers });
    return {
      statusCode: response.status,
      headers: { 'content-type': 'application/json; charset=utf-8', ...(response.headers ?? {}) },
      body: response.body === undefined ? '' : JSON.stringify(response.body),
    };
  };

/** Build the queue consumer: each message is one resolver's turn to reply in one thread. */
export const replyHandlerWith =
  (resolved: Promise<LambdaDeps> | LambdaDeps) =>
  async (event: SqsEvent): Promise<{ readonly batchItemFailures: readonly { readonly itemIdentifier: string }[] }> => {
    const { hub } = await resolved;
    const failures = await Promise.all(
      event.Records.map(async (r) => {
        const m: unknown = JSON.parse(r.body);
        const threadId = typeof m === 'object' && m !== null && 'threadId' in m ? String(m.threadId) : undefined;
        const resolver = typeof m === 'object' && m !== null && 'resolver' in m ? String(m.resolver) : undefined;
        if (threadId === undefined || resolver === undefined) return [];
        const result = await hub.resolverReply(threadId, resolver);
        return result.ok ? [] : [{ itemIdentifier: r.messageId ?? '' }];
      })
    );
    return { batchItemFailures: failures.flat() };
  };

/**
 * The deployable entry points, resolved lazily from the environment on first
 * invocation. The queue argument is undefined here on purpose: supplying an
 * SQS-backed `Queue` is the one production step not taken in this build.
 */
const lazy = (): Promise<LambdaDeps> => depsFromEnv(process.env);
export const apiHandler = apiHandlerWith(lazy());
export const replyHandler = replyHandlerWith(lazy());
