import { FIELD_WEIGHTS } from './fields';

const K1 = 1.2;
const B = 0.75;

// Case-insensitive fuzzy match
const isMatch = (searchValue, sourceValue) => {
  const s = searchValue.toLowerCase();
  const r = (sourceValue || '').toLowerCase();
  return r.includes(s) || s.includes(r);
};

// Count non-empty fields in a record
const fieldCount = (record) =>
  Object.values(record).filter((v) => v && String(v).trim().length > 0).length;

// Build corpus-wide statistics from a set of records
export const buildCorpusStats = (records) => {
  const sources = records.map((r) => r._source);
  const N = sources.length;
  const avgdl = sources.reduce((sum, s) => sum + fieldCount(s), 0) / N;
  return { N, avgdl, sources };
};

// Inverse Document Frequency for a field/value pair
const computeIDF = (fieldName, searchValue, sources, N) => {
  const n = sources.filter((s) => isMatch(searchValue, s[fieldName])).length;
  return Math.log((N - n + 0.5) / (n + 0.5) + 1);
};

// Classify fields as matched or unmatched
export const getMatchedFields = (searchFields, sourceRecord) =>
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

// BM-25 confidence score for a single record against search fields
export const calculateConfidence = (searchFields, record, corpusStats) => {
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
    const idf = computeIDF(fieldName, searchValue, sources, N);
    const weight = FIELD_WEIGHTS[fieldName] || 1;

    // Max possible contribution for this field (tf = 1)
    const maxFieldScore = idf * ((K1 + 1) / (1 + K1 * lengthNorm)) * weight;
    maxScore += maxFieldScore;

    // Actual contribution
    const tf = isMatch(searchValue, source[fieldName]) ? 1 : 0;
    const fieldScore = idf * (tf * (K1 + 1)) / (tf + K1 * lengthNorm) * weight;
    rawScore += fieldScore;
  }

  return maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
};
