import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function ResetPasswordForm() {
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to update password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-status-container">
        <div className="auth-status-icon-wrap success">
          <CheckCircle2 size={36} />
        </div>

        <h2 className="auth-card-title">Password Updated Successfully</h2>
        <p className="auth-card-subtitle" style={{ marginBottom: "2rem" }}>
          Your password has been changed successfully. You can now sign in with your new credentials.
        </p>

        <Link
          to="/login"
          state={{ message: "Your password has been reset successfully. Please log in." }}
          className="auth-btn-primary"
        >
          <span>Go to Login</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="auth-card-header">
        <h2 className="auth-card-title">Create New Password</h2>
        <p className="auth-card-subtitle">
          Enter your new password to secure your wealth management workspace.
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
          <label className="auth-label" htmlFor="reset-new-password">
            New Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="reset-new-password"
              type={showPassword ? "text" : "password"}
              className="auth-input has-icon has-toggle"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="reset-confirm-password">
            Confirm New Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className="auth-input has-icon has-toggle"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="auth-input-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn-primary"
          style={{ marginTop: "1.75rem" }}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="auth-spinner small" />
              <span>Updating Password…</span>
            </>
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        <Link to="/login" className="auth-link">
          Cancel and return to Login
        </Link>
      </div>
    </div>
  );
}
