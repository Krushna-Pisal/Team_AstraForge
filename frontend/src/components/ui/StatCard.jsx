export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="card p-6 flex items-start">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-slate-900 mb-2">{value}</div>
        {subtitle && (
          <p className="text-sm text-slate-500 flex items-center">
            {trend && (
              <span className={`mr-2 font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
            {subtitle}
          </p>
        )}
      </div>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-navy-50 text-brand flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
