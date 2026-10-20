# RCP-54 ULI reference node

One SDK, two adapters. The SDK (`src/sdk/`) holds the protocol logic, pure:
the scorer, the matcher and its blocking, consensus, the identifiability gate,
Ed25519 signing and verification, Activity Streams building, RCF payloads.
The hub (`src/node/hub.ts`) sequences those over store interfaces. Express
(`src/adapters/express.ts`) and a Lambda handler (`src/adapters/lambda.ts`)
are transports over one route table (`src/adapters/routes.ts`). Nothing here
is deployed.

The scorer is the certification oracle, so there is exactly one of it, and the
threshold is derived from the weight set, never written down: today
600 + 650 = 1250, the two smallest co-matchable primaries.

## Run locally

```
npm install
npm test                       # unit suites; the OpenSearch suite skips when the cluster is down
npm run build
node dist/bin/serve.js         # needs OpenSearch on localhost:9200 (uli-service/docker-compose.opensearch.yml)
```

The node registers every tenant found in `uli-members` as a resolver with a
fresh signing key, so a broadcast from one tenant is answered by the others.
Set `ULI_NODE_TENANTS` when the index is shared with another node, or every
tenant in it is treated as this node's own.
API under `http://localhost:3000/uli-service/v1`. The React client in
`uli-service/client` proxies to it (`npm run dev` there, then open :5173).

Ingest a roster: `node dist/bin/ingest-csv.js roster.csv --uoi M00000001`, or
`RESO_BASE_URL=... RESO_AUTH_TOKEN=... node dist/bin/ingest-webapi.js --uoi M00000001`
through the RESO Client SDK.

Payload routes (`/rcf/...`) require a bearer token, printed at startup; the
node's own operations are open on loopback unless `ULI_NODE_TOKENS` is set.

## Run it in a container

`docker-compose.pilot.yml` brings up OpenSearch and the node together, which is
the shortest path to a node someone else can look at:

```
docker compose -f docker-compose.pilot.yml up -d --build
curl -s localhost:3000/uli-service/v1/health
```

Health reports the derived threshold and the resolver pool, so a correct
stand-up is one request:

```json
{"ok":true,"node":"M00000001","threshold":1250,"pool":["M00000001","M00000002"]}
```

Add `--profile tools` for OpenSearch Dashboards on :5601 to look at the index.

Load a roster without a local toolchain, mounting the file read-only:

```
docker compose -f docker-compose.pilot.yml run --rm \
  -v "$PWD/roster.csv:/data/roster.csv:ro" node \
  node dist/bin/ingest-csv.js /data/roster.csv --uoi M00000123
```

Two things about the image are deliberate and will look wrong otherwise.

**It sets `ULI_HOST=0.0.0.0`, and the source default is `127.0.0.1`.** A node
run directly on a developer's machine holds licensee data behind no
authentication worth the name, so loopback is the right default there. In a
container the published port arrives on the container's own interface and never
on loopback, so a loopback bind is unreachable from everywhere, including the
host. Docker's network is the isolation boundary in that case, not the bind
address. Both defaults are correct for their context, which is why this is an
environment variable and not a change to the default.

**Licensee data is never built into the image.** `.dockerignore` excludes CSV,
XLSX, `.env` and keys, because a file copied into an image is in every layer of
it and readable by anyone who can pull it. Mount rosters at run time.

### Before this is a deployed pilot rather than an evaluation

The compose file is a loopback stand-up with the OpenSearch security plugin
disabled. Five things change before it carries anyone's real roster, and they
are listed at the bottom of the compose file as well:

1. `ULI_ORIGIN` must be an address other participants can reach. Identifiers
   and payload links are minted under it, and a ULI minted under `localhost`
   resolves for nobody.
2. `ULI_SIGNING_KEYS` must be set and persisted. Unset, the node generates a
   key per start, and every identifier minted under the previous key stops
   verifying.
3. OpenSearch security must be enabled and the node must authenticate to it.
4. The payload routes must be served over TLS. They carry licensee data behind
   a bearer token, and a bearer token over plain HTTP is not a protected link.
5. Where one host runs nodes for several participants, tenant isolation stops
   being an assumption and becomes the thing to test. Isolation between
   participants is what the protocol rests on, and a shared index makes it a
   query-scoping property rather than a network one.

## Two nodes that federate

`docker-compose.federation.yml` runs two nodes, each acting for one tenant,
against one OpenSearch with tenant partitions, and each registering the other
as a resolver. A broadcast from node A is delivered as an ActivityPub `Create`
to node B's inbox, B searches its own partition and replies through A's inbox,
A tallies, mints, and the ULI verifies on B.

```
npm run build && node federation/make-env.mjs      # demo keys, env files, seed rosters
docker compose -f docker-compose.federation.yml up -d --build
node federation/demo.mjs                           # every call and its response, from the host
```

Three routes per tenant, all bearer-gated whatever `ULI_NODE_TOKENS` guards
elsewhere, because in the pilot the activities are not public:

- `GET /uli-service/v1/actors/:uoi`, the actor document: `inbox`, `outbox`,
  and a `url` link to the governance route where its Ed25519 key is served.
  No `publicKey` term: that is W3C security vocabulary, not Activity Streams,
  and section 2.2 forbids custom terms; the feed is the key source (2.8, 2.10).
- `POST /uli-service/v1/actors/:uoi/inbox`: a broadcast is answered from the
  tenant's own data, a reply is recorded in the tenant's thread, a Create or
  Tombstone for someone else's thread is kept and not acted on.
- `GET /uli-service/v1/actors/:uoi/outbox`: the tenant's activities, newest
  first, twenty a page.

`httpFederation` (`src/node/federation-http.ts`) is the third `Federation`:
it POSTs the round to every pool member's inbox, discovered from each actor
document, and records what it attempted and what failed at
`GET /uli-service/v1/federation`. A resolver that is down is a resolver that
did not reply. Between nodes, a bearer token prearranged per peer
(`ULI_PEER_TOKENS`) is the whole of authentication; HTTP Signatures and OIDC
are not built, and the inbox names where a signature check would go.

Not federated: the mint `Create` and the `Tombstone`. `Federation.deliver`
delivers a round, so other nodes never learn a thread's outcome over HTTP.
And a merge's exclusion list never reaches a remote resolver, because the
broadcast Note of section 2.12.4 is identical to section 2.12.1's; the
originator's inbox refuses the excluded offer and says why.

## What is not built

**The bulk join.** `src/node/bulk-join.ts` returns a structured refusal rather
than a flow. RCP-54 resolves one licensee per thread, and 300,000 threads each
waiting on `floor(2/3 x R)` is a different mechanism rather than a slower one.
Section 2.12.3's self-healing is the candidate answer and it is a protocol
decision before it is an engineering one.
