import { describe, expect, it } from 'vitest';
import { coMatchablePrimaries, DEFAULT_WEIGHTS, derivedThreshold, invariants, type WeightSet } from '../src/sdk/weights.js';

/**
 * The threshold is derived, never hardcoded. These tests are the argument:
 * the naive reading of the table gives 1225, the co-matchable reading gives
 * 1250, and the specification's 1300 is neither.
 */
describe('derived threshold', () => {
  it('is the sum of the two smallest co-matchable primaries: 600 + 650 = 1250', () => {
    expect(derivedThreshold(DEFAULT_WEIGHTS)).toBe(1250);
    expect(invariants().derivation).toBe('600 + 650, the two smallest co-matchable primaries');
  });

  it('refutes the naive answer: the two smallest raw weights are both license forms, which no candidate matches together', () => {
    const raw = Object.values(DEFAULT_WEIGHTS.primary).sort((a, b) => a - b);
    expect(raw[0] + raw[1]).toBe(1225);
    expect(derivedThreshold()).not.toBe(1225);
  });

  it('is not the 1300 the specification prints in section 2.9', () => {
    expect(derivedThreshold()).not.toBe(1300);
  });

  it('lists the license cluster once, at its minimum', () => {
    expect([...coMatchablePrimaries()]).toEqual([600, 650, 700, 800]);
  });

  it('reproduces 1300 for the historical three-primary set, which is where 1300 came from', () => {
    const historical: WeightSet = {
      ...DEFAULT_WEIGHTS,
      primary: { NRDS: 800, FullName: 700, LicenseNS: 600 },
      primaryClusters: {},
    };
    expect(derivedThreshold(historical)).toBe(1300);
  });

  it('moves when a weight moves, with no constant to forget', () => {
    const refit: WeightSet = { ...DEFAULT_WEIGHTS, primary: { ...DEFAULT_WEIGHTS.primary, FullNickname: 640 } };
    expect(derivedThreshold(refit)).toBe(1240);
  });

  it('refuses a set with fewer than two co-matchable primaries', () => {
    const one: WeightSet = { ...DEFAULT_WEIGHTS, primary: { NRDS: 800 }, primaryClusters: {} };
    expect(() => derivedThreshold(one)).toThrow(/at least two/);
  });
});

describe('the three invariants', () => {
  it('hold for the default weights', () => {
    const inv = invariants();
    expect(inv.threshold).toBe(1250);
    expect(inv.twoPrimariesAlwaysClear).toBe(true);
    expect(inv.noSinglePrimaryReachesThreshold).toBe(true);
    expect(inv.secondariesCannotSubstitute).toBe(true);
    expect(inv.holds).toBe(true);
  });

  it('secondary headroom is the threshold less the strongest primary and every secondary counted once per cluster', () => {
    // 1250 - 800 - (100 office cluster + 10 x 5 singles) = 300
    expect(invariants().secondaryHeadroom).toBe(300);
  });

  it('fail loudly when secondaries could substitute for a primary', () => {
    const inflated: WeightSet = { ...DEFAULT_WEIGHTS, secondary: { ...DEFAULT_WEIGHTS.secondary, OfficeId: 500 } };
    const inv = invariants(inflated);
    expect(inv.secondariesCannotSubstitute).toBe(false);
    expect(inv.holds).toBe(false);
  });

  it('fail loudly when one primary alone reaches the threshold', () => {
    const lopsided: WeightSet = { ...DEFAULT_WEIGHTS, primary: { ...DEFAULT_WEIGHTS.primary, NRDS: 1300 } };
    expect(invariants(lopsided).noSinglePrimaryReachesThreshold).toBe(false);
  });
});
