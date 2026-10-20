import { describe, expect, it } from 'vitest';
import { blockKey, surnameKeyPrefix } from '../src/sdk/blocking.js';
import { SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

describe('the block key', () => {
  it('is lowercase surname, a pipe, the state as published: the seeded form', () => {
    expect(blockKey(SEED_A1)).toBe('smith|IN');
    expect(blockKey(SEED_B1)).toBe('smith|IN');
    expect(blockKey(SEED_B2)).toBe('smith|IN');
    expect(blockKey({ MemberLastName: ' SMITH ', MemberStateLicenseState: 'in' })).toBe('smith|IN');
  });

  it('is absent without both parts', () => {
    expect(blockKey({ MemberLastName: 'Smith' })).toBeUndefined();
    expect(blockKey({ MemberStateLicenseState: 'IN' })).toBeUndefined();
    expect(blockKey({})).toBeUndefined();
  });

  it('offers the surname prefix for a record with no state', () => {
    expect(surnameKeyPrefix({ MemberLastName: 'Smith' })).toBe('smith|');
    expect(surnameKeyPrefix({})).toBeUndefined();
  });
});
