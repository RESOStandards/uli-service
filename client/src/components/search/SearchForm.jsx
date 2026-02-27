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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow px-4 py-3">
      {FIELD_GROUPS.map(({ label, fields }) => (
        <fieldset key={label} className="mb-2">
          <legend className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</legend>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5">
            {fields.map((fieldName) => (
              <input
                key={fieldName}
                id={fieldName}
                type="text"
                value={searchFields[fieldName]}
                onChange={(e) => updateField(fieldName, e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-primary focus:border-transparent"
                placeholder={FIELD_LABELS[fieldName]}
                aria-label={FIELD_LABELS[fieldName]}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={clearSearch}>Clear</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </form>
  );
};

export default SearchForm;
