import { describe, expect, it } from 'vitest';
import { localGovernance, uoiUrn } from '../src/node/governance.js';

const entry = (uoi: string, status: 'active' | 'inactive' | 'noncompliant' = 'active') =>
  ({ uoi, uoiUrn: uoiUrn(uoi), actor: `http://n/${uoi}`, publicKeys: ['k'], status, certified: true }) as const;

describe('the governance feed, section 2.10', () => {
  it('R is certified, compliant and active', () => {
    const g = localGovernance({ resolvers: [entry('A'), entry('B', 'inactive'), entry('C', 'noncompliant'), { ...entry('D'), certified: false }] });
    expect(g.pool()).toEqual(['A']);
  });

  it('every event advances the position, which is what a broadcast pins', () => {
    const g = localGovernance({ resolvers: [entry('A')] });
    const p0 = g.feedPosition();
    g.register(entry('B'));
    g.setStatus('B', 'inactive');
    expect(g.feedPosition()).toBe(p0 + 2);
    expect(g.pool()).toEqual(['A']);
  });

  it('keys are looked up by the UOI URN the identifier carries', () => {
    const g = localGovernance({ resolvers: [entry('M00000001')] });
    expect(g.keysFor('urn:reso:uoi:1.0:T00000012:M00000001')).toEqual(['k']);
    expect(g.keysFor('M00000001')).toEqual([]);
  });

  it('parameters carry the derived threshold and invariants', () => {
    const p = localGovernance().parameters();
    expect(p.threshold).toBe(1250);
    expect(p.invariants.holds).toBe(true);
  });

  it('uoiUrn passes a URN through and wraps a tenant key', () => {
    expect(uoiUrn('M00000001')).toBe('urn:reso:uoi:1.0:T00000012:M00000001');
    expect(uoiUrn('urn:reso:uoi:1.0:T00000099:X')).toBe('urn:reso:uoi:1.0:T00000099:X');
  });
});
