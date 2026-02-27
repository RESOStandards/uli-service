const StatItem = ({ label, value }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
    <p className="text-xs text-slate-500 mt-1">{label}</p>
  </div>
);

const ReportsWidget = ({ reports }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Reports</h3>
    <div className="mt-4 grid grid-cols-3 gap-4">
      <StatItem label="Total ULIs Created" value={reports.totalUlisCreated} />
      <StatItem label="Confirmed This Week" value={reports.matchesConfirmedThisWeek} />
      <StatItem label="Conflicts Pending" value={reports.conflictsPending} />
    </div>
  </div>
);

export default ReportsWidget;
