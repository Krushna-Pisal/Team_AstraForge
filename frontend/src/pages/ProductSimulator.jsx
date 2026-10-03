import { Link } from 'react-router-dom';
import { LineChart, DollarSign, ShieldCheck } from 'lucide-react';

const PRODUCTS = [
  {
    id: 'eln',
    name: 'Equity-Linked Notes (ELN)',
    description: 'Investment linked to the performance of an underlying equity or index, with contract-dependent coupons and downside exposure.',
    icon: LineChart,
    features: ['Downside protection (barrier)', 'High yield potential', 'Market participation'],
    path: '/simulator/eln'
  },
  {
    id: 'dcd',
    name: 'Dual Currency Deposits (DCD)',
    description: 'Deposit offering a coupon with possible repayment in an alternate currency depending on the exchange-rate condition.',
    icon: DollarSign,
    features: ['Enhanced yield', 'FX exposure', 'Short-term tenor'],
    path: '/simulator/dcd'
  },
  {
    id: 'cpn',
    name: 'Capital-Protected Notes (CPN)',
    description: 'Structured product offering contractual principal protection subject to issuer creditworthiness, with potential participation in underlying asset returns.',
    icon: ShieldCheck,
    features: ['Principal protection', 'Upside participation', 'Low risk'],
    path: '/simulator/cpn'
  }
];

export default function ProductSimulator() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-slate-900">Select a Product</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Choose a structured investment product to configure parameters, simulate payoff scenarios, and assess client suitability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {PRODUCTS.map((product) => {
          const Icon = product.icon;
          return (
            <div key={product.id} className="card p-6 flex flex-col h-full hover:border-brand transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-navy-50 text-brand flex items-center justify-center mb-6 group-hover:bg-brand group-hover:text-white transition-colors">
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{product.name}</h3>
              <p className="text-slate-600 text-sm mb-6 flex-1">{product.description}</p>
              
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Characteristics</h4>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-700">
                      <span className="text-emerald-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Link to={product.path} className="btn-primary w-full mt-auto">
                Select {product.id.toUpperCase()}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
