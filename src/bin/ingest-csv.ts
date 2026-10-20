/**
 * Usage: node dist/bin/ingest-csv.js <file.csv> --uoi M00000001 [--usi S1] [--dd 2.1] [--url http://localhost:9200]
 */
import { readFileSync } from 'node:fs';
import { parseCsv } from '../ingest/csv.js';
import { ingestRecords } from '../ingest/index.js';
import { openSearch } from '../node/opensearch.js';
import { ensureIndices, openSearchMemberStore } from '../node/store-opensearch.js';

const arg = (name: string, fallback?: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const main = async (): Promise<void> => {
  const file = process.argv[2];
  const uoi = arg('uoi');
  if (file === undefined || uoi === undefined || file.startsWith('--')) {
    console.error('usage: ingest-csv <file.csv> --uoi <uoi> [--usi <usi>] [--dd 2.1] [--url http://localhost:9200]');
    process.exit(2);
  }
  const os = openSearch({ url: arg('url', process.env['OPENSEARCH_URL'] ?? 'http://localhost:9200') as string });
  if (!(await os.ping())) {
    console.error(`OpenSearch is not reachable at ${os.url}`);
    process.exit(1);
  }
  await ensureIndices(os);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const report = await ingestRecords(openSearchMemberStore(os), { uoi, usi: arg('usi'), ddVersion: arg('dd', '2.1') }, rows);
  console.log(JSON.stringify({ file, uoi, rows: rows.length, ...report }, null, 2));
};

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
