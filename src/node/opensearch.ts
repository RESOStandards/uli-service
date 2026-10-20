/**
 * OpenSearch over `fetch`, with no client library.
 *
 * The surface the node needs is six calls, all plain REST. A client library
 * would add a dependency whose own behavior would then need distinguishing from
 * the index's, and in Lambda it would need a signing adapter besides. In
 * production the request signer (SigV4) wraps `fetch`; locally there is none.
 */

export interface OpenSearchConfig {
  readonly url: string;
  /** Wraps fetch, for request signing in production. Identity locally. */
  readonly fetch?: typeof fetch;
}

export interface Hit<T> {
  readonly _id: string;
  readonly _source: T;
}

export interface OpenSearch {
  readonly url: string;
  ping: () => Promise<boolean>;
  indexExists: (index: string) => Promise<boolean>;
  ensureIndex: (index: string, body: unknown) => Promise<boolean>;
  deleteIndex: (index: string) => Promise<void>;
  bulkIndex: <T>(index: string, docs: readonly T[], idOf: (doc: T) => string) => Promise<number>;
  index: (index: string, id: string, doc: unknown) => Promise<void>;
  update: (index: string, id: string, partial: unknown) => Promise<void>;
  get: <T>(index: string, id: string) => Promise<T | undefined>;
  search: <T>(index: string, body: unknown) => Promise<readonly Hit<T>[]>;
  /** The whole search response, for aggregations. */
  searchRaw: (index: string, body: unknown) => Promise<unknown>;
  updateByQuery: (index: string, query: unknown, script: string, params: Readonly<Record<string, unknown>>) => Promise<number>;
  count: (index: string, query?: unknown) => Promise<number>;
  refresh: (index: string) => Promise<void>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export const openSearch = (config: OpenSearchConfig): OpenSearch => {
  const base = config.url.replace(/\/$/, '');
  const f = config.fetch ?? fetch;

  const call = async (method: string, path: string, body?: unknown, contentType = 'application/json'): Promise<unknown> => {
    const res = await f(`${base}${path}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': contentType },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`OpenSearch ${method} ${path} failed with ${res.status}: ${text.slice(0, 500)}`);
    return text === '' ? undefined : JSON.parse(text);
  };

  return {
    url: base,
    ping: async () => {
      try {
        const res = await f(base, { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch {
        return false;
      }
    },
    indexExists: async (index) => {
      const res = await f(`${base}/${index}`, { method: 'HEAD' });
      return res.status === 200;
    },
    ensureIndex: async (index, body) => {
      const res = await f(`${base}/${index}`, { method: 'HEAD' });
      if (res.status === 200) return false;
      await call('PUT', `/${index}`, body);
      return true;
    },
    deleteIndex: async (index) => {
      await call('DELETE', `/${index}`);
    },
    bulkIndex: async (index, docs, idOf) => {
      if (docs.length === 0) return 0;
      const lines = docs.flatMap((d) => [JSON.stringify({ index: { _index: index, _id: idOf(d) } }), JSON.stringify(d)]);
      const result = await call('POST', '/_bulk?refresh=true', `${lines.join('\n')}\n`, 'application/x-ndjson');
      if (isRecord(result) && result.errors === true) {
        const items = Array.isArray(result.items) ? result.items : [];
        const failed = items.filter((i) => isRecord(i) && isRecord(i.index) && i.index.error !== undefined);
        throw new Error(`bulk index had ${failed.length} failures: ${JSON.stringify(failed[0]).slice(0, 500)}`);
      }
      return docs.length;
    },
    index: async (index, id, doc) => {
      await call('PUT', `/${index}/_doc/${encodeURIComponent(id)}?refresh=true`, doc);
    },
    update: async (index, id, partial) => {
      await call('POST', `/${index}/_update/${encodeURIComponent(id)}?refresh=true`, { doc: partial });
    },
    get: async <T>(index: string, id: string): Promise<T | undefined> => {
      const res = await f(`${base}/${index}/_doc/${encodeURIComponent(id)}`);
      if (res.status === 404) return undefined;
      const body: unknown = await res.json();
      if (!res.ok) throw new Error(`OpenSearch GET ${index}/${id} failed with ${res.status}`);
      return isRecord(body) && body.found === true ? (body._source as T) : undefined;
    },
    search: async <T>(index: string, body: unknown): Promise<readonly Hit<T>[]> => {
      const result = await call('POST', `/${index}/_search`, body);
      const hits = isRecord(result) && isRecord(result.hits) && Array.isArray(result.hits.hits) ? result.hits.hits : [];
      return hits.filter(isRecord).map((h) => ({ _id: String(h._id), _source: h._source as T }));
    },
    searchRaw: (index, body) => call('POST', `/${index}/_search`, body),
    updateByQuery: async (index, query, script, params) => {
      const result = await call('POST', `/${index}/_update_by_query?refresh=true&conflicts=proceed`, { query, script: { source: script, lang: 'painless', params } });
      return isRecord(result) && typeof result.updated === 'number' ? result.updated : 0;
    },
    count: async (index, query) => {
      const result = await call('POST', `/${index}/_count`, query === undefined ? undefined : { query });
      return isRecord(result) && typeof result.count === 'number' ? result.count : 0;
    },
    refresh: async (index) => {
      await call('POST', `/${index}/_refresh`);
    },
  };
};
