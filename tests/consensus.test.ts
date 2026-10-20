import { describe, expect, it } from 'vitest';
import { consensusCount, tally } from '../src/sdk/consensus.js';

const T = 1250;
const pool = ['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
const no = (resolver: string) => ({ resolver, kind: 'no-match' as const });
const match = (resolver: string, uli: string, score: number) => ({ resolver, kind: 'match' as const, uli, score });

describe('floor(2/3 x R)', () => {
  it('is floor, not ceiling (section 6)', () => {
    expect(consensusCount(7)).toBe(4);
    expect(consensusCount(3)).toBe(2);
    expect(consensusCount(4)).toBe(2);
    expect(consensusCount(5)).toBe(3);
  });

  it('is zero for R of one, so a lone node reaches consensus on no replies (a finding, not a feature)', () => {
    expect(consensusCount(1)).toBe(0);
    const t = tally({ pool: ['only'], mandatory: [], replies: [], threshold: T });
    expect(t.reached).toBe(true);
    expect(t.outcome).toBe('mint');
  });
});

describe('tally', () => {
  it('is not reached until floor(2/3 x R) members of the pool have replied', () => {
    const t = tally({ pool, mandatory: [], replies: [no('P2'), no('P3'), no('P4')], threshold: T });
    expect(t.needed).toBe(4);
    expect(t.replied).toBe(3);
    expect(t.reached).toBe(false);
    expect(t.outcome).toBeUndefined();
  });

  it('mints on a no-match consensus (section 2.12.1)', () => {
    const t = tally({ pool, mandatory: [], replies: [no('P2'), no('P3'), no('P4'), no('P5')], threshold: T });
    expect(t.reached).toBe(true);
    expect(t.outcome).toBe('mint');
  });

  it('adopts the highest-scoring match over threshold (section 2.12.2)', () => {
    const t = tally({
      pool,
      mandatory: [],
      replies: [match('P8', 'urn:9f2c', 1450), no('P2'), no('P3'), match('P5', 'urn:a1b2', 1300)],
      threshold: T,
    });
    expect(t.outcome).toBe('adopt');
    expect(t.best?.uli).toBe('urn:9f2c');
    expect(t.matches.map((m) => m.resolver)).toEqual(['P8', 'P5']);
  });

  it('counts a reply only once per resolver', () => {
    const t = tally({ pool, mandatory: [], replies: [no('P2'), no('P2'), no('P2'), no('P2')], threshold: T });
    expect(t.replied).toBe(1);
    expect(t.reached).toBe(false);
  });

  it('ignores a reply from outside the pinned pool', () => {
    const t = tally({ pool, mandatory: [], replies: [no('P2'), no('P3'), no('P4'), no('stranger')], threshold: T });
    expect(t.replied).toBe(3);
    expect(t.reached).toBe(false);
  });

  it('the mandatory condition is absolute: the count alone is not consensus', () => {
    const t = tally({ pool, mandatory: ['P8'], replies: [no('P2'), no('P3'), no('P4'), no('P5'), no('P6')], threshold: T });
    expect(t.replied).toBe(5);
    expect(t.mandatoryMissing).toEqual(['P8']);
    expect(t.reached).toBe(false);
  });

  it('mandatory replies count toward the floor', () => {
    const t = tally({ pool, mandatory: ['P8', 'P7'], replies: [no('P8'), no('P7'), no('P2'), no('P3')], threshold: T });
    expect(t.reached).toBe(true);
  });

  it('a mandatory resolver pruned from the pool no longer blocks (section 2.6)', () => {
    const pruned = pool.filter((p) => p !== 'P8');
    const t = tally({ pool: pruned, mandatory: ['P8'], replies: [no('P2'), no('P3'), no('P4'), no('P5')], threshold: T });
    expect(t.needed).toBe(4);
    expect(t.mandatoryMissing).toEqual([]);
    expect(t.reached).toBe(true);
  });

  it('a match below the threshold never becomes the outcome', () => {
    const t = tally({ pool, mandatory: [], replies: [match('P8', 'urn:x', 1200), no('P2'), no('P3'), no('P4')], threshold: T });
    expect(t.reached).toBe(true);
    expect(t.outcome).toBe('mint');
    expect(t.matches).toEqual([]);
  });

  it('breaks an equal-score tie on the ULI string, so every node picks the same one', () => {
    const t = tally({ pool, mandatory: [], replies: [match('P8', 'urn:b', 1400), match('P5', 'urn:a', 1400), no('P2'), no('P3')], threshold: T });
    expect(t.best?.uli).toBe('urn:a');
  });
});
