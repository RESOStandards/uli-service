/**
 * Usage: node dist/bin/ingest-webapi.js --uoi M00000001 [--usi S1] [--expand-office] [--url http://localhost:9200]
 *
 * The Web API source comes from the environment the RESO Client SDK reads:
 * RESO_BASE_URL plus either RESO_AUTH_TOKEN or the client-credentials set.
 */
import { authConfigFromEnv } from '@reso-standards/reso-client';
import { ingestRecords } from '../ingest/index.js';
import { fetchMembers, openSource } from '../ingest/webapi.js';
import { openSearch } from '../node/opensearch.js';
import { ensureIndices, openSearchMemberStore } from '../node/store-opensearch.js';

const arg = (name: string, fallback?: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const main = async (): Promise<void> => {
  const uoi = arg('uoi');
  const baseUrl = process.env['RESO_BASE_URL'];
  if (uoi === undefined || baseUrl === undefined) {
    console.error('usage: RESO_BASE_URL=... ingest-webapi --uoi <uoi> [--usi <usi>] [--expand-office]');
    process.exit(2);
  }
  const os = openSearch({ url: arg('url', process.env['OPENSEARCH_URL'] ?? 'http://localhost:9200') as string });
  if (!(await os.ping())) {
    console.error(`OpenSearch is not reachable at ${os.url}`);
    process.exit(1);
  }
  await ensureIndices(os);
  const client = await openSource({ baseUrl, auth: authConfigFromEnv() });
  const members = await fetchMembers(client, { expandOffice: process.argv.includes('--expand-office') });
  const report = await ingestRecords(openSearchMemberStore(os), { uoi, usi: arg('usi'), ddVersion: arg('dd', '2.1') }, members);
  console.log(JSON.stringify({ baseUrl, uoi, members: members.length, ...report }, null, 2));
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
