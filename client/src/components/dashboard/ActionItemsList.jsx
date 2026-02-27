import { useNavigate } from 'react-router';

const formatTimestamp = (ts) => {
  const date = new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const ActionItemsList = ({ items }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Action Items</h3>
      <ul className="mt-4 divide-y divide-slate-100">
        {items.map(({ id, type, description, timestamp }) => (
          <li
            key={id}
            className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded"
            onClick={() => navigate(`/resolve/${id}`)}
          >
            <div>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${type === 'resolve' ? 'bg-orange-400' : 'bg-blue-400'}`} />
              <span className="text-sm text-slate-700">{description}</span>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{formatTimestamp(timestamp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActionItemsList;
