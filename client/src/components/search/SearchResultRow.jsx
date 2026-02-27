import { useNavigate } from 'react-router';
import { ALL_FIELDS } from '../../utils/fields';
import MatchIndicator from '../shared/MatchIndicator';
import ConfidenceBadge from '../shared/ConfidenceBadge';
import FieldLabel from '../shared/FieldLabel';
import Button from '../shared/Button';

const SearchResultRow = ({ result, searchFields }) => {
  const navigate = useNavigate();
  const { _id, _source, matchedFields = [], unmatchedFields = [], confidence } = result;

  const searchedFieldNames = Object.entries(searchFields)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([fieldName]) => fieldName);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{_source.MemberFullName || 'Unknown'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{_source.UniqueLicenseeIdentifier}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceBadge confidence={confidence} />
          <Button variant="secondary" onClick={() => navigate(`/compare/${_id}`)}>
            Compare
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {ALL_FIELDS.filter((f) => searchedFieldNames.includes(f)).map((fieldName) => {
          const isMatch = matchedFields.includes(fieldName);
          return (
            <div key={fieldName} className="flex items-center gap-1.5 text-xs">
              <MatchIndicator isMatch={isMatch} size="sm" />
              <FieldLabel fieldName={fieldName} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResultRow;
