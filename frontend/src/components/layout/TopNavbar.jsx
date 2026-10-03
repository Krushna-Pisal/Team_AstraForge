import { useAssessment } from "../../state/AssessmentContext";
import { Link } from "react-router-dom";
export default function TopNavbar() {
  const { state } = useAssessment();
  return (
    <header className="topbar">
      <span>
        PRIVATE WEALTH <span className="divider">/</span> Advisory desk
      </span>
      <Link to="/clients" className="profile-chip">
        <span className="avatar">RM</span>
        <span>
          {state.client?.client_name || "Relationship manager"}
          <small>
            {state.client ? "Edit customer details" : "Add a customer"}
          </small>
        </span>
      </Link>
    </header>
  );
}
