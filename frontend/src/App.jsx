import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { SimulatorProvider } from './context/SimulatorContext';

// Pages
import Dashboard from './pages/Dashboard';
import ProductSimulator from './pages/ProductSimulator';
import ConfigureELN from './pages/ConfigureELN';
import ConfigureDCD from './pages/ConfigureDCD';
import ConfigureCPN from './pages/ConfigureCPN';
import ClientProfile from './pages/ClientProfile';
import SimulationResults from './pages/SimulationResults';
import SuitabilityResults from './pages/SuitabilityResults';
import AssessmentHistory from './pages/AssessmentHistory';
import Reports from './pages/Reports';

export default function App() {
  return (
    <SimulatorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            
            <Route path="simulator">
              <Route index element={<ProductSimulator />} />
              <Route path="eln" element={<ConfigureELN />} />
              <Route path="dcd" element={<ConfigureDCD />} />
              <Route path="cpn" element={<ConfigureCPN />} />
              <Route path="client" element={<ClientProfile flow="simulator" />} />
              <Route path="results" element={<SimulationResults />} />
              <Route path="suitability" element={<SuitabilityResults />} />
            </Route>

            <Route path="history" element={<AssessmentHistory />} />
            <Route path="reports" element={<Reports />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SimulatorProvider>
  );
}
