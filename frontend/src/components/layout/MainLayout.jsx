import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopNavbar from './TopNavbar';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
