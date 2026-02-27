import { createContext, useContext, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { searchLicensees } from '../services/api';
import { ALL_FIELDS } from '../utils/fields';

const SearchContext = createContext(null);

const createEmptyFields = () =>
  ALL_FIELDS.reduce((acc, field) => ({ ...acc, [field]: '' }), {});

const fieldsFromParams = (searchParams) =>
  ALL_FIELDS.reduce(
    (acc, field) => ({ ...acc, [field]: searchParams.get(field) || '' }),
    {}
  );

const fieldsToParams = (fields) => {
  const params = new URLSearchParams();
  Object.entries(fields).forEach(([key, value]) => {
    if (value && value.trim().length > 0) {
      params.set(key, value);
    }
  });
  return params;
};

export const SearchProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchFields, setSearchFields] = useState(() => fieldsFromParams(searchParams));
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = useCallback((fieldName, value) => {
    setSearchFields((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSearchParams(fieldsToParams(searchFields), { replace: true });
    try {
      const data = await searchLicensees(searchFields);
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchFields, setSearchParams]);

  const clearSearch = useCallback(() => {
    setSearchFields(createEmptyFields());
    setResults(null);
    setError(null);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const value = {
    searchFields,
    results,
    isLoading,
    error,
    updateField,
    performSearch,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
