/**
 * The node's HTTP surface, transport-neutral.
 *
 * Express and the Lambda handler both map their request shape onto
 * `NodeRequest` and hand it here, so the two adapters cannot disagree about a
 * route. Everything an adapter adds is parsing, listening and delivery.
 *
 * Two kinds of route. The node's own operations (search, dashboard, threads,
 * mint, adopt) serve the provider-facing client. The `rcf/` routes serve the
 * payloads an activity links to, and section 2.11 requires them to refuse an
 * unauthenticated dereference, so they are gated regardless of configuration.
 */

import { parseCsv } from '../ingest/csv.js';
import { ingestRecords } from '../ingest/index.js';
import { bulkJoin } from '../node/bulk-join.js';
import type { Peers } from '../node/federation-http.js';
import type { Federation } from '../node/federation.js';
import type { Governance } from '../node/governance.js';
import type { Hub, Outcome, Refusal } from '../node/hub.js';
import type { Stores } from '../node/store.js';
import { conformance } from '../sdk/activities.js';
import type { LicenseeRecord } from '../sdk/fields.js';
import { handleActivityPub } from './activitypub.js';

export interface NodeRequest {
  readonly method: string;
  /** Path below the API prefix, leading slash included. */
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

export interface NodeResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface Auth {
  /** Whether a bearer token may read protected payloads. */
  readonly allows: (bearer: string | undefined) => boolean;
  /** Whether the node's own operations need a token too. Off for a loopback development node. */
  readonly guardsOperations: boolean;
}

export interface RouteDeps {
  readonly hub: Hub;
  readonly stores: Stores;
  readonly governance: Governance;
  readonly federation: Federation;
  readonly auth: Auth;
  /** The tenant this node acts for when a request names none. */
  readonly nodeUoi: string;
  /** Delivery over HTTP to other nodes. Absent on a node that federates in process, and its inbox says so. */
  readonly peers?: Peers;
  /** The tenants this node acts for. Absent means every tenant in the member store, plus `nodeUoi`. */
  readonly tenants?: readonly string[];
}

export const API_PREFIX = '/uli-service/v1';

const STATUS: Readonly<Record<Refusal, number>> = {
  invalid: 400,
  'not-identifiable': 422,
  'record-not-found': 404,
  'thread-not-found': 404,
  'conflict-not-found': 404,
  'not-in-pool': 403,
  'below-threshold': 422,
  'no-uli-to-offer': 422,
  'consensus-not-reached': 409,
  'wrong-outcome': 409,
  'thread-closed': 409,
  'no-signing-key': 500,
  'not-a-holder': 403,
  'merge-required': 409,
};

const json = (status: number, body: unknown): NodeResponse => ({ status, body });
const outcome = <T>(o: Outcome<T>, shape: (value: T) => unknown = (v) => v): NodeResponse =>
  o.ok ? json(200, shape(o.value)) : json(STATUS[o.code], { error: o.code, reason: o.reason });

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const strings = (v: unknown): readonly string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export const bearerOf = (authorization: string | undefined): string | undefined => {
  const m = /^Bearer\s+(.+)$/i.exec(authorization ?? '');
  return m === null ? undefined : m[1].trim();
};

const UNAUTHENTICATED: NodeResponse = { status: 401, body: { error: 'unauthenticated' }, headers: { 'www-authenticate': 'Bearer realm="uli"' } };

/** The bearer gate the protected surfaces share: a challenge without a token, a refusal for one the node does not know. */
const gate = (deps: RouteDeps, req: NodeRequest): NodeResponse | undefined => {
  const bearer = bearerOf(req.headers['authorization']);
  if (bearer === undefined) return UNAUTHENTICATED;
  return deps.auth.allows(bearer) ? undefined : json(403, { error: 'forbidden' });
};

/** Deliver a thread's current round and tally it: what a client wants back from a broadcast. */
const deliverAndTally = async (deps: RouteDeps, threadId: string): Promise<NodeResponse> => {
  const thread = await deps.hub.thread(threadId);
  if (thread === undefined) return json(404, { error: 'thread-not-found' });
  await deps.federation.deliver(thread);
  return outcome(await deps.hub.tally(threadId));
};

const threadView = async (deps: RouteDeps, id: string): Promise<NodeResponse> => {
  const t = await deps.hub.tally(id);
  return outcome(t, (v) => ({ ...v, conformance: conformance(v.thread.activities) }));
};

export const handleRequest = async (deps: RouteDeps, req: NodeRequest): Promise<NodeResponse> => {
  const { hub } = deps;
  const body = isRecord(req.body) ? req.body : {};
  const uoi = str(body['uoi']) ?? str(req.query['uoi']) ?? deps.nodeUoi;
  const parts = req.path.split('/').filter((p) => p !== '').map(decodeURIComponent);
  const route = `${req.method.toUpperCase()} ${parts.map((p, i) => (i === 0 || (parts[0] === 'rcf' && i === 1) ? p : ':')).join('/')}`;

  // Section 2.11: a payload link MUST refuse an unauthenticated dereference.
  if (parts[0] === 'rcf') {
    const refused = gate(deps, req);
    if (refused !== undefined) return refused;
    if (req.method !== 'GET') return { status: 405, body: { error: 'method not allowed' }, headers: { allow: 'GET' } };
    const key =
      parts[1] === 'thread' && parts[3] === 'request' ? `thread:${parts[2]}:request:${parts[4]}`
      : parts[1] === 'thread' && parts[3] === 'reply' ? `thread:${parts[2]}:reply:${parts[4]}:${parts[5]}`
      : parts[1] === 'uli' ? `uli:${parts[2]}`
      : undefined;
    const payload = key === undefined ? undefined : await hub.payload(key);
    return payload === undefined ? json(404, { error: 'not found' }) : json(200, payload);
  }

  // Section 2.11: access to the network is authenticated. The ActivityPub routes are gated like the
  // payload routes, whatever `guardsOperations` says: in the pilot the activities are not public.
  if (parts[0] === 'actors') {
    const refused = gate(deps, req);
    if (refused !== undefined) return refused;
    return handleActivityPub(deps, req, parts);
  }

  if (deps.auth.guardsOperations && !deps.auth.allows(bearerOf(req.headers['authorization']))) return UNAUTHENTICATED;

  switch (route) {
    case 'GET health':
      return json(200, { ok: true, node: deps.nodeUoi, threshold: hub.parameters().threshold, pool: deps.governance.pool() });
    case 'GET governance':
      return json(200, { resolvers: deps.governance.resolvers(), parameters: deps.governance.parameters() });
    case 'GET federation':
      // What delivery attempted and what failed, so a broadcast's reach is observable (section 2.6 counts the replies that arrive).
      return json(200, deps.peers === undefined ? { transport: 'in-process', deliveries: [] } : { transport: 'http', deliveries: deps.peers.deliveries });
    case 'GET parameters':
      return json(200, deps.governance.parameters());
    case 'POST search': {
      const record = isRecord(body['record']) ? body['record'] : body;
      return json(200, await hub.search(uoi, record as LicenseeRecord, { excludeKey: str(body['excludeKey']) }));
    }
    case 'POST score':
      return isRecord(body['a']) && isRecord(body['b']) ? json(200, hub.scorePair(body['a'], body['b'])) : json(400, { error: 'invalid', reason: 'a and b records required' });
    case 'GET dashboard':
      return json(200, await hub.dashboard(uoi));
    case 'GET conflicts/:':
      return outcome(await hub.conflict(uoi, parts[1]));
    case 'POST conflicts/:/:': {
      if (parts[2] !== 'resolve') return json(404, { error: 'not found' });
      const resolution = body['resolution'];
      if (resolution !== 'same' && resolution !== 'different') return json(400, { error: 'invalid', reason: 'resolution must be same or different' });
      const r = await hub.resolveConflict(uoi, parts[1], resolution);
      if (!r.ok) return outcome(r);
      if (r.value.thread === undefined) return json(200, r.value);
      const delivered = await deliverAndTally(deps, r.value.thread.id);
      return json(delivered.status, { outcome: r.value.outcome, ...(isRecord(delivered.body) ? delivered.body : {}) });
    }
    case 'POST broadcast': {
      const b = await hub.broadcast({
        originator: uoi,
        record: isRecord(body['record']) ? body['record'] : undefined,
        recordKey: str(body['recordKey']),
        mandatory: strings(body['mandatory']),
        excludeUlis: strings(body['excludeUlis']),
      });
      return b.ok ? deliverAndTally(deps, b.value.id) : outcome(b);
    }
    case 'GET threads':
      return json(200, { threads: await hub.threads(str(req.query['uoi'])) });
    case 'GET threads/:':
      return threadView(deps, parts[1]);
    case 'POST threads/:/:': {
      const id = parts[1];
      switch (parts[2]) {
        case 'replies': {
          const resolver = str(body['resolver']);
          if (resolver === undefined) return json(400, { error: 'invalid', reason: 'resolver required' });
          const r = await hub.reply(id, resolver, str(body['candidateKey']));
          return r.ok ? threadView(deps, id) : outcome(r);
        }
        case 'tally':
          return threadView(deps, id);
        case 'mint':
          return outcome(await hub.mint(id), (v) => ({ ...v, verification: hub.verify(v.uli) }));
        case 'adopt':
          return outcome(await hub.adopt(id, str(body['uli'])), (v) => ({ ...v, verification: hub.verify(v.uli) }));
        case 'decline': {
          const corrected = isRecord(body['record']) ? body['record'] : undefined;
          if (corrected === undefined) return json(400, { error: 'invalid', reason: 'corrected record required' });
          const d = await hub.decline(id, corrected);
          return d.ok ? deliverAndTally(deps, id) : outcome(d);
        }
        default:
          return json(404, { error: 'not found' });
      }
    }
    case 'POST supersede': {
      const holder = str(body['holder']) ?? uoi;
      const retiredUli = str(body['retiredUli']);
      const successorUli = str(body['successorUli']);
      const successorScore = typeof body['successorScore'] === 'number' ? body['successorScore'] : undefined;
      if (retiredUli === undefined || successorUli === undefined || successorScore === undefined) return json(400, { error: 'invalid', reason: 'retiredUli, successorUli and successorScore required' });
      return outcome(await hub.supersede({ holder, retiredUli, successorUli, successorScore }));
    }
    case 'POST verify': {
      const uli = str(body['uli']);
      return uli === undefined ? json(400, { error: 'invalid', reason: 'uli required' }) : json(200, hub.verify(uli));
    }
    case 'GET outcomes':
      return json(200, { outcomes: await hub.outcomes(str(req.query['uoi'])) });
    case 'POST ingest': {
      const tenant = { uoi, usi: str(req.query['usi']), ddVersion: str(req.query['dd']) };
      const records = typeof req.body === 'string' ? parseCsv(req.body) : Array.isArray(req.body) ? req.body.filter(isRecord) : undefined;
      if (records === undefined) return json(400, { error: 'invalid', reason: 'a CSV body or a JSON array of records is required' });
      return json(200, await ingestRecords(deps.stores.members, tenant, records));
    }
    case 'POST bulk-join':
      return outcome(bulkJoin({ uoi }));
    default:
      return json(404, { error: 'not found', route });
  }
};
