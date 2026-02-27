import { NavLink } from 'react-router';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { to: '/search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
];

const Sidebar = () => (
  <nav className="w-56 bg-slate-header text-white min-h-screen pt-4 flex-shrink-0">
    <ul className="space-y-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);

export default Sidebar;
