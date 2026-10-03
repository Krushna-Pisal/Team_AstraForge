import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./features.css";
import MainLayout from "./components/layout/MainLayout";
import { AssessmentProvider } from "./state/AssessmentContext";
import { lazy, Suspense } from "react";
import { Loading } from "./components/ui/Workflow";

// Placeholder Pages
import Dashboard from "./pages/Dashboard";
import ProductSimulator from "./pages/ProductSimulator";
import ConfigureELN from "./pages/ConfigureELN";
import ConfigureDCD from "./pages/ConfigureDCD";
import DcdConfigure from "./pages/dcd/DcdConfigure";
import ConfigureCPN from "./pages/ConfigureCPN";
import CpnConfigure from "./pages/cpn/CpnConfigure";
import ClientProfile from "./pages/ClientProfile";
import Investment from "./pages/Investment";
import InvestmentPlan from "./pages/InvestmentPlan";
import Insights from "./pages/Insights";
const SimulationResults = lazy(() => import("./pages/SimulationResults"));
import SuitabilityResults from "./pages/SuitabilityResults";
import ProductDiscovery from "./pages/ProductDiscovery";
import AssessmentHistory from "./pages/AssessmentHistory";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <AssessmentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />

            <Route path="simulator">
              <Route index element={<ProductSimulator />} />
              <Route path="eln" element={<ConfigureELN />} />
              <Route path="dcd" element={<DcdConfigure />} />
              <Route path="cpn" element={<CpnConfigure />} />
              <Route path="investment" element={<Investment />} />
              <Route path="budget" element={<InvestmentPlan />} />
              <Route path="insights" element={<Insights />} />
              <Route
                path="client"
                element={<ClientProfile flow="simulator" />}
              />
              <Route
                path="results"
                element={
                  <Suspense
                    fallback={<Loading text="Opening analysis workspace…" />}
                  >
                    <SimulationResults />
                  </Suspense>
                }
              />
              <Route path="suitability" element={<SuitabilityResults />} />
            </Route>

            <Route path="discovery">
              <Route index element={<ProductDiscovery />} />
            </Route>

            <Route path="clients" element={<ClientProfile />} />
            <Route path="history" element={<AssessmentHistory />} />
            <Route path="reports" element={<Reports />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AssessmentProvider>
  );
}
