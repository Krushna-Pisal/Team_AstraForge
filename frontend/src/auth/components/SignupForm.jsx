import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  UserCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("rm"); // Default to RM or Client
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Compute password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: "" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    let text = "Weak (minimum 8 characters)";
    if (score === 2) text = "Fair - add numbers or symbols";
    if (score === 3) text = "Strong institutional password";

    return { score, text };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validations
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

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
      await signUp({
        fullName,
        email,
        password,
        role,
      });

      // Direct user to email verification screen
      navigate("/verify-email", {
        state: {
          email: email.trim(),
          role,
          name: fullName.trim(),
        },
      });
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-card-header">
        <h2 className="auth-card-title">Create your account</h2>
        <p className="auth-card-subtitle">
          Join the intelligent wealth management platform.
        </p>
      </div>

      {error && (
        <div className="auth-banner auth-banner-error">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Role Selector Tabs */}
        <div className="auth-form-group">
          <label className="auth-label">Select Account Type</label>
          <div className="auth-role-tabs">
            <button
              type="button"
              className={`auth-role-tab ${role === "rm" ? "active" : ""}`}
              onClick={() => setRole("rm")}
            >
              <div className="auth-role-header">
                <span className="auth-role-title">Relationship Manager</span>
                <Briefcase size={16} color={role === "rm" ? "#2563eb" : "#64748b"} />
              </div>
              <span className="auth-role-desc">
                Advisory desk, client profiles, and product simulator.
              </span>
            </button>

            <button
              type="button"
              className={`auth-role-tab ${role === "client" ? "active" : ""}`}
              onClick={() => setRole("client")}
            >
              <div className="auth-role-header">
                <span className="auth-role-title">Private Client</span>
                <UserCheck size={16} color={role === "client" ? "#2563eb" : "#64748b"} />
              </div>
              <span className="auth-role-desc">
                Personal portfolio, product payoff views, and suitability.
              </span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="signup-name">
            Full Name
          </label>
          <div className="auth-input-wrapper">
            <User size={18} className="auth-input-icon" />
            <input
              id="signup-name"
              type="text"
              className="auth-input has-icon"
              placeholder="Alexander Vance"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="signup-email">
            Email Address
          </label>
          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-icon" />
            <input
              id="signup-email"
              type="email"
              className="auth-input has-icon"
              placeholder="alexander@astraforge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="signup-password">
            Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              className="auth-input has-icon has-toggle"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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

          {password && (
            <div>
              <div className="auth-strength-meter">
                <div
                  className={`auth-strength-segment ${
                    strength.score >= 1
                      ? strength.score === 1
                        ? "active-weak"
                        : strength.score === 2
                        ? "active-medium"
                        : "active-strong"
                      : ""
                  }`}
                />
                <div
                  className={`auth-strength-segment ${
                    strength.score >= 2
                      ? strength.score === 2
                        ? "active-medium"
                        : "active-strong"
                      : ""
                  }`}
                />
                <div
                  className={`auth-strength-segment ${
                    strength.score >= 3 ? "active-strong" : ""
                  }`}
                />
              </div>
              <span className="auth-strength-text">{strength.text}</span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="signup-confirm-password">
            Confirm Password
          </label>
          <div className="auth-input-wrapper">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              className="auth-input has-icon has-toggle"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
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
              <span>Creating Account…</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer-prompt">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Sign In
        </Link>
      </div>
    </div>
  );
}
