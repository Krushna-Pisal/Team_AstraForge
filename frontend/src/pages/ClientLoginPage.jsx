import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../auth/components/AuthLayout";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please provide both email address and password.");
      return;
    }

    setLoading(true);

    try {
      const { user } = await signIn({ email, password, rememberMe });
      const role =
        user?.app_metadata?.role ||
        user?.user_metadata?.role ||
        user?.raw_user_meta_data?.role ||
        "client";

      const fromPath = location.state?.from?.pathname;
      if (fromPath && fromPath.startsWith("/client")) {
        navigate(fromPath, { replace: true });
        return;
      }

      if (role.toLowerCase() === "rm") {
        navigate("/", { replace: true });
      } else {
        navigate("/client", { replace: true });
      }
    } catch (err) {
      if (err.isUnverified) {
        navigate("/verify-email", { state: { email: err.email } });
        return;
      }
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div>
        <div className="auth-card-header">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#f0fdf4", color: "#166534", padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "600", marginBottom: "0.75rem" }}>
            <ShieldCheck size={14} />
            Private Client Portal
          </div>
          <h2 className="auth-card-title">Client Sign In</h2>
          <p className="auth-card-subtitle">
            Access your structured product simulations, suitability insights, and wealth reports.
          </p>
        </div>

        {successMessage && (
          <div className="auth-banner auth-banner-success">
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="auth-banner auth-banner-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="client-login-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="client-login-email"
                type="email"
                className="auth-input has-icon"
                placeholder="client@astraforge.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label className="auth-label" htmlFor="client-login-password" style={{ marginBottom: 0 }}>
                Password
              </label>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: "0.8rem" }}>
                Forgot password?
              </Link>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="client-login-password"
                type={showPassword ? "text" : "password"}
                className="auth-input has-icon has-toggle"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ borderRadius: "4px" }}
              />
              Remember my session
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={loading}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {loading ? "Signing In…" : "Sign In to Client Portal"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", padding: "0.9rem", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#64748b" }}>
          <div><strong>Demo Client Credentials:</strong></div>
          <div style={{ fontFamily: "monospace", marginTop: "4px" }}>client@astraforge.com / Password123!</div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
          Relationship Manager?{" "}
          <Link to="/login" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
            Access RM Workspace →
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
