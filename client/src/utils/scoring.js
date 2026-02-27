import { FIELD_WEIGHTS } from './fields';

const MAX_WEIGHT = Object.values(FIELD_WEIGHTS).reduce((sum, w) => sum + w, 0);

export const calculateConfidence = (matchedFields = []) => {
  const matchedWeight = matchedFields.reduce(
    (sum, field) => sum + (FIELD_WEIGHTS[field] || 0),
    0
  );
  return Math.round((matchedWeight / MAX_WEIGHT) * 100);
};

export const getMatchedFields = (searchFields, sourceRecord) =>
  Object.entries(searchFields)
    .filter(([, value]) => value && value.trim().length > 0)
    .reduce(
      (acc, [fieldName, searchValue]) => {
        const sourceValue = sourceRecord[fieldName] || '';
        const isMatch =
          sourceValue.toLowerCase().includes(searchValue.toLowerCase()) ||
          searchValue.toLowerCase().includes(sourceValue.toLowerCase());
        if (isMatch) {
          acc.matched.push(fieldName);
        } else {
          acc.unmatched.push(fieldName);
        }
        return acc;
      },
      { matched: [], unmatched: [] }
    );
