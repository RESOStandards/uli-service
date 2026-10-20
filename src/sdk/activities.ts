/**
 * Activity Streams 2.0 for RCP-54, with no dependencies.
 *
 * Section 2.2's hardest rule is negative: implementations MUST use the standard
 * Activity Streams vocabulary and MUST NOT extend the JSON-LD with custom terms;
 * licensee data and matching detail MUST ride in the referenced RCF payload,
 * never in the activity. So the point of this module is not that it builds
 * messages but that what it builds cannot be non-conformant: `purity` refuses
 * any term outside the vocabulary, and every builder runs through it.
 *
 * Ported from the shared playground layer (`reso-ap-local/ap.js`), typed, with
 * the RCP-54 shapes of section 2.12 as named builders. Delivery is not here.
 */

export const AS2 = 'https://www.w3.org/ns/activitystreams';
export const PUBLIC = `${AS2}#Public`;

/** The collection every certified resolver follows (section 2.4, section 2.10). */
export const RESOLVERS_COLLECTION = 'https://reso.org/resolvers';

export type Json = string | number | boolean | null | readonly Json[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: Json | undefined;
}
export type Activity = JsonObject;

const OBJECT_TYPES = ['Note', 'Tombstone', 'Collection', 'OrderedCollection'] as const;
const ACTIVITY_TYPES = ['Create', 'Delete', 'Update'] as const;
const LINK_TYPES = ['Link', 'Mention'] as const;
const ACTOR_TYPES = ['Person', 'Service', 'Organization', 'Application', 'Group'] as const;
const KNOWN_TYPES: ReadonlySet<string> = new Set([...OBJECT_TYPES, ...ACTIVITY_TYPES, ...LINK_TYPES, ...ACTOR_TYPES]);

/** Every Activity Streams term RCP-54 needs. A key outside this set is the failure section 2.2 forbids. */
const TERMS: ReadonlySet<string> = new Set([
  '@context', 'id', 'type',
  'actor', 'object', 'target', 'origin', 'result', 'instrument',
  'attributedTo', 'inReplyTo', 'context', 'tag', 'url', 'href', 'mediaType', 'rel',
  'to', 'cc', 'bto', 'bcc', 'audience',
  'published', 'updated', 'startTime', 'endTime',
  'name', 'summary', 'content',
  'inbox', 'outbox', 'followers', 'following', 'preferredUsername',
  'items', 'orderedItems', 'totalItems', 'first', 'last', 'next', 'prev', 'partOf', 'current',
  'replies', 'formerType', 'deleted',
]);

/** Paths of every term outside the vocabulary, at any depth. Empty means pure AS2. */
export const purity = (doc: unknown, path = ''): readonly string[] => {
  if (Array.isArray(doc)) return doc.flatMap((v, i) => purity(v, `${path}[${i}]`));
  if (doc === null || typeof doc !== 'object') return [];
  return Object.entries(doc).flatMap(([k, v]) =>
    TERMS.has(k) ? purity(v, path === '' ? k : `${path}.${k}`) : [path === '' ? k : `${path}.${k}`]
  );
};

/** Every `type` value at any depth that is not in the vocabulary. */
export const unknownTypes = (doc: unknown): readonly string[] => {
  if (Array.isArray(doc)) return doc.flatMap(unknownTypes);
  if (doc === null || typeof doc !== 'object') return [];
  const entries = Object.entries(doc);
  const own = entries.flatMap(([k, v]) => (k === 'type' && typeof v === 'string' && !KNOWN_TYPES.has(v) ? [v] : []));
  return [...own, ...entries.flatMap(([, v]) => unknownTypes(v))];
};

/** A wrong context is a different defect from a foreign term, so it is checked separately. */
export const contextOk = (doc: Activity): boolean => {
  const c = doc['@context'];
  return c === AS2 || (Array.isArray(c) && c.length === 1 && c[0] === AS2);
};

/**
 * The one place a document becomes real: drops undefined, refuses anything that
 * is not pure AS2 and freezes the result. A programming error here is worth a
 * throw, because the module's whole claim is that its output conforms.
 */
