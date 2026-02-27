import { useSearch } from '../hooks/useSearch';
import SearchForm from '../components/search/SearchForm';
import SearchResults from '../components/search/SearchResults';
import NoMatchesFound from '../components/search/NoMatchesFound';

const SearchPage = () => {
  const { results, searchFields, clearSearch, error } = useSearch();

  const hasSearched = results !== null;
  const hasHits = results?.hits?.hits?.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">ULI Search</h1>
      <SearchForm />
      {error && (
        <p className="text-red-600 text-sm">Error: {error}</p>
      )}
      {hasSearched && hasHits && (
        <SearchResults results={results} searchFields={searchFields} />
      )}
      {hasSearched && !hasHits && (
        <NoMatchesFound searchFields={searchFields} onClear={clearSearch} />
      )}
    </div>
  );
};

export default SearchPage;
