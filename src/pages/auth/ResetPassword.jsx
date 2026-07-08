import { useState } from "react";
import { Link } from "react-router-dom";
import { updatePassword } from "../../services/authService";

function ResetPassword() {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setMessage("");

    if (form.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(form.password);
      setMessage("Password updated successfully. You can now login.");
      setForm({ password: "", confirmPassword: "" });
    } catch (error) {
      setMessage(error.message || "Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleUpdatePassword}>
        <h1>VARDHAN ERP</h1>
        <h2>Reset Password</h2>

        {message && <div className="alert">{message}</div>}

        <input
          name="password"
          value={form.password}
          onChange={updateField}
          type="password"
          placeholder="New Password"
          required
        />
        <input
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={updateField}
          type="password"
          placeholder="Confirm Password"
          required
        />
        <button disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>

        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;
