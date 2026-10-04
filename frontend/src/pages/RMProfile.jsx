import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RMProfile() {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || "");
    setEmail(profile?.email || user?.email || "");
  }, [profile, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      await updateProfile({ full_name: fullName });
      setMessage("RM profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>RM profile</h1>
          <p>Manage your Relationship Manager account details.</p>
        </div>
        <Link className="btn-secondary" to="/">
          Back to overview
        </Link>
      </div>

      <section className="card section-card">
        <form className="page-stack" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              maxLength={120}
              autoComplete="name"
            />
          </label>

          <label>
            Email address
            <input value={email} readOnly disabled />
          </label>

          {message && <p className="notice success">{message}</p>}
          {error && <p className="notice error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save RM profile"}
          </button>
        </form>
      </section>
    </section>
  );
}
