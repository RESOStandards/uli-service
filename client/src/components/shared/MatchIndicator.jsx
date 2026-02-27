const MatchIndicator = ({ isMatch, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (isMatch) {
    return (
      <svg className={`${sizeClass} text-green-600`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  return (
    <svg className={`${sizeClass} text-red-500`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
};

export default MatchIndicator;
