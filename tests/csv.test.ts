import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../src/ingest/csv.js';

describe('CSV', () => {
  it('parses a header row into records', () => {
    const rows = parseCsv('MemberFullName,MemberLastName\nJane Smith,Smith\nJohn Doe,Doe\n');
    expect(rows).toEqual([
      { MemberFullName: 'Jane Smith', MemberLastName: 'Smith' },
      { MemberFullName: 'John Doe', MemberLastName: 'Doe' },
    ]);
  });

  it('handles quotes, doubled quotes, embedded commas and CRLF', () => {
    const rows = parseCsv('OfficeName,MemberNickname\r\n"Smith, Jones ""and"" Co",Janie\r\n');
    expect(rows).toEqual([{ OfficeName: 'Smith, Jones "and" Co', MemberNickname: 'Janie' }]);
  });

  it('skips blank lines and strips a byte-order mark', () => {
    const rows = parseCsv('﻿A,B\n1,2\n\n,\n3,4');
    expect(rows).toEqual([{ A: '1', B: '2' }, { A: '3', B: '4' }]);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('round trips through the writer', () => {
    const records = [{ A: 'x,y', B: 'say "hi"' }, { A: '', B: 'line\nbreak' }];
    expect(parseCsv(toCsv(records, ['A', 'B']))).toEqual(records);
  });
});
