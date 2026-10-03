import { FileBarChart2, Users, AlertTriangle, Activity, ArrowRight, Plus, Search } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import { Link } from 'react-router-dom';

const RECENT_ACTIVITY = [
  { id: 1, type: 'Simulation', product: 'ELN - NIFTY50', client: 'Arjun Desai', date: '2 hours ago', status: 'Completed' },
  { id: 2, type: 'Suitability', product: 'DCD - EUR/INR', client: 'Priya Sharma', date: '4 hours ago', status: 'Warning' },
  { id: 3, type: 'Report', product: 'CPN - Reliance', client: 'Tech Corp Trust', date: 'Yesterday', status: 'Generated' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, RM Desk</h2>
          <p className="text-slate-500 mt-1">Here's what's happening with your structured products.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/simulator" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Simulation
          </Link>
          <Link to="/discovery" className="btn-secondary">
            Product Discovery
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Assessments" value="1,284" subtitle="from last month" trend={12.5} icon={FileBarChart2} />
        <StatCard title="Products Simulated" value="853" subtitle="across 3 product types" trend={8.2} icon={Activity} />
        <StatCard title="Active Clients" value="412" subtitle="with profiles" trend={3.1} icon={Users} />
        <StatCard title="Suitability Warnings" value="24" subtitle="require RM review" trend={-4.5} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Type</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_ACTIVITY.map((act) => (
                    <tr key={act.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{act.type}</td>
                      <td className="px-4 py-3 text-slate-600">{act.product}</td>
                      <td className="px-4 py-3 text-slate-600">{act.client}</td>
                      <td className="px-4 py-3 text-slate-500">{act.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          act.status === 'Completed' || act.status === 'Generated' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Link to="/history" className="text-brand hover:text-brand-dark text-sm font-medium flex items-center">
                View all history <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/simulator" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-brand hover:bg-brand/5 transition-colors group">
                <div className="w-10 h-10 rounded bg-brand/10 text-brand flex items-center justify-center mr-4 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-sm">Product Simulation</h4>
                  <p className="text-xs text-slate-500">Calculate payoffs & scenarios</p>
                </div>
              </Link>
              <Link to="/discovery" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-brand hover:bg-brand/5 transition-colors group">
                <div className="w-10 h-10 rounded bg-brand/10 text-brand flex items-center justify-center mr-4 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-sm">Product Discovery</h4>
                  <p className="text-xs text-slate-500">Find suitable products</p>
                </div>
              </Link>
              <Link to="/clients" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-brand hover:bg-brand/5 transition-colors group">
                <div className="w-10 h-10 rounded bg-brand/10 text-brand flex items-center justify-center mr-4 group-hover:bg-brand group-hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-sm">Create Client Profile</h4>
                  <p className="text-xs text-slate-500">Add new client requirements</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
