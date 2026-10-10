import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api, money } from "../lib/api";
import { PageTitle, Metric, Badge, Loading } from "../components/ui/Workflow";
import {
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  PlusCircle,
  Clock,
} from "lucide-react";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);

  const clientName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Valued Client";

  useEffect(() => {
    async function loadClientData() {
      setLoading(true);
      setError(null);
      try {
        const data = await api("/api/customer/assessments");
        setAssessments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load client assessments:", err);
        setError("Unable to load simulation history.");
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Structured products catalog available for customer exploration
  const productCatalog = [
    {
      id: "prod-cpn",
      name: "Capital Protected Note (CPN)",
      type: "CPN",
      tenor: "12 - 36 Months",
      underlying: "NIFTY 50 / Major Indices",
      keyFeature: "100% Principal Protection",
      suitabilityTarget: "Conservative to Moderate",
      badgeColor: "#059669",
    },
    {
      id: "prod-eln",
      name: "Equity Linked Note (ELN)",
      type: "ELN",
      tenor: "6 - 12 Months",
      underlying: "Blue-chip Equities",
      keyFeature: "Enhanced Coupon Yield",
      suitabilityTarget: "Moderate to Aggressive",
      badgeColor: "#2563eb",
    },
    {
      id: "prod-dcd",
      name: "Dual Currency Deposit (DCD)",
      type: "DCD",
      tenor: "1 - 3 Months",
      underlying: "USD/INR, EUR/USD",
      keyFeature: "Short-Term Premium Yield",
      suitabilityTarget: "Multi-Currency Portfolios",
      badgeColor: "#d97706",
    },
    {
      id: "prod-options",
      name: "Options Payoff Simulator",
      type: "OPTIONS",
      tenor: "1 - 12 Months",
      underlying: "Equities, Indices (Calls / Puts)",
      keyFeature: "Long & Short Expiry Payoffs",
      suitabilityTarget: "All Derivative Profiles",
      badgeColor: "#a855f7",
      to: "/client/options",
    },
    {
      id: "prod-debenture",
      name: "Debenture Valuation & YTM",
      type: "DEBENTURE",
      tenor: "1 - 10 Years",
      underlying: "Fixed Income Debentures / Bonds",
      keyFeature: "Purchase YTM & Yield Sensitivity",
      suitabilityTarget: "Conservative / Fixed Income",
      badgeColor: "#059669",
      to: "/client/debenture",
    },
    {
      id: "prod-advanced",
      name: "Cross-Product Scenario Testing",
      type: "ADVANCED",
      tenor: "Custom Tenors",
      underlying: "Equities, Currencies, Indices",
      keyFeature: "Market Shocks & Historical Replay",
      suitabilityTarget: "Stress-Testing & Comparison",
      badgeColor: "#38bdf8",
      to: "/client/advanced",
    },
  ];




  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }} className="page-stack">
      {/* Client Portal Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          backgroundColor: "#17263a",
          borderRadius: "14px",
          border: "1px solid #2a3e56",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#0b111c",
              border: "1px solid #38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38bdf8",
              fontWeight: "700",
              fontSize: "1.1rem",
            }}
          >
            AF
          </div>
          <div>
            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "1.05rem" }}>
              AstraForge Private Client Portal
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Secure Client Workspace · ID: {user?.id?.slice(0, 8) || "CL-USER"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#f8fafc" }}>
              {clientName}
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.72rem",
                color: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                padding: "2px 8px",
                borderRadius: "999px",
                fontWeight: "600",
              }}
            >
              Private Client
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.5rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "8px",
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Page Stack */}
      <div className="page-stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <PageTitle
            title={`Welcome, ${clientName}`}
            description="Explore structured investment products, simulate scenarios, and review your regulatory suitability records."
          />
          <Link
            to="/client/simulate"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.65rem 1.25rem",
              fontWeight: "600",
            }}
          >
            <PlusCircle size={18} />
            <span>New Product Simulation</span>
          </Link>
        </div>

        {/* Real Summary Metrics */}
        <div className="stats-grid">
          <Metric
            label="Saved Simulations"
            value={loading ? "…" : `${assessments.length} Records`}
            hint={assessments.length > 0 ? "Saved in secure ledger" : "No simulations yet"}
          />
          <Metric
            label="Supported Note Types"
            value="CPN · ELN · DCD"
            hint="Fully modeled payout engines"
          />
          <Metric
            label="Compliance Dimensions"
            value="6 Regulatory Checks"
            hint="Suitability rule set 1.0.0"
            tone="positive"
          />
        </div>

        {/* Available Products Catalog */}
        <section className="card section-card page-stack">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Sparkles size={20} color="#38bdf8" />
              Available Structured Products
            </h2>
            <p className="muted" style={{ margin: "4px 0 0 0" }}>
              Select a note structure to test custom investment sizes, payoffs, and suitability compliance.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
            {productCatalog.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: "#17263a",
                  border: "1px solid #2a3e56",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#0b111c",
                        color: "#38bdf8",
                        border: "1px solid #2a3e56",
                      }}
                    >
                      {p.type}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#94a3b8",
                        backgroundColor: "#1e293b",
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {p.suitabilityTarget}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#f8fafc", margin: "0 0 0.5rem 0" }}>
                    {p.name}
                  </h3>

                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
                    <div><span className="muted">Underlying:</span> {p.underlying}</div>
                    <div><span className="muted">Typical Tenor:</span> {p.tenor}</div>
                    <div><span className="muted">Key Feature:</span> <strong>{p.keyFeature}</strong></div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Link
                    to={p.to || `/client/simulate?product=${p.type}`}
                    className="btn-primary"
                    style={{ flex: 1, textAlign: "center", fontSize: "0.85rem", padding: "0.55rem" }}
                  >
                    Simulate {p.type === "OPTIONS" ? "Options" : p.type} Payoff
                  </Link>

                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Simulations & Assessments */}
        <section className="card section-card page-stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <Clock size={20} color="#38bdf8" />
                Your Saved Simulations & Reports
              </h2>
              <p className="muted" style={{ margin: "4px 0 0 0" }}>
                Historical evaluations and suitability checks associated with your client account.
              </p>
            </div>
            {assessments.length > 0 && (
              <span className="badge" style={{ backgroundColor: "#1e293b", color: "#94a3b8" }}>
                {assessments.length} Saved
              </span>
            )}
          </div>

          {loading ? (
            <Loading text="Loading simulation history…" />
          ) : assessments.length === 0 ? (
            <div className="card empty-state" style={{ padding: "2.5rem 1.5rem" }}>
              <div className="empty-mark" style={{ fontSize: "2rem" }}>📋</div>
              <h2>No Saved Simulations Yet</h2>
              <p className="muted" style={{ maxWidth: "420px", margin: "0.5rem auto 1.25rem" }}>
                You haven't run any product simulations yet. Start a simulation to analyze potential payoffs, verify suitability, and generate advisory reports.
              </p>
              <Link to="/client/simulate" className="btn-primary">
                Run Your First Simulation
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #40516b", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Date</th>
                    <th style={{ padding: "10px 8px" }}>Product</th>
                    <th style={{ padding: "10px 8px" }}>Underlying</th>
                    <th style={{ padding: "10px 8px" }}>Amount</th>
                    <th style={{ padding: "10px 8px" }}>Suitability</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => {
                    const req = a.request || {};
                    const evalBundle = a.evaluation || {};
                    const assessment = evalBundle.assessment || {};
                    const client = req.client || {};

                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px 8px", color: "#94a3b8" }}>
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: "600" }}>
                          {req.product_type || "Note"}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#94a3b8" }}>
                          {req.ticker || "^NSEI"}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: "600", color: "#f8fafc" }}>
                          {money(client.proposed_investment_amount || 0, client.portfolio_currency || "INR")}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <Badge value={assessment.overall_status} />
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>
                          <Link
                            to={`/client/assessment/${a.id}`}
                            className="btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.8rem", textDecoration: "none" }}
                          >
                            View & Report →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Suitability & Advisory Communication Card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <section className="card section-card page-stack">
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={20} color="#2563eb" />
              Regulatory Protection & Suitability
            </h2>
            <p className="muted">
              AstraForge enforces suitability across 6 dimensions: Risk Appetite, Loss Capacity, Time Horizon, Liquidity, Objective Alignment, and Knowledge.
            </p>
            <div style={{ backgroundColor: "#17263a", padding: "1rem", borderRadius: "10px", border: "1px solid #2a3e56" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.88rem", color: "#94a3b8" }}>Rules Standard:</span>
                <span style={{ fontWeight: "600", color: "#f8fafc" }}>Rule Set 1.0.0 (SEBI / MiFID II)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.88rem", color: "#94a3b8" }}>Payoff Engine:</span>
                <span style={{ fontWeight: "600", color: "#38bdf8" }}>Deterministic Pricing Engine</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.88rem", color: "#94a3b8" }}>Explanation Mode:</span>
                <span style={{ fontWeight: "600", color: "#4ade80" }}>Grounded Plain Language (EN/HI/MR)</span>
              </div>
            </div>
            <Link to="/client/simulate" className="btn-secondary" style={{ textAlign: "center", fontSize: "0.88rem" }}>
              Test A New Portfolio Allocation
            </Link>
          </section>

          <section className="card section-card page-stack">
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={20} color="#2563eb" />
              Your Dedicated Relationship Manager
            </h2>
            <p className="muted">
              Have questions about your structured notes, custom scenarios, or terms? Contact your dedicated RM.
            </p>
            <div style={{ backgroundColor: "#17263a", padding: "1rem", borderRadius: "10px", border: "1px solid #2a3e56", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#0b111c", border: "1px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#38bdf8" }}>
                RM
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#f8fafc" }}>Alexander Vance, CFA</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Senior Private Wealth Advisor</div>
                <div style={{ fontSize: "0.8rem", color: "#38bdf8" }}>rm@astraforge.com</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Link to="/client/simulate" className="btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: "0.88rem" }}>
                Simulate Structured Note
              </Link>
            </div>
          </section>
        </div>

        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem", marginTop: "1rem" }}>
          AstraForge Private Banking · Illustrative product payoffs and simulations are for educational purposes. Subject to issuer terms and market risks.
        </p>
      </div>
    </div>
  );
}
