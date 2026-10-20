import { describe, expect, it } from 'vitest';
import { checkMemberPayload, memberPayload, resolutionPayload } from '../src/sdk/rcf.js';
import { uliSubset } from '../src/sdk/fields.js';
import { JANE_P1, JANE_P8, SPEC_ULI } from './fixtures.js';

describe('RCF payloads', () => {
  it('a Member payload names the resource and version in @reso.context (section 2.12.1)', () => {
    const p = memberPayload([JANE_P1]);
    expect(p['@reso.context']).toBe('urn:reso:metadata:2.0:resource:member');
    expect(p.value).toHaveLength(1);
    expect(p.value[0]).toEqual(JANE_P1);
    expect(checkMemberPayload(p).ok).toBe(true);
  });

  it('a resolution payload carries the ULI, the score and the bound candidate (section 2.12.2)', () => {
    const r = resolutionPayload(SPEC_ULI.uli, 1450, JANE_P8);
    expect(r.uli).toBe(SPEC_ULI.uli);
    expect(r.score).toBe(1450);
    expect(r.licensee.value[0].UniqueLicenseeIdentifier).toBe(SPEC_ULI.uli);
    expect(checkMemberPayload(r.licensee).ok).toBe(true);
  });

  it('strips anything that is not a ULI field, so index bookkeeping never leaves the node', () => {
    const subset = uliSubset({ ...JANE_P1, blockKey: 'smith|CA', recordKey: 'A-1', uoi: 'M1', ingestedAt: 'now' });
    expect(Object.keys(subset)).not.toContain('blockKey');
    expect(Object.keys(subset)).not.toContain('recordKey');
    expect(subset.MemberFullName).toBe('Jane A Smith');
  });

  it('the check refuses the invented 2022 field name', () => {
    const c = checkMemberPayload({ '@reso.context': 'urn:reso:metadata:2.0:resource:member', value: [{ MemberMiddleInitial: 'A' }] });
    expect(c.ok).toBe(false);
    expect(c.problems[0]).toMatch(/MemberMiddleInitial is not a ULI field/);
  });

  it('the check refuses a wrong context shape', () => {
    expect(checkMemberPayload({ '@reso.context': 'urn:reso:metadata:2.0', value: [] }).ok).toBe(false);
    expect(checkMemberPayload({ value: [] }).ok).toBe(false);
    expect(checkMemberPayload('x').ok).toBe(false);
  });
});
