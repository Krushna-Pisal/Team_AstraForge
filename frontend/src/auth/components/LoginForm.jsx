import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if routed with a success message (e.g. after password reset)
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
        user?.user_metadata?.role ||
        user?.raw_user_meta_data?.role ||
        "client";

      // If user came from a specific protected route, redirect there
      const fromPath = location.state?.from?.pathname;
      if (fromPath && fromPath !== "/login" && fromPath !== "/signup") {
        navigate(fromPath, { replace: true });
        return;
      }

      // Role-based redirection
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
    <div>
      <div className="auth-card-header">
        <h2 className="auth-card-title">Welcome Back</h2>
        <p className="auth-card-subtitle">
          Sign in to continue to your wealth management workspace.
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
          <label className="auth-label" htmlFor="login-email">
            Email Address
          </label>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-icon" />
            <input
              id="login-email"
              type="email"
              className="auth-input has-icon"
              placeholder="name@institution.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
        </div>

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="auth-input has-icon has-toggle"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="auth-form-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              className="auth-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            Remember me
          </label>

          <Link to="/forgot-password" className="auth-link">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className="auth-btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="auth-spinner small" />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        Don't have an account?{" "}
        <Link to="/signup" className="auth-link">
          Create Account
        </Link>
      </div>

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center", fontSize: "0.85rem", color: "#94a3b8" }}>
        Are you an individual investor?{" "}
        <Link to="/login/client" className="auth-link" style={{ fontWeight: "600", color: "#38bdf8" }}>
          Client Portal Sign In →
        </Link>
      </div>
    </div>
  );
}
