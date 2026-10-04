import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RoleGuard({ allowedRoles = ["rm"], children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner-container">
          <div className="auth-spinner"></div>
          <p className="auth-loading-text">Validating security permissions…</p>
        </div>
      </div>
    );
  }

  // Normalize allowed roles
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
  const currentRole = (role || "client").toLowerCase();

  if (!normalizedAllowed.includes(currentRole)) {
    // If client is trying to access RM route, redirect to client portal
    if (currentRole === "client") {
      return <Navigate to="/client" replace />;
    }
    // If RM is trying to access exclusive client-only route, redirect to RM dashboard
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
