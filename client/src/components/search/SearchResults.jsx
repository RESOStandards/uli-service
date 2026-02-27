import SearchResultRow from './SearchResultRow';

const CONFIDENCE_THRESHOLD = 50;

const SearchResults = ({ results, searchFields }) => {
  const hits = results?.hits?.hits || [];
  const filtered = hits.filter(({ confidence }) => confidence >= CONFIDENCE_THRESHOLD);
  const hiddenCount = hits.length - filtered.length;

  if (filtered.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {filtered.length} Potential Match{filtered.length !== 1 ? 'es' : ''} Found
        </h2>
        {hiddenCount > 0 && (
          <span className="text-sm text-slate-400">
            {hiddenCount} result{hiddenCount !== 1 ? 's' : ''} below {CONFIDENCE_THRESHOLD}% threshold hidden
          </span>
        )}
      </div>
      <div className="space-y-4">
        {filtered.map((result) => (
          <SearchResultRow key={result._id} result={result} searchFields={searchFields} />
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
