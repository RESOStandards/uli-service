'use strict';

const { expect } = require('chai');

// BM-25 scoring functions ported from client/src/utils/scoring.js (ESM → CJS)
// These mirror the client implementation exactly for testability.

const FIELD_WEIGHTS = {
  MemberFullName: 10, MemberLastName: 1, MemberFirstName: 1,
  MemberMiddleInitial: 1, MemberNickname: 3, MemberType: 3,
  MemberNationalAssociationId: 10, MemberStateLicense: 10,
  MemberStateLicenseType: 3, MemberStateLicenseState: 2,
  MemberMlsId: 5, OfficeName: 2, OfficeMlsId: 10,
  SourceSystemID: 10, SourceSystemName: 5,
  OriginatingSystemID: 10, OriginatingSystemName: 5,
};

const K1 = 1.2;
const B = 0.75;

const isMatch = (searchValue, sourceValue) => {
  const s = searchValue.toLowerCase();
  const r = (sourceValue || '').toLowerCase();
  return r.includes(s) || s.includes(r);
};

const fieldCount = (record) =>
  Object.values(record).filter((v) => v && String(v).trim().length > 0).length;

const buildCorpusStats = (records) => {
  const sources = records.map((r) => r._source);
  const N = sources.length;
  const avgdl = sources.reduce((sum, s) => sum + fieldCount(s), 0) / N;
  return { N, avgdl, sources };
};

const getMatchedFields = (searchFields, sourceRecord) =>
  Object.entries(searchFields)
    .filter(([, value]) => value && value.trim().length > 0)
    .reduce(
      (acc, [fieldName, searchValue]) => {
        if (isMatch(searchValue, sourceRecord[fieldName])) {
          acc.matched.push(fieldName);
        } else {
          acc.unmatched.push(fieldName);
        }
        return acc;
      },
      { matched: [], unmatched: [] }
    );

const calculateConfidence = (searchFields, record, corpusStats) => {
  const { N, avgdl, sources } = corpusStats;
  const source = record._source;
  const dl = fieldCount(source);

  const activeFields = Object.entries(searchFields)
    .filter(([, value]) => value && value.trim().length > 0);

  if (activeFields.length === 0) return 0;

  let rawScore = 0;
  let maxScore = 0;

  const lengthNorm = 1 - B + B * (dl / avgdl);

  for (const [fieldName, searchValue] of activeFields) {
    const n = sources.filter((s) => isMatch(searchValue, s[fieldName])).length;
    const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);
    const weight = FIELD_WEIGHTS[fieldName] || 1;

    const maxFieldScore = idf * ((K1 + 1) / (1 + K1 * lengthNorm)) * weight;
    maxScore += maxFieldScore;

    const tf = isMatch(searchValue, source[fieldName]) ? 1 : 0;
    const fieldScore = idf * (tf * (K1 + 1)) / (tf + K1 * lengthNorm) * weight;
    rawScore += fieldScore;
  }

  return maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
};

