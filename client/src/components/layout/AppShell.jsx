import Navbar from './Navbar';
import Sidebar from './Sidebar';

const AppShell = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-gray-bg">
    <Navbar />
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  </div>
);

export default AppShell;
