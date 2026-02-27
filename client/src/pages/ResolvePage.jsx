import { useParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { getConflict, resolveConflict } from '../services/api';
import ResolveConflicts from '../components/resolve/ResolveConflicts';

const ResolvePage = () => {
  const { conflictId } = useParams();
  const navigate = useNavigate();
  const [conflict, setConflict] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getConflict(conflictId);
        if (!cancelled) setConflict(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [conflictId]);

  const handleResolve = async (resolution) => {
    await resolveConflict(conflictId, resolution);
    setResolved(true);
  };

  if (isLoading) {
    return <p className="text-slate-500">Loading conflict...</p>;
  }

  if (!conflict) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-slate-500">Conflict not found.</p>
        <button className="mt-4 text-blue-primary underline" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (resolved) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-green-600 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Conflict Resolved</h2>
        <p className="text-sm text-slate-500 mb-4">The resolution has been submitted successfully.</p>
        <button className="text-blue-primary underline" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Resolve Conflict</h1>
      <ResolveConflicts
        conflict={conflict}
        onResolve={handleResolve}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

export default ResolvePage;
