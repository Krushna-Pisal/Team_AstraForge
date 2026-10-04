import React from "react";
import { ArrowUpRight, ShieldCheck, Cpu, LineChart, Lock } from "lucide-react";
import "../auth.css";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-wrapper">
      {/* Brand & Value Proposition Hero Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-header">
          <div className="auth-brand-icon">
            <ArrowUpRight size={26} strokeWidth={2.5} />
          </div>
          <div className="auth-brand-name">
            AstraForge
            <span className="auth-brand-sub">Private Wealth Intelligence</span>
          </div>
        </div>

        <div className="auth-brand-content">
          <div className="auth-brand-badge">
            <span className="auth-brand-badge-dot"></span>
            Institutional Grade Wealth Architecture
          </div>

          <h1 className="auth-brand-title">
            Intelligent investing for <span className="auth-brand-highlight">modern wealth</span>.
          </h1>

          <p className="auth-brand-desc">
            Empowering Relationship Managers and Private Clients with deterministic payoff simulations, real-time suitability, and structured investment discovery.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <ShieldCheck size={14} />
              </div>
              <div className="auth-feature-text">
                <strong>Intelligent Suitability & Risk Profiling</strong>
                <span>Rigorous client risk categorization and asset allocation checks.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <LineChart size={14} />
              </div>
              <div className="auth-feature-text">
                <strong>Structured Product Payoff Simulator</strong>
                <span>Interactive Monte Carlo & deterministic barrier analysis (ELN, DCD, CPN).</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <Cpu size={14} />
              </div>
              <div className="auth-feature-text">
                <strong>Multi-Persona Advisory Desk</strong>
                <span>Tailored execution workflows for Relationship Managers and direct Client portals.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Lock size={13} />
            <span>256-Bit Encrypted · Supabase Protected</span>
          </div>
          <span>v1.0 Institutional Release</span>
        </div>
      </div>

      {/* Main Authentication Card Panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          {children}
        </div>
      </div>
    </div>
  );
}
