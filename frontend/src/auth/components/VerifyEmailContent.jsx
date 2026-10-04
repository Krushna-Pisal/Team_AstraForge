import React, { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  MailCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function VerifyEmailContent() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { resendVerification, verifyEmail } = useAuth();

  const email = location.state?.email || searchParams.get("email") || "your email address";
  const [resendStatus, setResendStatus] = useState({ state: "idle", message: "" });
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // Check if user landed on verify-email with hash or token indicating completed verification
  useEffect(() => {
    const hash = window.location.hash;
    const type = searchParams.get("type");
    const code = searchParams.get("code") || searchParams.get("token");

    if (hash.includes("access_token") || type === "signup" || type === "email_confirmation" || code) {
      setIsVerified(true);
    }

    // If local simulation was active for this email, allow instant verification confirmation
    if (location.state?.autoVerify && email) {
      verifyEmail(email).then((success) => {
        if (success) setIsVerified(true);
      });
    }
  }, [searchParams, location.state, email, verifyEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendStatus({ state: "loading", message: "" });

    try {
      await resendVerification(email);
      setResendStatus({
        state: "success",
        message: "Verification link sent! Please check your inbox or spam folder.",
      });
      setCooldown(60);
    } catch (err) {
      setResendStatus({
        state: "error",
        message: err.message || "Unable to resend verification email. Please try again later.",
      });
    }
  };

  const handleSimulateVerificationClick = async () => {
    // Helpful simulator button for local developer testing
    try {
      await verifyEmail(email);
      setIsVerified(true);
    } catch {
      setIsVerified(true);
    }
  };

  if (isVerified) {
    return (
      <div className="auth-status-container">
        <div className="auth-status-icon-wrap success">
          <CheckCircle2 size={36} />
        </div>

        <h2 className="auth-card-title">Email Verified Successfully</h2>
        <p className="auth-card-subtitle" style={{ marginBottom: "2rem" }}>
          Your AstraForge account is now activated and verified. You can now access your wealth management workspace.
        </p>

        <Link
          to="/login"
          state={{ message: "Email verified successfully! Please sign in to proceed." }}
          className="auth-btn-primary"
        >
          <span>Continue to Login</span>
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="auth-status-container">
        <div className="auth-status-icon-wrap error">
          <AlertTriangle size={36} />
        </div>

        <h2 className="auth-card-title">Verification Link Invalid</h2>
        <p className="auth-card-subtitle" style={{ marginBottom: "1.5rem" }}>
          {verificationError}
        </p>

        <button
          type="button"
          onClick={handleResend}
          className="auth-btn-primary"
          style={{ marginBottom: "1rem" }}
          disabled={cooldown > 0}
        >
          <span>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Link"}</span>
        </button>

        <Link to="/login" className="auth-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-status-container">
      <div className="auth-status-icon-wrap email">
        <MailCheck size={36} />
      </div>

      <h2 className="auth-card-title">Check your email</h2>
      <p className="auth-card-subtitle">
        We've sent a secure verification link to:
      </p>

      <div className="auth-email-badge">{email}</div>

      <p className="auth-card-subtitle" style={{ marginBottom: "1.75rem", fontSize: "0.88rem" }}>
        Please click the link in your email to activate and secure your account before signing in.
      </p>

      {resendStatus.message && (
        <div
          className={`auth-banner ${
            resendStatus.state === "success" ? "auth-banner-success" : "auth-banner-error"
          }`}
          style={{ textAlign: "left" }}
        >
          <span>{resendStatus.message}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={handleResend}
          className="auth-btn-secondary"
          disabled={cooldown > 0 || resendStatus.state === "loading"}
        >
          <RotateCw
            size={16}
            className={resendStatus.state === "loading" ? "auth-spinner small" : ""}
          />
          <span>
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Didn't receive the email? Resend"}
          </span>
        </button>

        {/* Development testing quick confirmation button */}
        <button
          type="button"
          onClick={handleSimulateVerificationClick}
          className="auth-link"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.3rem",
            fontSize: "0.8rem",
            opacity: 0.8,
          }}
        >
          (Simulate / Confirm verification link click)
        </button>

        <Link to="/login" className="auth-btn-primary" style={{ marginTop: "0.5rem" }}>
          <ArrowLeft size={16} />
          <span>Back to Login</span>
        </Link>
      </div>
    </div>
  );
}
