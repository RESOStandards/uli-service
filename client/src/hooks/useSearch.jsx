import { createContext, useContext, useState, useCallback } from 'react';
import { searchLicensees } from '../services/api';
import { ALL_FIELDS } from '../utils/fields';

const SearchContext = createContext(null);

const createEmptyFields = () =>
  ALL_FIELDS.reduce((acc, field) => ({ ...acc, [field]: '' }), {});

export const SearchProvider = ({ children }) => {
  const [searchFields, setSearchFields] = useState(createEmptyFields);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = useCallback((fieldName, value) => {
    setSearchFields((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchLicensees(searchFields);
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchFields]);

  const clearSearch = useCallback(() => {
    setSearchFields(createEmptyFields());
    setResults(null);
    setError(null);
  }, []);

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
