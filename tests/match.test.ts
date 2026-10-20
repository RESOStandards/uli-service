import { describe, expect, it } from 'vitest';
import { compareRanked, matchesAtOrAboveThreshold, rankCandidates } from '../src/sdk/match.js';
import { JANE_P1, JANE_P8, SEED_A1, SEED_B1, SEED_B2 } from './fixtures.js';

const candidates = [
  { key: 'B-2', record: SEED_B2 },
  { key: 'B-1', record: SEED_B1, uli: 'urn:reso:uli:1.0:urn:reso:uoi:1.0:T00000012:M00000002:n:s' },
  { key: 'A-1', record: SEED_A1 },
];

describe('ranking', () => {
  it('scores every candidate and orders by score, so retrieval order never leaks into the result', () => {
    const ranked = rankCandidates(SEED_A1, candidates, undefined, { excludeKey: 'A-1' });
    expect(ranked.map((r) => r.key)).toEqual(['B-1', 'B-2']);
    expect(ranked[0].result.band).toBe('possible match');
    expect(ranked[1].result.band).toBe('rejected');
  });

  it('leaves the query record itself out', () => {
    const ranked = rankCandidates(SEED_A1, candidates, undefined, { excludeKey: 'A-1' });
    expect(ranked.find((r) => r.key === 'A-1')).toBeUndefined();
  });

  it('excludes the ULIs a merge broadcast retires (section 2.7)', () => {
    const ranked = rankCandidates(SEED_A1, candidates, undefined, {
      excludeKey: 'A-1',
      excludeUlis: ['urn:reso:uli:1.0:urn:reso:uoi:1.0:T00000012:M00000002:n:s'],
    });
    expect(ranked.map((r) => r.key)).toEqual(['B-2']);
  });

  it('breaks ties deterministically: primaries matched, then key ascending', () => {
    const twin = [
      { key: 'Z', record: JANE_P8 },
      { key: 'A', record: JANE_P8 },
    ];
    const ranked = rankCandidates(JANE_P1, twin);
    expect(ranked.map((r) => r.key)).toEqual(['A', 'Z']);
    expect(compareRanked(ranked[0], ranked[1])).toBeLessThan(0);
  });

  it('only candidates in the possible-match band may be replied with (section 2.5)', () => {
    const ranked = rankCandidates(SEED_A1, candidates, undefined, { excludeKey: 'A-1' });
    expect(matchesAtOrAboveThreshold(ranked).map((r) => r.key)).toEqual(['B-1']);
  });
});
