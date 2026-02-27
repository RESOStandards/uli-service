import { ALL_FIELDS } from '../../utils/fields';
import FieldDiff from './FieldDiff';
import ConfidenceBadge from '../shared/ConfidenceBadge';
import Button from '../shared/Button';

const CompareLicensees = ({ searchFields, match, onConfirm, onBack }) => {
  const confidence = match.confidence || 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Compare Licensees</h2>
          <p className="text-sm text-slate-500 mt-1">
            ULI: <span className="font-mono">{match._source?.UniqueLicenseeIdentifier || 'N/A'}</span>
          </p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      <div className="grid grid-cols-[1fr_2fr_auto_2fr] gap-3 items-center py-2 px-3 mb-2 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-400 uppercase">Field</span>
        <span className="text-xs font-semibold text-slate-400 uppercase">Searched</span>
        <span className="w-4" />
        <span className="text-xs font-semibold text-slate-400 uppercase">Existing Record</span>
      </div>

      <div className="divide-y divide-slate-100">
        {ALL_FIELDS.map((fieldName) => (
          <FieldDiff
            key={fieldName}
            fieldName={fieldName}
            searchedValue={searchFields[fieldName] || ''}
            matchValue={match._source?.[fieldName] || ''}
          />
        ))}
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={onBack}>Back to Results</Button>
        <Button variant="success" onClick={onConfirm}>Confirm Match</Button>
      </div>
    </div>
  );
};

export default CompareLicensees;
