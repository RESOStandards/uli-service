/**
 * Delivery: how a broadcast reaches the resolvers and their replies come back.
 *
 * Locally, every resolver is a tenant of the same host, so delivery is a loop
 * in process: each member of the pinned pool searches its own partition and
 * replies at once. This is the "federation operated by one host" the pilot
 * settled on, and it is where the local adapter and the production one differ:
 * production fans out through a queue, so the handler returns before the
 * replies exist and the thread fills in as they arrive.
 *
 * Neither changes the protocol: the thread, the replies and the tally are the
 * same objects, and the hub does not know which delivered them.
 */

import type { Hub } from './hub.js';
import type { ThreadRecord } from './store.js';

export interface Federation {
  /** Deliver a thread's current round to every resolver in its pool, except the originator. */
  deliver: (thread: ThreadRecord) => Promise<ThreadRecord>;
}

export const localFederation = (hub: Hub): Federation => ({
  deliver: async (thread) => {
    const resolvers = thread.pool.filter((r) => r !== thread.originator);
    const last = await resolvers.reduce<Promise<ThreadRecord>>(async (acc, resolver) => {
      await acc;
      const r = await hub.resolverReply(thread.id, resolver);
      return r.ok ? r.value.thread : acc;
    }, Promise.resolve(thread));
    return last;
  },
});

/** A queue in front of delivery: the production shape. */
export interface Queue {
  enqueue: (message: { readonly threadId: string; readonly resolver: string }) => Promise<void>;
}

/** The production delivery: one message per resolver, consumed by the reply handler. */
export const queuedFederation = (queue: Queue, hub: Hub): Federation => ({
  deliver: async (thread) => {
    await Promise.all(thread.pool.filter((r) => r !== thread.originator).map((resolver) => queue.enqueue({ threadId: thread.id, resolver })));
    return (await hub.thread(thread.id)) ?? thread;
  },
});

/** An in-memory queue, so the production shape is testable without a queue service. */
export const memoryQueue = (): Queue & { readonly messages: { readonly threadId: string; readonly resolver: string }[] } => {
  const messages: { readonly threadId: string; readonly resolver: string }[] = [];
  return {
    messages,
    enqueue: async (m) => {
      messages.push(m);
    },
  };
};
