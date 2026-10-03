import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';

export default function ProductDiscovery() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-3 mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Client-Led Product Discovery</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Enter client requirements to discover suitable product templates and configurations.
        </p>
      </div>

      {step === 1 && (
        <div className="card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-slate-900">1. Client Requirements</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-slate-700">Select Client Profile</label>
              <select className="input">
                <option>Arjun Desai (CL-88219) - Moderate</option>
                <option>Priya Sharma (CL-99321) - Aggressive</option>
                <option>+ Create New Profile</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Investment Target Amount (₹)</label>
              <input type="number" className="input" defaultValue={2000000} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Required Yield (% p.a.)</label>
              <input type="number" className="input" defaultValue={10} />
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-slate-700">Permitted Product Types</label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand" />
                  <span className="text-sm text-slate-700">ELN</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand" />
                  <span className="text-sm text-slate-700">DCD</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-brand" />
                  <span className="text-sm text-slate-700">CPN</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button className="btn-primary" onClick={() => setStep(2)}>
              <Search className="w-4 h-4 mr-2" />
              Discover Products
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm flex items-center">
            <span className="mr-2">⚠️</span> DEMO DATA: These are hypothetical configurations for UI demonstration. They are not live market quotes.
          </div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Matching Hypothetical Configurations</h3>
            <button className="text-sm text-brand font-medium" onClick={() => setStep(1)}>Modify Search</button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="card p-5 border-l-4 border-brand hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 bg-navy-100 text-navy-800 rounded">CPN</span>
                      <h4 className="font-semibold text-slate-900">100% Protected NIFTY 50 Note</h4>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">Provides full principal protection with 65% participation in index upside. 3-year tenor.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">Suitability: <span className="text-emerald-600">High Match</span></p>
                    <p className="text-xs text-slate-500 mt-1">Meets loss tolerance</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Max Yield</p>
                    <p className="text-sm font-semibold text-slate-900">Uncapped (65% part.)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Downside Risk</p>
                    <p className="text-sm font-semibold text-slate-900">0% (Protected)</p>
                  </div>
                  <div className="text-right">
                    <button className="text-sm text-brand font-medium inline-flex items-center hover:text-brand-dark">
                      Simulate <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
