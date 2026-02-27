import { useSearch } from '../hooks/useSearch';
import SearchForm from '../components/search/SearchForm';
import SearchResults from '../components/search/SearchResults';
import NoMatchesFound from '../components/search/NoMatchesFound';

const SearchPage = () => {
  const { results, searchFields, clearSearch, error } = useSearch();

  const hasResults = results?.hits?.hits?.length > 0;
  const hasSearched = results !== null;
  const noMatches = hasSearched && !hasResults;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">ULI Search</h1>
      <SearchForm />
      {error && (
        <p className="text-red-600 text-sm">Error: {error}</p>
      )}
      {hasResults && (
        <SearchResults results={results} searchFields={searchFields} />
      )}
      {noMatches && (
        <NoMatchesFound searchFields={searchFields} onClear={clearSearch} />
      )}
    </div>
  );
};

export default SearchPage;
