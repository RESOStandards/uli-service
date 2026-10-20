import { describe, expect, it } from 'vitest';
import { generateKeyPair, mintUli, newNonce, parseUli, publicKeyOf, signedString, verifyUli } from '../src/sdk/uli.js';
import { SPEC_ULI } from './fixtures.js';

const keysFor = (table: Readonly<Record<string, readonly string[]>>) => (uoi: string) => table[uoi] ?? [];

describe('section 2.8 worked example, real reproducible values', () => {
  it('parses into twelve segments by position', () => {
    const p = parseUli(SPEC_ULI.uli);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.value.uoi).toBe(SPEC_ULI.uoi);
    expect(p.value.nonce).toBe(SPEC_ULI.nonce);
    expect(p.value.signature).toBe(SPEC_ULI.signature);
    expect(p.value.signed).toBe(SPEC_ULI.signed);
  });

  it('the signed bytes are 66 bytes of US-ASCII and the signature is 86 characters', () => {
    expect(Buffer.byteLength(SPEC_ULI.signed, 'ascii')).toBe(66);
    expect(SPEC_ULI.signature).toHaveLength(86);
    expect(signedString(SPEC_ULI.uoi, SPEC_ULI.nonce)).toBe(SPEC_ULI.signed);
  });

  it('verifies against the published key', () => {
    const v = verifyUli(SPEC_ULI.uli, keysFor({ [SPEC_ULI.uoi]: [SPEC_ULI.publicKey] }));
    expect(v.ok).toBe(true);
    expect(v.uoi).toBe(SPEC_ULI.uoi);
  });

  it('verifies with the prefix in any case, because signing takes it lowercase', () => {
    const shouted = SPEC_ULI.uli.replace('urn:reso:uli:1.0', 'URN:RESO:ULI:1.0');
    expect(verifyUli(shouted, keysFor({ [SPEC_ULI.uoi]: [SPEC_ULI.publicKey] })).ok).toBe(true);
  });

  it('fails when anything after the version is case-folded', () => {
    const folded = SPEC_ULI.uli.toLowerCase();
    expect(verifyUli(folded, keysFor({ [SPEC_ULI.uoi.toLowerCase()]: [SPEC_ULI.publicKey] })).ok).toBe(false);
  });

  it('fails against another organization key', () => {
    const other = generateKeyPair();
    expect(verifyUli(SPEC_ULI.uli, keysFor({ [SPEC_ULI.uoi]: [other.publicKey] })).ok).toBe(false);
  });

  it('fails when the governance feed holds no key for the minter', () => {
    const v = verifyUli(SPEC_ULI.uli, keysFor({}));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/no certified key/);
  });

  it('verifies against any of several keys an organization has held', () => {
    const rotated = generateKeyPair();
    expect(verifyUli(SPEC_ULI.uli, keysFor({ [SPEC_ULI.uoi]: [rotated.publicKey, SPEC_ULI.publicKey] })).ok).toBe(true);
  });
});

describe('minting', () => {
  const uoi = 'urn:reso:uoi:1.0:T00000012:M00000001';
  const pair = generateKeyPair();

  it('produces a ULI that verifies against the minter key and parses to the minter', () => {
    const uli = mintUli({ uoi, privateKeyPem: pair.privateKeyPem });
    const v = verifyUli(uli, keysFor({ [uoi]: [pair.publicKey] }));
    expect(v.ok).toBe(true);
    expect(v.uoi).toBe(uoi);
  });

  it('the public key published is the one that signs', () => {
    expect(publicKeyOf(pair.privateKeyPem)).toBe(pair.publicKey);
  });

  it('draws a twelve-character base64url nonce, the length the example uses', () => {
    const n = newNonce();
    expect(n).toHaveLength(12);
    expect(n).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newNonce()).not.toBe(n);
  });

  it('is unique by nonce, not by signature', () => {
    const a = mintUli({ uoi, privateKeyPem: pair.privateKeyPem });
    const b = mintUli({ uoi, privateKeyPem: pair.privateKeyPem });
    expect(a).not.toBe(b);
    const nonce = 'nyxKF6Gyw9Re';
    expect(mintUli({ uoi, privateKeyPem: pair.privateKeyPem, nonce })).toBe(mintUli({ uoi, privateKeyPem: pair.privateKeyPem, nonce }));
  });
});

describe('parsing refuses malformed identifiers', () => {
  it('wrong segment count', () => {
    const p = parseUli('urn:reso:uli:1.0:M00000001:nonce:sig');
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.reason).toMatch(/exactly 12/);
  });

  it('wrong prefix', () => {
    const p = parseUli(SPEC_ULI.uli.replace('urn:reso:uli:1.0', 'urn:reso:uli:2.0'));
    expect(p.ok).toBe(false);
  });

  it('short signature', () => {
    const p = parseUli(`${SPEC_ULI.signed}:abc`);
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.reason).toMatch(/86/);
  });

  it('a signature with padding or a non-url alphabet', () => {
    expect(parseUli(`${SPEC_ULI.signed}:${SPEC_ULI.signature.slice(0, 84)}==`).ok).toBe(false);
    expect(parseUli(`${SPEC_ULI.signed}:${SPEC_ULI.signature.replace('-', '+')}`).ok).toBe(false);
  });
});
