import { useDashboard } from '../hooks/useDashboard';
import NewMatchesWidget from '../components/dashboard/NewMatchesWidget';
import ReportsWidget from '../components/dashboard/ReportsWidget';
import ActionItemsList from '../components/dashboard/ActionItemsList';

const DashboardPage = () => {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return <p className="text-slate-500">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-red-600">Error loading dashboard: {error}</p>;
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <NewMatchesWidget count={data.newMatchesCount} />
        <div className="md:col-span-2">
          <ReportsWidget reports={data.reports} />
        </div>
      </div>
      <ActionItemsList items={data.actionItems} />
    </div>
  );
};

export default DashboardPage;
