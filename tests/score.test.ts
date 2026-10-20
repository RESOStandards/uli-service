import { describe, expect, it } from 'vitest';
import { agreements, fieldAgreements, normalize, score } from '../src/sdk/score.js';
import { DEFAULT_WEIGHTS } from '../src/sdk/weights.js';
import { CHEN_JR_CLONED, CHEN_SR, JANE_P1, JANE_P8, SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

describe('normalization, pinned', () => {
  it('trims and case-folds, and treats empty as absent', () => {
    expect(normalize('  Smith ')).toBe('smith');
    expect(normalize('')).toBeUndefined();
    expect(normalize('   ')).toBeUndefined();
    expect(normalize(null)).toBeUndefined();
    expect(normalize(undefined)).toBeUndefined();
    expect(normalize(12)).toBe('12');
  });
});

describe('agreements are exact on normalized values', () => {
  it('Full Name agrees on the full name or on first plus last', () => {
    expect(agreements(JANE_P1, JANE_P8).FullName).toBe(true); // full names differ, first and last agree
    expect(agreements({ MemberFullName: 'Jane Smith' }, { MemberFullName: 'jane smith' }).FullName).toBe(true);
    expect(agreements({ MemberFullName: 'Jane Smith' }, { MemberFirstName: 'Jane' }).FullName).toBe(false);
  });

  it('Full Nickname needs nickname and last name on both sides', () => {
    expect(agreements(SEED_A1, SEED_B1).FullNickname).toBe(false); // A-1 has no nickname
    expect(agreements(SEED_B1, { MemberNickname: 'johnny', MemberLastName: 'SMITH' }).FullNickname).toBe(true);
  });

  it('the license forms nest: number plus state, strengthened by type', () => {
    const a = agreements(SEED_A1, SEED_B1);
    expect(a.LicenseNS).toBe(true);
    expect(a.LicenseNST).toBe(false); // B-1 carries no license type
    expect(agreements(JANE_P1, JANE_P8).LicenseNST).toBe(true);
  });

  it('a missing value never agrees, even with another missing value', () => {
    expect(agreements({}, {}).NRDS).toBe(false);
    expect(agreements({ MemberMiddleName: '' }, { MemberMiddleName: '' }).MiddleName).toBe(false);
  });
});

describe('the scorer', () => {
  it('scores section 2.12.2: Jane at Provider 8 against Provider 1 as a possible match', () => {
    const r = score(JANE_P1, JANE_P8);
    // NRDS 800 + FullName 700 + FullNickname 650 + license cluster 625 + office cluster 80 + 5 x 10 singles
    expect(r.score).toBe(800 + 700 + 650 + 625 + 80 + 50);
    expect(r.band).toBe('possible match');
    expect(r.primariesMatched).toBe(4);
    expect(r.gatePassed).toBe(true);
    expect(r.threshold).toBe(1250);
  });

  it('scores a cluster at its strongest matched member, never the sum', () => {
    const r = score(JANE_P1, JANE_P8);
    const license = r.breakdown.filter((b) => b.factor === 'LicenseNST' || b.factor === 'LicenseNS');
    expect(license).toHaveLength(1);
    expect(license[0].factor).toBe('LicenseNST');
    expect(license[0].note).toBe('license cluster, strongest of 2 matched');
    const office = r.breakdown.filter((b) => b.factor === 'OfficeId' || b.factor === 'OfficeName');
    expect(office).toHaveLength(1);
    expect(office[0].factor).toBe('OfficeName');
  });

  it('a single primary identifier never clears, however many secondaries agree', () => {
    // No first, last or nickname: those would form Full Name or Full Nickname, which are primaries.
    const query = { MemberNationalAssociationId: '1', OfficeMlsId: 'O', OfficeName: 'N', MemberMiddleName: 'M', MemberStateLicenseType: 'T' };
    const r = score(query, query);
    expect(r.primariesMatched).toBe(1);
    expect(r.gatePassed).toBe(false);
    expect(r.band).toBe('review');
    expect(r.score).toBe(800 + 100 + 10 + 10);
    expect(r.score).toBeLessThan(r.threshold);
  });

  it('two primaries clear, and the weakest pair clears exactly at the threshold', () => {
    const weakest = { MemberNickname: 'Janie', MemberLastName: 'Smith', MemberStateLicense: 'X', MemberStateLicenseState: 'CA' };
    const r = score(weakest, weakest);
    // FullNickname 650 + LicenseNS 600 + LastName 10 + Nickname 10
    expect(r.primariesMatched).toBe(2);
    expect(r.score).toBe(1270);
    expect(r.band).toBe('possible match');
    const bare = score(
      { MemberNickname: 'Janie', MemberLastName: 'Smith', MemberStateLicense: 'X', MemberStateLicenseState: 'CA' },
      { MemberNickname: 'Janie', MemberLastName: 'Smith', MemberStateLicense: 'X', MemberStateLicenseState: 'CA', MemberFirstName: 'Z' }
    );
    expect(bare.score).toBe(1270);
  });

  it('rejects outright below the floor', () => {
    const r = score(SEED_A1, SEED_B2); // Smith surname only, plus nothing primary
    expect(r.score).toBe(10);
    expect(r.band).toBe('rejected');
    expect(r.primariesMatched).toBe(0);
  });

  it('scores the seeded index: A-1 and B-1 are the same person, B-2 is not', () => {
    const same = score(SEED_A1, SEED_B1);
    // NRDS 800 + LicenseNS 600 + office cluster 100 + LastName 10
    expect(same.score).toBe(1510);
    expect(same.band).toBe('possible match');
    expect(score(SEED_A1, SEED_B2).band).toBe('rejected');
    expect(score(SEED_B1, SEED_B2).band).toBe('rejected');
  });

  it('section 2.12.5: the cloned record collides on the inherited primaries and scores well over the bar', () => {
    const r = score(CHEN_JR_CLONED, CHEN_SR);
    expect(r.band).toBe('possible match');
    const factors = r.breakdown.map((b) => b.factor);
    expect(factors).toContain('NRDS');
    expect(factors).toContain('LicenseNST');
    // First and last name agree too, so Full Name is a third primary under the
    // first-plus-last rule, which the example's narrative does not mention.
    expect(factors).toContain('FullName');
    expect(r.primariesMatched).toBe(3);
  });

  it('the example scores of section 2.12 do not reproduce from the section 2.9 table (a finding)', () => {
    // Section 2.12.2 prints 1450 for Jane at Provider 8; the table over the payloads shown gives 2905.
    expect(score(JANE_P1, JANE_P8).score).toBe(2905);
    expect(score(JANE_P1, JANE_P8).score).not.toBe(1450);
    // Section 2.12.5 prints 1380 for the cloned record; NRDS plus any license form is at least 1400.
    expect(DEFAULT_WEIGHTS.primary.NRDS + DEFAULT_WEIGHTS.primary.LicenseNS).toBe(1400);
    expect(score(CHEN_JR_CLONED, CHEN_SR).score).not.toBe(1380);
  });

  it('is symmetric', () => {
    expect(score(JANE_P1, JANE_P8).score).toBe(score(JANE_P8, JANE_P1).score);
    expect(score(SEED_A1, SEED_B1).score).toBe(score(SEED_B1, SEED_A1).score);
  });

  it('is an integer with no rounding step', () => {
    const r = score(JANE_P1, JANE_P8);
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.breakdown.every((b) => Number.isInteger(b.bits))).toBe(true);
  });

  it('orders the breakdown by bits descending', () => {
    const bits = score(JANE_P1, JANE_P8).breakdown.map((b) => b.bits);
    expect(bits).toEqual([...bits].sort((a, b) => b - a));
  });
});

describe('field agreements, for display', () => {
  it('reports only fields both sides carry', () => {
    const fa = fieldAgreements(JANE_P1, JANE_P8);
    expect(fa.MemberFullName).toBe(false);
    expect(fa.MemberFirstName).toBe(true);
    expect(fa.OfficeMlsId).toBe(false);
    expect(fieldAgreements(SEED_A1, SEED_B1).MemberNickname).toBeUndefined();
  });
});
