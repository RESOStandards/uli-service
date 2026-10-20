/**
 * Signing and self-verification, section 2.8.
 *
 * A ULI is `urn:reso:uli:1.0:<uoi>:<nonce>:<signature>`: twelve colon-separated
 * segments, the four-segment prefix, the six-segment UOI of RCP-55, a base64url
 * nonce and an Ed25519 signature, base64url without padding, 86 characters.
 *
 * What is signed is the US-ASCII bytes of the identifier up to and excluding
 * the signature, with the scheme and version prefix in lowercase. Everything
 * after the version is case-sensitive, so a ULI is never case-folded; only the
 * prefix is taken lowercase, for signing and verification alike.
 *
 * The signature proves origin, not consensus (section 2.8): that a certified
 * organization minted the identifier. Nothing about the licensee is signed.
 */

import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject, randomBytes, sign, verify } from 'node:crypto';

export const ULI_PREFIX = 'urn:reso:uli:1.0';
const PREFIX_SEGMENTS = 4;
const UOI_SEGMENTS = 6;
const TOTAL_SEGMENTS = PREFIX_SEGMENTS + UOI_SEGMENTS + 2;
const SIGNATURE_LENGTH = 86;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface ParsedUli {
  readonly uoi: string;
  readonly nonce: string;
  readonly signature: string;
  /** The exact bytes that were signed, as a string: the prefix lowercase, the rest as carried. */
  readonly signed: string;
}

export type ParseResult = { readonly ok: true; readonly value: ParsedUli } | { readonly ok: false; readonly reason: string };

/** The string the minter signs: `urn:reso:uli:1.0:<uoi>:<nonce>`, prefix lowercase. */
export const signedString = (uoi: string, nonce: string): string => `${ULI_PREFIX}:${uoi}:${nonce}`;

/** Twelve characters of base64url, nine random bytes: the length section 2.8's example uses. */
export const newNonce = (): string => randomBytes(9).toString('base64url');

/** Parse by position, as section 2.8 instructs: last is the signature, before it the nonce, between prefix and nonce the UOI. */
export const parseUli = (uli: string): ParseResult => {
  const segments = uli.split(':');
  if (segments.length !== TOTAL_SEGMENTS) {
    return { ok: false, reason: `a ULI has exactly ${TOTAL_SEGMENTS} colon-separated segments; this has ${segments.length}` };
  }
  const prefix = segments.slice(0, PREFIX_SEGMENTS).join(':');
  if (prefix.toLowerCase() !== ULI_PREFIX) {
    return { ok: false, reason: `prefix ${prefix} is not ${ULI_PREFIX} (compared case-insensitively)` };
  }
  const uoi = segments.slice(PREFIX_SEGMENTS, PREFIX_SEGMENTS + UOI_SEGMENTS).join(':');
  const nonce = segments[TOTAL_SEGMENTS - 2];
  const signature = segments[TOTAL_SEGMENTS - 1];
  if (nonce === '' || !BASE64URL.test(nonce)) return { ok: false, reason: 'nonce is not base64url' };
  if (signature.length !== SIGNATURE_LENGTH || !BASE64URL.test(signature)) {
    return { ok: false, reason: `signature must be ${SIGNATURE_LENGTH} base64url characters` };
  }
  return { ok: true, value: { uoi, nonce, signature, signed: signedString(uoi, nonce) } };
};

export interface KeyPair {
  /** Raw 32-byte Ed25519 public key, base64url: the form the governance feed publishes. */
  readonly publicKey: string;
  /** PKCS#8 PEM, the form a node keeps privately. */
  readonly privateKeyPem: string;
}

export const generateKeyPair = (): KeyPair => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { publicKey: rawPublicKey(publicKey), privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
};

const rawPublicKey = (key: KeyObject): string => {
  const jwk = key.export({ format: 'jwk' });
  if (typeof jwk.x !== 'string') throw new Error('not an Ed25519 public key');
  return jwk.x;
};

const publicKeyFromRaw = (raw: string): KeyObject =>
  createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: raw }, format: 'jwk' });

/** The raw public key that belongs to a private key, so a node can publish what it signs with. */
export const publicKeyOf = (privateKeyPem: string): string => rawPublicKey(createPublicKey(createPrivateKey(privateKeyPem)));

export interface MintInput {
  readonly uoi: string;
  readonly privateKeyPem: string;
  /** Supplied only to reproduce a known identifier; otherwise drawn fresh. */
  readonly nonce?: string;
}

/** Mint: draw a nonce, sign the prefix bytes, append the signature. */
export const mintUli = (input: MintInput): string => {
  const nonce = input.nonce ?? newNonce();
  const signed = signedString(input.uoi, nonce);
  const signature = sign(null, Buffer.from(signed, 'ascii'), createPrivateKey(input.privateKeyPem)).toString('base64url');
  return `${signed}:${signature}`;
};

export interface Verification {
  readonly ok: boolean;
  readonly uoi?: string;
  readonly reason: string;
}

/**
 * Verify a ULI against the minting organization's certified keys. Where an
 * organization has had more than one key, a signature matching any verifies
 * (section 2.8). `keysFor` is the governance feed lookup, injected so this stays
 * offline and pure.
 */
export const verifyUli = (uli: string, keysFor: (uoi: string) => readonly string[]): Verification => {
  const parsed = parseUli(uli);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const { uoi, signed, signature } = parsed.value;
  const keys = keysFor(uoi);
  if (keys.length === 0) return { ok: false, uoi, reason: `no certified key on the governance feed for ${uoi}` };
  const bytes = Buffer.from(signed, 'ascii');
  const sig = Buffer.from(signature, 'base64url');
  const verified = keys.some((raw) => {
    try {
      return verify(null, bytes, publicKeyFromRaw(raw), sig);
    } catch {
      return false;
    }
  });
  return verified
    ? { ok: true, uoi, reason: `signature verifies against a certified key of ${uoi}` }
    : { ok: false, uoi, reason: 'signature does not verify against any certified key of the minting organization' };
};
