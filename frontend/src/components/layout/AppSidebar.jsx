import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Compass, UserSquare2, History, FileText, Settings, Layers } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Product Simulator', path: '/simulator', icon: Layers },
  { name: 'Product Discovery', path: '/discovery', icon: Compass },
  { name: 'Client Profiles', path: '/clients', icon: UserSquare2 },
  { name: 'Assessment History', path: '/history', icon: History },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col h-full shrink-0 border-r border-navy-800">
      <div className="h-16 flex items-center px-6 border-b border-navy-800 shrink-0">
        <div className="w-8 h-8 bg-brand rounded flex items-center justify-center mr-3 font-bold text-lg">
          IS
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">InveSimul</span>
      </div>
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive 
                  ? 'bg-brand/20 text-brand-light' 
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white'
              )}
            >
              <Icon className={clsx("w-5 h-5 mr-3 shrink-0", isActive ? "text-brand-light" : "text-navy-300 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-navy-800 text-xs text-navy-400">
        <p>InveSimul Phase 1</p>
        <p>Simulation Engine v0.1.0</p>
      </div>
    </aside>
  );
}
