import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAssessment } from "../state/AssessmentContext";
import { PageTitle, Metric, Badge } from "../components/ui/Workflow";
import {
  User,
  ShieldCheck,
  TrendingUp,
  PieChart,
  LogOut,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();

  const clientName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Valued Client";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Sample client portfolio & recommended structured products
  const recommendedProducts = [
    {
      id: "rec-1",
      name: "Tech Titans 90% Capital Protected Note",
      type: "CPN",
      tenor: "12 Months",
      underlying: "NVDA, AAPL, MSFT",
      protection: "90% Capital Protected",
      coupon: "8.5% p.a.",
      riskLevel: "Moderate",
      suitability: "Highly Suitable",
    },
    {
      id: "rec-2",
      name: "Global Energy & Banking Yield Enhancer",
      type: "ELN",
      tenor: "6 Months",
      underlying: "XOM, JPM",
      strike: "85% Strike",
      coupon: "12.2% p.a.",
      riskLevel: "Balanced",
      suitability: "Suitable",
    },
    {
      id: "rec-3",
      name: "Dual Currency USD/EUR Yield Booster",
      type: "DCD",
      tenor: "1 Month",
      underlying: "USD/EUR",
      strike: "1.0850",
      coupon: "7.8% p.a.",
      riskLevel: "Conservative",
      suitability: "Highly Suitable",
    },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Client Portal Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.5rem",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c59b27",
              fontWeight: "700",
              fontSize: "1.1rem",
            }}
          >
            AF
          </div>
          <div>
            <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1.05rem" }}>
              AstraForge Private Client Portal
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Secure Wealth Workspace · ID: {user?.id?.slice(0, 8) || "CL-9042"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#0f172a" }}>
              {clientName}
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: "0.72rem",
                color: "#1e40af",
                backgroundColor: "#eff6ff",
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
        <PageTitle
          title={`Welcome, ${clientName}`}
          description="Review your structured product portfolio, personalized product recommendations, and suitability analysis."
        />

        {/* Wealth Summary Metrics */}
        <div className="stats-grid">
          <Metric
            label="Total Portfolio Value"
            value="$1,450,000"
            hint="+4.8% YTD Performance"
          />
          <Metric
            label="Suitability Status"
            value="Balanced Growth"
            hint="Risk Profile Category: Tier 3"
          />
          <Metric
            label="Active Structured Notes"
            value="4 Holdings"
            hint="Next maturity: Nov 15, 2026"
          />
        </div>

        {/* Recommended Products For Client */}
        <section className="card section-card page-stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <Sparkles size={20} color="#c59b27" />
                Tailored Product Recommendations
              </h2>
              <p className="muted" style={{ margin: "4px 0 0 0" }}>
                Curated by your Relationship Manager based on your risk tolerance and yield objectives.
              </p>
            </div>
            <Link to="/discovery" className="btn-secondary" style={{ fontSize: "0.86rem" }}>
              Explore All Products
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
            {recommendedProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
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
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                      }}
                    >
                      {p.type}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#059669",
                        backgroundColor: "#ecfdf5",
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {p.suitability}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a", margin: "0 0 0.5rem 0" }}>
                    {p.name}
                  </h3>

                  <div style={{ fontSize: "0.85rem", color: "#475569", display: "flex", flexDirection: "column", gap: "4px", marginBottom: "1rem" }}>
                    <div><strong>Underlying:</strong> {p.underlying}</div>
                    <div><strong>Tenor:</strong> {p.tenor}</div>
                    <div><strong>Key Feature:</strong> {p.protection || p.strike}</div>
                    <div style={{ color: "#047857", fontWeight: "600" }}><strong>Indicative Coupon:</strong> {p.coupon}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Link
                    to="/simulator"
                    className="btn-primary"
                    style={{ flex: 1, textAlign: "center", fontSize: "0.85rem", padding: "0.45rem" }}
                  >
                    Simulate Payoff
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suitability & Advisory Communication Card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <section className="card section-card page-stack">
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={20} color="#2563eb" />
              Suitability & Investor Profile
            </h2>
            <p className="muted">
              Your investment objectives, time horizon, and risk tolerance profile are compliant with regulatory standards.
            </p>
            <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.88rem", color: "#64748b" }}>Risk Tolerance:</span>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>Balanced Growth (Moderate)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.88rem", color: "#64748b" }}>Max Loss Capacity:</span>
                <span style={{ fontWeight: "600", color: "#0f172a" }}>15% of Portfolio</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.88rem", color: "#64748b" }}>Target Annual Yield:</span>
                <span style={{ fontWeight: "600", color: "#047857" }}>7.0% - 11.5%</span>
              </div>
            </div>
            <Link to="/simulator/suitability" className="btn-secondary" style={{ textAlign: "center", fontSize: "0.88rem" }}>
              View Suitability Breakdown
            </Link>
          </section>

          <section className="card section-card page-stack">
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={20} color="#2563eb" />
              Your Dedicated Relationship Manager
            </h2>
            <p className="muted">
              Have questions about your structured notes, payoffs, or custom structures? Reach out directly.
            </p>
            <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "#0f172a" }}>
                RM
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#0f172a" }}>Alexander Vance, CFA</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Senior Private Wealth Advisor</div>
                <div style={{ fontSize: "0.8rem", color: "#2563eb" }}>rm@astraforge.com</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Link to="/reports" className="btn-secondary" style={{ flex: 1, textAlign: "center", fontSize: "0.88rem" }}>
                Download Wealth Statement
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
