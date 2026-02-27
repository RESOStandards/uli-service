import { useParams, useNavigate } from 'react-router';
import { useSearch } from '../hooks/useSearch';
import CompareLicensees from '../components/compare/CompareLicensees';

const ComparePage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { searchFields, results } = useSearch();

  const hits = results?.hits?.hits || [];
  const match = hits.find(({ _id }) => _id === matchId);

  if (!match) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-slate-500">Match not found. Please go back and search again.</p>
        <button className="mt-4 text-blue-primary underline" onClick={() => navigate('/search')}>
          Back to Search
        </button>
      </div>
    );
  }

  const handleConfirm = () => {
    navigate('/', { state: { confirmed: matchId } });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Compare Licensees</h1>
      <CompareLicensees
        searchFields={searchFields}
        match={match}
        onConfirm={handleConfirm}
        onBack={() => navigate('/search')}
      />
    </div>
  );
};

export default ComparePage;
