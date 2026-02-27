import { useState } from 'react';
import Button from '../shared/Button';
import { createUli } from '../../services/api';

const NoMatchesFound = ({ searchFields, onClear }) => {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createUli(searchFields);
      setCreated(result.UniqueLicenseeIdentifier);
    } catch {
      setCreated(null);
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-green-600 mb-3">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">New ULI Created</h2>
        <p className="text-sm text-slate-500 font-mono mb-4">{created}</p>
        <Button variant="secondary" onClick={onClear}>Search Again</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <div className="text-slate-400 mb-3">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-2">No Matches Found</h2>
      <p className="text-sm text-slate-500 mb-6">
        No existing licensees matched your search criteria.
      </p>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onClear}>Search Again</Button>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create New ULI'}
        </Button>
      </div>
    </div>
  );
};

export default NoMatchesFound;
