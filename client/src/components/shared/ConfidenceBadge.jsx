const getColor = (confidence) => {
  if (confidence >= 70) return 'bg-green-100 text-green-800';
  if (confidence >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const ConfidenceBadge = ({ confidence }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getColor(confidence)}`}>
    {confidence}% match
  </span>
);

export default ConfidenceBadge;
