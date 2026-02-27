import { useState } from 'react';
import RecordCard from './RecordCard';
import Button from '../shared/Button';

const RESOLUTION_OPTIONS = [
  { value: 'keep-existing', label: 'Keep Existing Record', description: 'Preserve the current ULI and data. The incoming record will not be linked.' },
  { value: 'use-new', label: 'Use New Record', description: 'Replace with the incoming data. The existing ULI will be retired and point to the new record.' },
  { value: 'merge', label: 'Merge into New ULI', description: 'Create a new ULI by combining both records. Both existing ULIs will be retired and linked to the new one.' },
];

const ResolveConflicts = ({ conflict, onResolve, onCancel }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">{conflict.reason}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RecordCard title="Existing Record" record={conflict.existing} />
        <RecordCard title="Incoming Record" record={conflict.incoming} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Resolution</h3>
        <div className="space-y-3">
          {RESOLUTION_OPTIONS.map(({ value, label, description }) => (
            <label
              key={value}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selected === value
                  ? 'border-blue-primary bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="resolution"
                  value={value}
                  checked={selected === value}
                  onChange={() => setSelected(value)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">{label}</span>
                  <p className="text-xs text-slate-500 mt-1">{description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onResolve(selected)} disabled={!selected}>
            Submit Resolution
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResolveConflicts;
