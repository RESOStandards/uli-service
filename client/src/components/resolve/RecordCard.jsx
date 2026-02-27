import { ALL_FIELDS } from '../../utils/fields';
import FieldLabel from '../shared/FieldLabel';

const RecordCard = ({ title, record }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 font-mono mb-4">
      {record._source?.UniqueLicenseeIdentifier || 'No ULI'}
    </p>
    <dl className="space-y-2">
      {ALL_FIELDS.map((fieldName) => {
        const value = record._source?.[fieldName];
        if (!value) return null;
        return (
          <div key={fieldName} className="flex justify-between text-sm">
            <FieldLabel fieldName={fieldName} />
            <span className="text-slate-700 text-right truncate ml-2 max-w-[60%]">{value}</span>
          </div>
        );
      })}
    </dl>
  </div>
);

export default RecordCard;
