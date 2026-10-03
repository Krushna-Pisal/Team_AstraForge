import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import TopNavbar from "./TopNavbar";

export default function MainLayout() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <AppSidebar />
      <div className="workspace">
        <TopNavbar />
        <main id="main-content">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
          <footer>
            Illustrative contract analysis · Historical outcomes are not
            predictions · Subject to issuer credit risk
          </footer>
        </main>
      </div>
    </div>
  );
}