const seal = (doc: Activity): Activity => {
  const clean = Object.fromEntries(
    Object.entries(doc).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
  ) as Activity;
  const bad = purity(clean);
  if (bad.length > 0) throw new Error(`activity carries non-AS2 terms: ${bad.join(', ')}`);
  const unknown = typeof clean['type'] === 'string' ? unknownTypes(clean) : [String(clean['type'])];
  if (unknown.length > 0) throw new Error(`unknown AS2 type: ${unknown.join(', ')}`);
  return Object.freeze(clean);
};

export interface LinkInput {
  readonly href: string;
  readonly mediaType?: string;
}

/** The only trace of a record on the wire: an OAuth2-protected link (section 2.3). */
export const payloadLink = ({ href, mediaType = 'application/json' }: LinkInput): Activity =>
  seal({ type: 'Link', href, mediaType });

/** A Mention is what makes a resolver mandatory for a broadcast (section 2.4). */
export const mention = ({ href, name }: { readonly href: string; readonly name?: string }): Activity =>
  seal({ type: 'Mention', href, name });

export interface NoteInput {
  readonly id?: string;
  readonly actor: string;
  readonly inReplyTo?: string;
  readonly to?: readonly string[];
  readonly cc?: readonly string[];
  readonly published?: string;
  readonly content: string;
  readonly url?: Activity;
  readonly tag?: readonly Activity[];
}

/** The Note's fields without a context: the form it takes when embedded as a Create's object (section 2.12.1). */
const noteFields = (input: NoteInput): Activity => ({
  id: input.id,
  type: 'Note',
  attributedTo: input.actor,
  inReplyTo: input.inReplyTo,
  to: input.to === undefined ? undefined : [...input.to],
  cc: input.cc === undefined ? undefined : [...input.cc],
  published: input.published,
  content: input.content,
  url: input.url,
  tag: input.tag === undefined ? undefined : [...input.tag],
});

export const note = (input: NoteInput): Activity => seal({ '@context': AS2, ...noteFields(input) });


export interface CreateInput {
  readonly id?: string;
  readonly actor: string;
  readonly object: Activity;
  readonly to?: readonly string[];
  readonly published?: string;
}

/** Create: the originator mints a ULI by posting it to the thread (section 2.7). */
export const create = (input: CreateInput): Activity =>
  seal({
    '@context': AS2,
    id: input.id,
    type: 'Create',
    actor: input.actor,
    object: input.object,
    to: input.to === undefined ? undefined : [...input.to],
    published: input.published,
  });

export interface TombstoneInput {
  /** The identifier of the Note that created the retired ULI (section 2.12.3). */
  readonly id: string;
  readonly actor: string;
  readonly inReplyTo: string;
  readonly deleted: string;
  readonly retiredUli: string;
  readonly successorUli: string;
}

/**
 * A Tombstone with a redirect. The retired ULI appears in `content` and the
 * successor is the `url`: a URN, not a resolvable link, so nothing identifying
 * rides the wire (sections 2.2 and 2.12.3).
 */
export const tombstone = (input: TombstoneInput): Activity =>
  seal({
    '@context': AS2,
    id: input.id,
    type: 'Tombstone',
    formerType: 'Note',
    deleted: input.deleted,
    attributedTo: input.actor,
    inReplyTo: input.inReplyTo,
    content: `ULI Retired: ${input.retiredUli}`,
    url: seal({ type: 'Link', href: input.successorUli }),
  });

/* The RCP-54 shapes of section 2.12, as named builders. */

export const CONTENT = {
  request: 'ULI Resolution Request',
  noMatch: 'No Match',
  matchesFound: 'Matches Found',
  created: 'ULI Created',
} as const;

export interface BroadcastInput {
  readonly id?: string;
  readonly actor: string;
  readonly href: string;
  readonly published?: string;
  /** Actor URLs of the mandatory resolvers, each named with a Mention. */
  readonly mandatory?: readonly string[];
  /** A rebroadcast into an existing thread (a decline, section 2.7) replies to its root. */
  readonly inReplyTo?: string;
  readonly to?: string;
}

