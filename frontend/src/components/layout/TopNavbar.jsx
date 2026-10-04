import { useAssessment } from "../../state/AssessmentContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LogOut } from "lucide-react";

export default function TopNavbar() {
  const { state } = useAssessment();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async (e) => {
    e.preventDefault();
    await signOut();
    navigate("/login");
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (state.client?.client_name ? state.client.client_name : "Relationship manager");

  return (
    <header className="topbar">
      <span>
        PRIVATE WEALTH <span className="divider">/</span> Advisory desk
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Link to="/clients" className="profile-chip">
          <span className="avatar">RM</span>
          <span>
            {displayName}
            <small>
              {state.client ? "Edit customer details" : "Advisor Workspace"}
            </small>
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          title="Sign out of workspace"
          className="btn-secondary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            fontSize: "0.82rem",
            cursor: "pointer",
            borderRadius: "8px",
          }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
