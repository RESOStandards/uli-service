import { useNavigate } from 'react-router';

const NewMatchesWidget = ({ count }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate('/search')}
    >
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">New Matches</h3>
      <p className="mt-2 text-4xl font-bold text-blue-primary">{count}</p>
      <p className="mt-1 text-sm text-slate-500">Requiring review</p>
    </div>
  );
};

export default NewMatchesWidget;
