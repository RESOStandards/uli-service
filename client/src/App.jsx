import { BrowserRouter, Routes, Route } from 'react-router';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import ComparePage from './pages/ComparePage';
import ResolvePage from './pages/ResolvePage';
import { SearchProvider } from './hooks/useSearch';

const App = () => (
  <BrowserRouter>
    <SearchProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/compare/:matchId" element={<ComparePage />} />
          <Route path="/resolve/:conflictId" element={<ResolvePage />} />
        </Routes>
      </AppShell>
    </SearchProvider>
  </BrowserRouter>
);

export default App;
