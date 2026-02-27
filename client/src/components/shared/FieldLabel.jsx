import { FIELD_LABELS } from '../../utils/fields';

const FieldLabel = ({ fieldName }) => (
  <span className="text-sm font-medium text-slate-600">
    {FIELD_LABELS[fieldName] || fieldName}
  </span>
);

export default FieldLabel;
