import { FIELD_GROUPS, FIELD_LABELS } from '../../utils/fields';
import Button from '../shared/Button';
import { useSearch } from '../../hooks/useSearch';

const SearchForm = () => {
  const { searchFields, updateField, performSearch, clearSearch, isLoading } = useSearch();

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Search Licensees</h2>
      {FIELD_GROUPS.map(({ label, fields }) => (
        <div key={label} className="mb-6">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">{label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((fieldName) => (
              <div key={fieldName}>
                <label htmlFor={fieldName} className="block text-sm font-medium text-slate-600 mb-1">
                  {FIELD_LABELS[fieldName]}
                </label>
                <input
                  id={fieldName}
                  type="text"
                  value={searchFields[fieldName]}
                  onChange={(e) => updateField(fieldName, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-transparent"
                  placeholder={FIELD_LABELS[fieldName]}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={clearSearch}>Clear</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </form>
  );
};

export default SearchForm;