/** Section 2.12.1: one Note per member, addressed to the resolver collection, the record behind a link. */
export const broadcastNote = (input: BroadcastInput): Activity =>
  note({
    id: input.id,
    actor: input.actor,
    inReplyTo: input.inReplyTo,
    to: [input.to ?? RESOLVERS_COLLECTION],
    published: input.published,
    content: CONTENT.request,
    url: payloadLink({ href: input.href }),
    tag: (input.mandatory ?? []).map((href) => mention({ href })),
  });

export interface ReplyInput {
  readonly id?: string;
  readonly actor: string;
  readonly inReplyTo: string;
  readonly published?: string;
}

/** A no-match reply carries no `url` (section 2.12.1). */
export const noMatchReply = (input: ReplyInput): Activity =>
  note({ ...input, content: CONTENT.noMatch });

/** A match reply links to the resolution payload; the score rides there, never here (section 2.5). */
export const matchReply = (input: ReplyInput & { readonly href: string }): Activity =>
  note({ id: input.id, actor: input.actor, inReplyTo: input.inReplyTo, published: input.published, content: CONTENT.matchesFound, url: payloadLink({ href: input.href }) });

export interface CreatedInput {
  readonly createId?: string;
  /** The created Note's own identifier, which a later tombstone references. */
  readonly noteId: string;
  readonly actor: string;
  readonly inReplyTo: string;
  readonly href: string;
  readonly published?: string;
  readonly content?: string;
}

/** Section 2.12.1: the Create that posts a minted ULI to the thread. */
export const uliCreated = (input: CreatedInput): Activity =>
  create({
    id: input.createId,
    actor: input.actor,
    published: input.published,
    object: seal(
      noteFields({
        id: input.noteId,
        actor: input.actor,
        inReplyTo: input.inReplyTo,
        content: input.content ?? CONTENT.created,
        url: payloadLink({ href: input.href }),
      })
    ),
  });

/* Threads: `inReplyTo` is the only threading mechanism the specification uses. */

export interface ThreadNode {
  readonly activity: Activity;
  readonly replies: readonly ThreadNode[];
}

const isObject = (v: unknown): v is JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A string property of the activity, or of its object: a Create is threaded by the Note it carries. */
const stringOf = (a: Activity, key: string): string | undefined => {
  const direct = a[key];
  if (typeof direct === 'string') return direct;
  const object = a['object'];
  return isObject(object) && typeof object[key] === 'string' ? object[key] : undefined;
};

const idOf = (a: Activity): string | undefined => stringOf(a, 'id');
const parentOf = (a: Activity): string | undefined => stringOf(a, 'inReplyTo');

/** Assemble roots with nested replies, in the order given. A reply whose parent is absent is a root, so a partial view still renders. */
export const thread = (activities: readonly Activity[]): readonly ThreadNode[] => {
  const children = new Map<string, Activity[]>();
  const ids = new Set(activities.map(idOf).filter((x): x is string => x !== undefined));
  const roots = activities.filter((a) => {
    const parent = parentOf(a);
    if (parent !== undefined && ids.has(parent) && idOf(a) !== parent) {
      children.set(parent, [...(children.get(parent) ?? []), a]);
      return false;
    }
    return true;
  });
  const build = (a: Activity): ThreadNode => {
    const id = idOf(a);
    return { activity: a, replies: (id === undefined ? [] : (children.get(id) ?? [])).map(build) };
  };
  return roots.map(build);
};

export interface Conformance {
  readonly activities: number;
  readonly pureAS2: boolean;
  readonly impure: readonly { readonly id: string | undefined; readonly term: string }[];
  readonly contextCorrect: boolean;
  readonly badContext: readonly (string | undefined)[];
}

/** Section 2.2 is checkable, so a node can state that it verified rather than assert that it complies. */
export const conformance = (activities: readonly Activity[]): Conformance => {
  const impure = activities.flatMap((a) => purity(a).map((term) => ({ id: idOf(a), term })));
  const badContext = activities.filter((a) => !contextOk(a)).map(idOf);
  return { activities: activities.length, pureAS2: impure.length === 0, impure, contextCorrect: badContext.length === 0, badContext };
};
