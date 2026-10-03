import { Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/simulator': 'Product Simulator',
  '/simulator/eln': 'Configure ELN',
  '/simulator/dcd': 'Configure DCD',
  '/simulator/cpn': 'Configure CPN',
  '/simulator/client': 'Client Profile',
  '/simulator/results': 'Simulation Results',
  '/simulator/suitability': 'Suitability Results',
  '/discovery': 'Product Discovery',
  '/clients': 'Client Profiles',
  '/history': 'Assessment History',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function TopNavbar() {
  const location = useLocation();
  const currentTitle = ROUTE_TITLES[location.pathname] || 'InveSimul';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <h1 className="text-xl font-semibold text-slate-800">{currentTitle}</h1>
      
      <div className="flex items-center space-x-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search ISIN, client..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-brand focus:border-transparent outline-none w-64 transition-all"
          />
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-700">RM Desk</p>
            <p className="text-xs text-slate-500">Wealth Mgmt</p>
          </div>
        </div>
      </div>
    </header>
  );
}
