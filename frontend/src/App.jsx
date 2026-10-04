import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./features.css";
import MainLayout from "./components/layout/MainLayout";
import { AssessmentProvider } from "./state/AssessmentContext";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleGuard from "./auth/RoleGuard";
import { lazy, Suspense } from "react";
import { Loading } from "./components/ui/Workflow";

// Authentication Pages
import LoginPage from "./auth/pages/LoginPage";
import SignupPage from "./auth/pages/SignupPage";
import VerifyEmailPage from "./auth/pages/VerifyEmailPage";
import ForgotPasswordPage from "./auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "./auth/pages/ResetPasswordPage";

// Client Portal
import ClientDashboard from "./pages/ClientDashboard";

// RM Workspace Pages
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
import RMProfile from "./pages/RMProfile";
import LandingPage from "./pages/LandingPage";

function RootEntry() {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading text="Preparing AstraForge…" />;
  }

  if (!user) {
    return location.pathname === "/" ? (
      <LandingPage />
    ) : (
      <Navigate to="/login" state={{ from: location }} replace />
    );
  }

  if (role !== "rm") {
    return <Navigate to="/client" replace />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AssessmentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Client Portal Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={["client", "rm"]}>
                    <ClientDashboard />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Protected RM Workspace Routes */}
            <Route
              path="/"
              element={<RootEntry />}
            >
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
              <Route path="profile" element={<RMProfile />} />
              <Route path="history" element={<AssessmentHistory />} />
              <Route path="reports" element={<Reports />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>

            {/* Global Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AssessmentProvider>
    </AuthProvider>
  );
}