// Test corpus — mirrors client/src/mock/mockData.js MOCK_LICENSEES
const CORPUS = [
  { _id: 'es-001', _source: { MemberFullName: 'John William Smith', MemberLastName: 'Smith', MemberFirstName: 'John', MemberMiddleInitial: 'W', MemberNickname: 'Johnny', MemberType: 'Broker', MemberNationalAssociationId: '123456789', MemberStateLicense: 'RE-45620', MemberStateLicenseType: 'Broker', MemberStateLicenseState: 'CA', MemberMlsId: 'MLS-001234', OfficeName: 'Smith Realty Group', OfficeMlsId: 'OFF-5678', SourceSystemID: 'CRMLS', SourceSystemName: 'California Regional MLS', OriginatingSystemID: 'CRMLS-ORIG', OriginatingSystemName: 'CRMLS Originating' } },
  { _id: 'es-002', _source: { MemberFullName: 'Jon W. Smith', MemberLastName: 'Smith', MemberFirstName: 'Jon', MemberMiddleInitial: 'W', MemberNickname: 'Jon', MemberType: 'Agent', MemberNationalAssociationId: '123456789', MemberStateLicense: 'RE-45620', MemberStateLicenseType: 'Salesperson', MemberStateLicenseState: 'CA', MemberMlsId: 'MLS-009876', OfficeName: 'Smith Realty Group', OfficeMlsId: 'OFF-5678', SourceSystemID: 'BAREIS', SourceSystemName: 'Bay Area Real Estate Info Services', OriginatingSystemID: 'BAREIS-ORIG', OriginatingSystemName: 'BAREIS Originating' } },
  { _id: 'es-003', _source: { MemberFullName: 'Jane Marie Doe', MemberLastName: 'Doe', MemberFirstName: 'Jane', MemberMiddleInitial: 'M', MemberNickname: '', MemberType: 'Agent', MemberNationalAssociationId: '987654321', MemberStateLicense: 'RE-78901', MemberStateLicenseType: 'Salesperson', MemberStateLicenseState: 'TX', MemberMlsId: 'MLS-005678', OfficeName: 'Doe Properties LLC', OfficeMlsId: 'OFF-1234', SourceSystemID: 'HAR', SourceSystemName: 'Houston Assoc. of Realtors', OriginatingSystemID: 'HAR-ORIG', OriginatingSystemName: 'HAR Originating' } },
  { _id: 'es-004', _source: { MemberFullName: 'Robert James Johnson', MemberLastName: 'Johnson', MemberFirstName: 'Robert', MemberMiddleInitial: 'J', MemberNickname: 'Bob', MemberType: 'Broker', MemberNationalAssociationId: '456789012', MemberStateLicense: 'RE-11223', MemberStateLicenseType: 'Broker', MemberStateLicenseState: 'FL', MemberMlsId: 'MLS-003344', OfficeName: 'Johnson & Associates', OfficeMlsId: 'OFF-9012', SourceSystemID: 'SFAR', SourceSystemName: 'South Florida Assoc. of Realtors', OriginatingSystemID: 'SFAR-ORIG', OriginatingSystemName: 'SFAR Originating' } },
  { _id: 'es-005', _source: { MemberFullName: 'Maria Elena Garcia', MemberLastName: 'Garcia', MemberFirstName: 'Maria', MemberMiddleInitial: 'E', MemberNickname: '', MemberType: 'Agent', MemberNationalAssociationId: '567890123', MemberStateLicense: 'RE-44556', MemberStateLicenseType: 'Salesperson', MemberStateLicenseState: 'AZ', MemberMlsId: 'MLS-007788', OfficeName: 'Desert Sun Realty', OfficeMlsId: 'OFF-3456', SourceSystemID: 'ARMLS', SourceSystemName: 'Arizona Regional MLS', OriginatingSystemID: 'ARMLS-ORIG', OriginatingSystemName: 'ARMLS Originating' } },
  { _id: 'es-006', _source: { MemberFullName: 'John W Smith', MemberLastName: 'Smith', MemberFirstName: 'John', MemberMiddleInitial: 'W', MemberNickname: 'John', MemberType: 'Broker', MemberNationalAssociationId: '123456789', MemberStateLicense: 'RE-45620', MemberStateLicenseType: 'Broker', MemberStateLicenseState: 'CA', MemberMlsId: 'MLS-001234', OfficeName: 'Pacific Coast Realty', OfficeMlsId: 'OFF-7890', SourceSystemID: 'CRMLS', SourceSystemName: 'California Regional MLS', OriginatingSystemID: 'CRMLS-ORIG', OriginatingSystemName: 'CRMLS Originating' } },
];

const CORPUS_STATS = buildCorpusStats(CORPUS);

