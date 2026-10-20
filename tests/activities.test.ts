import { describe, expect, it } from 'vitest';
import {
  AS2, CONTENT, RESOLVERS_COLLECTION, broadcastNote, conformance, contextOk, create, matchReply,
  noMatchReply, note, purity, thread, tombstone, uliCreated,
} from '../src/sdk/activities.js';

const P1 = 'https://provider1.example.com/actor';
const P2 = 'https://provider2.example.com/actor';
const ROOT = 'https://provider1.example.com/threads/xyz';

describe('section 2.2: only Activity Streams vocabulary', () => {
  it('a broadcast carries the request, the collection, the link and the mentions, and nothing else', () => {
    const b = broadcastNote({ id: ROOT, actor: P1, href: 'https://provider1.example.com/rcf/member/licensee-123', mandatory: [P2] });
    expect(b).toEqual({
      '@context': AS2,
      id: ROOT,
      type: 'Note',
      attributedTo: P1,
      to: [RESOLVERS_COLLECTION],
      content: CONTENT.request,
      url: { type: 'Link', href: 'https://provider1.example.com/rcf/member/licensee-123', mediaType: 'application/json' },
      tag: [{ type: 'Mention', href: P2 }],
    });
    expect(purity(b)).toEqual([]);
    expect(contextOk(b)).toBe(true);
  });

  it('a no-match reply carries no url (section 2.12.1)', () => {
    const r = noMatchReply({ actor: P2, inReplyTo: ROOT });
    expect(r.url).toBeUndefined();
    expect(r.content).toBe('No Match');
    expect(r.inReplyTo).toBe(ROOT);
  });

  it('a match reply links to the resolution payload and carries no score', () => {
    const r = matchReply({ actor: P2, inReplyTo: ROOT, href: 'https://provider2.example.com/rcf/uli/9f2c' });
    expect(r.content).toBe('Matches Found');
    expect(JSON.stringify(r)).not.toMatch(/score/);
  });

  it('a Create carries the created Note with its own id, which a later tombstone references', () => {
    const c = uliCreated({ noteId: 'https://provider1.example.com/uli/4a17', actor: P1, inReplyTo: ROOT, href: 'https://provider1.example.com/rcf/uli/4a17' });
    expect(c.type).toBe('Create');
    expect(c.object).toEqual({
      type: 'Note',
      id: 'https://provider1.example.com/uli/4a17',
      attributedTo: P1,
      inReplyTo: ROOT,
      content: 'ULI Created',
      url: { type: 'Link', href: 'https://provider1.example.com/rcf/uli/4a17', mediaType: 'application/json' },
    });
  });

  it('a tombstone redirects by URN, not by a resolvable link (section 2.12.3)', () => {
    const t = tombstone({ id: 'https://provider1.example.com/uli/4a17', actor: P1, inReplyTo: ROOT, deleted: '2026-03-02T15:04:05Z', retiredUli: 'urn:old', successorUli: 'urn:new' });
    expect(t.formerType).toBe('Note');
    expect(t.content).toBe('ULI Retired: urn:old');
    expect(t.url).toEqual({ type: 'Link', href: 'urn:new' });
  });

  it('refuses a custom term at any depth', () => {
    expect(() => note({ actor: P1, content: 'x', url: { type: 'Link', href: 'h', score: 1450 } as never })).toThrow(/non-AS2 terms: url.score/);
    expect(purity({ '@context': AS2, type: 'Note', uliScore: 1 })).toEqual(['uliScore']);
  });

  it('refuses an unknown type', () => {
    expect(() => create({ actor: P1, object: { type: 'Resolution' } })).toThrow(/unknown AS2 type/);
  });

  it('drops undefined and empty arrays rather than emitting them', () => {
    const b = broadcastNote({ actor: P1, href: 'h' });
    expect('tag' in b).toBe(false);
    expect('id' in b).toBe(false);
  });

  it('conformance reports the negative rule as verified', () => {
    const docs = [broadcastNote({ id: ROOT, actor: P1, href: 'h' }), noMatchReply({ actor: P2, inReplyTo: ROOT })];
    const c = conformance(docs);
    expect(c.activities).toBe(2);
    expect(c.pureAS2).toBe(true);
    expect(c.contextCorrect).toBe(true);
  });
});

describe('threads over inReplyTo', () => {
  it('nests replies under the root, and a Create under the thread by its object', () => {
    const root = broadcastNote({ id: ROOT, actor: P1, href: 'h' });
    const reply = noMatchReply({ id: 'https://provider2.example.com/notes/1', actor: P2, inReplyTo: ROOT });
    const created = uliCreated({ noteId: 'https://provider1.example.com/uli/4a17', actor: P1, inReplyTo: ROOT, href: 'h2' });
    const t = thread([root, reply, created]);
    expect(t).toHaveLength(1);
    expect(t[0].replies.map((n) => n.activity.type)).toEqual(['Note', 'Create']);
  });

  it('renders a reply whose parent is absent as a root, so a partial view still shows', () => {
    const orphan = noMatchReply({ id: 'x', actor: P2, inReplyTo: 'https://elsewhere/thread' });
    expect(thread([orphan])).toHaveLength(1);
  });
});
