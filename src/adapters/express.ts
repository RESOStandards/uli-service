/**
 * The local adapter: Express over the route table, with in-process delivery.
 * Thin by design: the only things here are parsing, listening and the wiring.
 */

import express, { type Express } from 'express';
import { API_PREFIX, handleRequest, type RouteDeps } from './routes.js';

export const createApp = (deps: RouteDeps): Express => {
  const app = express();
  // ActivityPub peers post `application/activity+json` or the `ld+json` profile form; both are JSON.
  app.use(express.json({ limit: '50mb', type: ['application/json', 'application/activity+json', 'application/ld+json'] }));
  app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '200mb' }));

  app.use(API_PREFIX, async (req, res) => {
    const query = Object.fromEntries(Object.entries(req.query).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    const headers = Object.fromEntries(Object.entries(req.headers).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    try {
      const response = await handleRequest(deps, { method: req.method, path: req.path, query, body: req.body, headers });
      Object.entries(response.headers ?? {}).forEach(([k, v]) => res.setHeader(k, v));
      if (response.body === undefined) {
        res.status(response.status).end();
        return;
      }
      res.status(response.status).json(response.body);
    } catch (cause) {
      // An unhandled throw must not leave the framework's HTML error page on a JSON API. A client
      // parsing this surface gets JSON for every status, including the ones we did not intend.
      // The message is kept: this node runs on a participant's own infrastructure, and a caller
      // debugging an integration needs the reason, not an opaque 500.
      console.error(`unhandled error on ${req.method} ${req.path}`, cause);
      res.status(500).json({ error: 'internal', reason: cause instanceof Error ? cause.message : String(cause) });
    }
  });

  return app;
};

/** Start on a port (0 for ephemeral) and report the base URL; used by the suite and the bin. */
export const listen = (app: Express, port: number, host = '127.0.0.1'): Promise<{ url: string; close: () => Promise<void> }> =>
  new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      const addr = server.address();
      const actual = typeof addr === 'object' && addr !== null ? addr.port : port;
      // A wildcard bind is not an address anyone can call, so report one that works.
      const reachable = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
      resolve({ url: `http://${reachable}:${actual}`, close: () => new Promise<void>((done) => server.close(() => done())) });
    });
  });
