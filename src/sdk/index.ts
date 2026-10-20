/**
 * @reso-standards/reso-uli
 *
 * The RCP-54 protocol logic, pure: scoring, matching, consensus, the
 * identifiability gate, signing and verification, Activity Streams building and
 * RCF payloads. Nothing here touches a network or an index; the adapters do.
 */

export { ULI_FIELDS, ULI_IDENTIFIER_FIELD, isUliField, uliSubset } from './fields.js';
export type { UliField, LicenseeRecord } from './fields.js';

export { DEFAULT_WEIGHTS, coMatchablePrimaries, derivedThreshold, invariants } from './weights.js';
export type { WeightSet, Tier, Invariants } from './weights.js';

export { normalize, agreements, fieldAgreements, score } from './score.js';
export type { Band, BreakdownEntry, ScoreResult, Agreements } from './score.js';

export { identifiability } from './identifiability.js';
export type { Identifiability } from './identifiability.js';

export { blockKey, surnameKeyPrefix, BLOCK_SEPARATOR } from './blocking.js';

export { rankCandidates, compareRanked, matchesAtOrAboveThreshold } from './match.js';
export type { Candidate, Ranked, RankOptions } from './match.js';

export { tally, consensusCount } from './consensus.js';
export type { Reply, MatchReply, NoMatchReply, Tally, TallyInput } from './consensus.js';

export { ULI_PREFIX, signedString, newNonce, parseUli, generateKeyPair, publicKeyOf, mintUli, verifyUli } from './uli.js';
export type { ParsedUli, ParseResult, KeyPair, MintInput, Verification } from './uli.js';

export {
  AS2, PUBLIC, RESOLVERS_COLLECTION, CONTENT, unknownTypes,
  purity, contextOk, payloadLink, mention, note, create, tombstone,
  broadcastNote, noMatchReply, matchReply, uliCreated, thread, conformance,
} from './activities.js';
export type { Activity, Json, ThreadNode, Conformance } from './activities.js';

export { rcfContext, memberPayload, resolutionPayload, checkMemberPayload } from './rcf.js';
export type { RcfPayload, ResolutionPayload, PayloadCheck } from './rcf.js';