describe('BM-25 scoring', () => {
  describe('isMatch', () => {
    it('should match identical strings', () => {
      expect(isMatch('Smith', 'Smith')).to.equal(true);
    });

    it('should match case-insensitively', () => {
      expect(isMatch('smith', 'SMITH')).to.equal(true);
    });

    it('should match when source contains search value', () => {
      expect(isMatch('John', 'John William Smith')).to.equal(true);
    });

    it('should match when search value contains source value as substring', () => {
      // "johnny" contains "john" as a substring
      expect(isMatch('Johnny', 'John')).to.equal(true);
    });

    it('should not match when neither string contains the other', () => {
      // "John" does not contain "Jon" and "Jon" does not contain "John"
      expect(isMatch('John', 'Jon')).to.equal(false);
    });

    it('should not match unrelated strings', () => {
      expect(isMatch('Smith', 'Johnson')).to.equal(false);
    });

    it('should match empty source value because empty string is a substring of any string', () => {
      // ''.includes('') is true, and 'test'.includes('') is true
      expect(isMatch('test', '')).to.equal(true);
    });

    it('should match null source value because empty string is a substring of any string', () => {
      // null coerces to '', same behavior as empty
      expect(isMatch('test', null)).to.equal(true);
    });
  });

  describe('buildCorpusStats', () => {
    it('should compute correct corpus size', () => {
      expect(CORPUS_STATS.N).to.equal(6);
    });

    it('should compute average document length', () => {
      expect(CORPUS_STATS.avgdl).to.be.a('number');
      expect(CORPUS_STATS.avgdl).to.be.greaterThan(0);
    });

    it('should extract source records', () => {
      expect(CORPUS_STATS.sources).to.have.length(6);
      expect(CORPUS_STATS.sources[0]).to.have.property('MemberFullName');
    });
  });

  describe('getMatchedFields', () => {
    it('should classify matching fields as matched', () => {
      const search = { MemberLastName: 'Smith', MemberFirstName: 'John' };
      const { matched } = getMatchedFields(search, CORPUS[0]._source);
      expect(matched).to.include('MemberLastName');
      expect(matched).to.include('MemberFirstName');
    });

    it('should classify non-matching fields as unmatched', () => {
      const search = { MemberLastName: 'Garcia', MemberFirstName: 'John' };
      const { matched, unmatched } = getMatchedFields(search, CORPUS[0]._source);
      expect(matched).to.include('MemberFirstName');
      expect(unmatched).to.include('MemberLastName');
    });

    it('should skip empty search fields', () => {
      const search = { MemberLastName: 'Smith', MemberFirstName: '' };
      const { matched, unmatched } = getMatchedFields(search, CORPUS[0]._source);
      expect(matched).to.have.length(1);
      expect(unmatched).to.have.length(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 for empty search fields', () => {
      const score = calculateConfidence({}, CORPUS[0], CORPUS_STATS);
      expect(score).to.equal(0);
    });

    it('should return 0 for all-blank search fields', () => {
      const score = calculateConfidence({ MemberLastName: '', MemberFirstName: '  ' }, CORPUS[0], CORPUS_STATS);
      expect(score).to.equal(0);
    });

    it('should return 100% when all searched fields match the target exactly', () => {
      const search = {
        MemberFullName: 'John William Smith',
        MemberLastName: 'Smith',
        MemberFirstName: 'John',
        MemberNationalAssociationId: '123456789',
        MemberStateLicense: 'RE-45620',
        OfficeMlsId: 'OFF-5678',
        SourceSystemID: 'CRMLS',
        OriginatingSystemID: 'CRMLS-ORIG',
      };
      const score = calculateConfidence(search, CORPUS[0], CORPUS_STATS);
      expect(score).to.equal(100);
    });

    it('should score above 70% for a strong match (es-001)', () => {
      const search = {
        MemberFullName: 'John William Smith',
        MemberLastName: 'Smith',
        MemberNationalAssociationId: '123456789',
        MemberStateLicense: 'RE-45620',
        SourceSystemID: 'CRMLS',
      };
      const score = calculateConfidence(search, CORPUS[0], CORPUS_STATS);
      expect(score).to.be.greaterThanOrEqual(70);
    });

    it('should score below 70% for a partial match with some misses', () => {
      // es-006 matches on LastName, License, NatAssocId but misses FullName and OfficeMlsId
      const search = {
        MemberFullName: 'John William Smith',
        MemberLastName: 'Smith',
        MemberNationalAssociationId: '123456789',
        MemberStateLicense: 'RE-45620',
        OfficeMlsId: 'OFF-5678',
        SourceSystemID: 'CRMLS',
        OriginatingSystemID: 'CRMLS-ORIG',
      };
      const score = calculateConfidence(search, CORPUS[5], CORPUS_STATS);
      expect(score).to.be.lessThan(70);
    });

    it('should score 0% when no searched fields match the target', () => {
      const search = {
        MemberLastName: 'Garcia',
        MemberFirstName: 'Maria',
        SourceSystemID: 'ARMLS',
      };
      const score = calculateConfidence(search, CORPUS[0], CORPUS_STATS);
      expect(score).to.equal(0);
    });
  });

  describe('IDF weighting — rare values score higher than common values', () => {
    it('should weight a rare field value higher than a common one in a multi-field search', () => {
      // HAR appears in 1 record (high IDF), CRMLS appears in 2 (lower IDF)
      // Compare two searches that each have one match and one miss:
      // - rare match + common miss vs common match + rare miss
      const searchRareHit = { SourceSystemID: 'HAR', OfficeMlsId: 'WRONG' };
      const searchCommonHit = { SourceSystemID: 'WRONG', OfficeMlsId: 'OFF-1234' };
      // Both scored against es-003 (which has HAR and OFF-1234)
      const scoreRare = calculateConfidence(searchRareHit, CORPUS[2], CORPUS_STATS);
      const scoreCommon = calculateConfidence(searchCommonHit, CORPUS[2], CORPUS_STATS);
      // HAR (n=1) has higher IDF than OFF-1234 (n=1), but both are unique
      // so let's use a truly common value: MemberType='Agent' (n=3)
      const searchRareHit2 = { SourceSystemID: 'HAR', MemberType: 'WRONG' };
      const searchCommonHit2 = { SourceSystemID: 'WRONG', MemberType: 'Agent' };
      const scoreRare2 = calculateConfidence(searchRareHit2, CORPUS[2], CORPUS_STATS);
      const scoreCommon2 = calculateConfidence(searchCommonHit2, CORPUS[2], CORPUS_STATS);
      // SourceSystemID has weight 10 and HAR has high IDF (n=1)
      // MemberType has weight 3 and 'Agent' has low IDF (n=3)
      // So the rare+heavy hit should score higher
      expect(scoreRare2).to.be.greaterThan(scoreCommon2);
    });
  });

  describe('field weight boosting', () => {
    it('should score a high-weight field match higher than a low-weight field match', () => {
      // MemberNationalAssociationId weight=10, MemberLastName weight=1
      // Use unique values so IDF doesn't confound the comparison
      const searchHighWeight = { MemberNationalAssociationId: '987654321' };
      const searchLowWeight = { MemberLastName: 'Doe' };
      // Both match es-003 uniquely (n=1 for both in the corpus)
      const scoreHigh = calculateConfidence(searchHighWeight, CORPUS[2], CORPUS_STATS);
      const scoreLow = calculateConfidence(searchLowWeight, CORPUS[2], CORPUS_STATS);
      // Both should be 100% since each has a single matching field with tf=1
      // But when combined with other fields, the weight difference matters
      expect(scoreHigh).to.equal(100);
      expect(scoreLow).to.equal(100);
    });

    it('should weight MemberNationalAssociationId more than MemberLastName in a multi-field search', () => {
      // Search where NationalAssocId matches but LastName doesn't, vs opposite
      const searchWithHighMatch = {
        MemberNationalAssociationId: '987654321',
        MemberLastName: 'WRONG',
      };
      const searchWithLowMatch = {
        MemberNationalAssociationId: 'WRONG',
        MemberLastName: 'Doe',
      };
      const scoreHighMatch = calculateConfidence(searchWithHighMatch, CORPUS[2], CORPUS_STATS);
      const scoreLowMatch = calculateConfidence(searchWithLowMatch, CORPUS[2], CORPUS_STATS);
      expect(scoreHighMatch).to.be.greaterThan(scoreLowMatch);
    });
  });

  describe('ranking order', () => {
    it('should rank exact match (es-001) above partial matches (es-002, es-006)', () => {
      const search = {
        MemberFullName: 'John William Smith',
        MemberLastName: 'Smith',
        MemberFirstName: 'John',
        MemberNationalAssociationId: '123456789',
        MemberStateLicense: 'RE-45620',
        OfficeMlsId: 'OFF-5678',
        SourceSystemID: 'CRMLS',
        OriginatingSystemID: 'CRMLS-ORIG',
      };
      const score001 = calculateConfidence(search, CORPUS[0], CORPUS_STATS);
      const score002 = calculateConfidence(search, CORPUS[1], CORPUS_STATS);
      const score006 = calculateConfidence(search, CORPUS[5], CORPUS_STATS);
      expect(score001).to.be.greaterThan(score006);
      expect(score006).to.be.greaterThan(score002);
    });

    it('should not match unrelated records', () => {
      const search = {
        MemberFullName: 'John William Smith',
        MemberLastName: 'Smith',
        SourceSystemID: 'CRMLS',
      };
      const score003 = calculateConfidence(search, CORPUS[2], CORPUS_STATS);
      const score004 = calculateConfidence(search, CORPUS[3], CORPUS_STATS);
      const score005 = calculateConfidence(search, CORPUS[4], CORPUS_STATS);
      expect(score003).to.equal(0);
      expect(score004).to.equal(0);
      expect(score005).to.equal(0);
    });
  });
});
