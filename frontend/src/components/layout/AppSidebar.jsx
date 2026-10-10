import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  History,
  FileText,
  Layers,
  TrendingUp,
  Landmark,
  Sliders,
} from "lucide-react";
const items = [
  ["/", "Overview", LayoutDashboard],
  ["/clients", "Customer details", UserRound],
  ["/simulator", "Saved products", Layers],
  ["/simulator/advanced", "Scenario stress-testing", Sliders],
  ["/simulator/options", "Options simulator", TrendingUp],
  ["/simulator/debenture", "Debenture simulator", Landmark],
  ["/discovery", "Find matching products", Layers],
  ["/history", "Assessment history", History],
  ["/reports", "Reports", FileText],
];


export default function AppSidebar() {
  return (
    <aside className="sidebar">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <NavLink className="brand" to="/">
        <img className="brand-logo" src="/astraforge-logo.png" alt="AstraForge" />
      </NavLink>
      <div className="nav-caption">WORKSPACE</div>
      <nav>
        {items.map(([path, name, Icon]) => (
          <NavLink
            key={path}
            to={path}
            aria-label={name}
            title={name}
            end={path === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <Icon size={18} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <span className="engine-dot" /> Deterministic engine
        <span className="muted">Foundation · v1.0</span>
      </div>
    </aside>
  );
}
