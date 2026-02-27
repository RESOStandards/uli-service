import MatchIndicator from '../shared/MatchIndicator';
import FieldLabel from '../shared/FieldLabel';

const FieldDiff = ({ fieldName, searchedValue, matchValue }) => {
  const bothPresent = searchedValue && matchValue;
  const isMatch = bothPresent &&
    (searchedValue.toLowerCase().includes(matchValue.toLowerCase()) ||
     matchValue.toLowerCase().includes(searchedValue.toLowerCase()));

  return (
    <div className={`grid grid-cols-[1fr_2fr_auto_2fr] gap-3 items-center py-2 px-3 rounded ${
      bothPresent ? (isMatch ? 'bg-green-50' : 'bg-red-50') : ''
    }`}>
      <FieldLabel fieldName={fieldName} />
      <span className="text-sm text-slate-700 truncate">{searchedValue || '-'}</span>
      {bothPresent ? (
        <MatchIndicator isMatch={isMatch} size="sm" />
      ) : (
        <span className="w-4" />
      )}
      <span className="text-sm text-slate-700 truncate">{matchValue || '-'}</span>
    </div>
  );
};

export default FieldDiff;
