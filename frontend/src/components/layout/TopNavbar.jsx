import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LogOut } from "lucide-react";

export default function TopNavbar() {
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
    "Relationship manager";

  return (
    <header className="topbar">
      <span>
        PRIVATE WEALTH <span className="divider">/</span> Advisory desk
      </span>
      <div className="topbar-actions">
        <Link to="/profile" className="profile-chip">
          <span className="avatar">RM</span>
          <span>
            {displayName}
            <small>Edit RM profile</small>
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          title="Sign out of workspace"
          className="btn-secondary sign-out-button"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
