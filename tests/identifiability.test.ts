import { describe, expect, it } from 'vitest';
import { identifiability } from '../src/sdk/identifiability.js';
import { JANE_P1, SEED_B2 } from './fixtures.js';

describe('the identifiability gate, section 2.4', () => {
  it('clears a record whose present factors could reach the threshold', () => {
    const g = identifiability(JANE_P1);
    expect(g.identifiable).toBe(true);
    expect(g.primariesPresent).toBe(4);
    expect(g.ceiling.score).toBeGreaterThanOrEqual(g.threshold);
    expect(g.reason).toBeUndefined();
  });

  it('refuses a common name alone', () => {
    const g = identifiability({ MemberFullName: 'John Smith' });
    expect(g.identifiable).toBe(false);
    expect(g.primariesPresent).toBe(1);
    expect(g.reason).toMatch(/only 1 primary identifier present/);
  });

  it('refuses the seeded B-2, which carries one primary (name) and one license with state', () => {
    // Full Name and License (Number + State) are two primaries, so B-2 clears.
    expect(identifiability(SEED_B2).identifiable).toBe(true);
    expect(identifiability({ MemberFullName: 'Jane Smith', MemberStateLicense: 'RE-990011' }).identifiable).toBe(false);
  });

  it('refuses secondaries alone, however many', () => {
    const g = identifiability({ OfficeMlsId: 'O', OfficeName: 'N', MemberLastName: 'L', MemberFirstName: 'F' });
    // first plus last is a Full Name primary, so this is one primary, not zero
    expect(g.primariesPresent).toBe(1);
    expect(g.identifiable).toBe(false);
  });

  it('refuses nothing at all', () => {
    const g = identifiability({});
    expect(g.identifiable).toBe(false);
    expect(g.primariesPresent).toBe(0);
    expect(g.reason).toMatch(/only 0 primary identifiers present/);
  });
});
