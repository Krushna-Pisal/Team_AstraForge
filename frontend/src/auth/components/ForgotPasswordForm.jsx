import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function ForgotPasswordForm() {
  const { sendResetLink } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid registered email address.");
      return;
    }

    setLoading(true);

    try {
      await sendResetLink(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-status-container">
        <div className="auth-status-icon-wrap success">
          <CheckCircle2 size={36} />
        </div>

        <h2 className="auth-card-title">Reset Link Sent</h2>
        <p className="auth-card-subtitle">
          If an account exists for <strong style={{ color: "#0f172a" }}>{email}</strong>, we have sent instructions to reset your password.
        </p>

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link to="/reset-password" className="auth-btn-secondary" style={{ fontSize: "0.86rem" }}>
            <span>Proceed to Reset Password Page</span>
          </Link>

          <Link to="/login" className="auth-btn-primary">
            <ArrowLeft size={16} />
            <span>Return to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="auth-card-header">
        <h2 className="auth-card-title">Forgot your password?</h2>
        <p className="auth-card-subtitle">
          Enter your registered email and we'll send you a secure password reset link.
        </p>
      </div>

      {error && (
        <div className="auth-banner auth-banner-error">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="forgot-email">
            Email Address
          </label>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-icon" />
            <input
              id="forgot-email"
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

        <button
          type="submit"
          className="auth-btn-primary"
          style={{ marginTop: "1.5rem" }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="auth-spinner small" />
              <span>Sending link…</span>
            </>
          ) : (
            <>
              <span>Send Reset Link</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={15} />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
