import { useState } from "react";
import { Link } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";

function ResetPassword() {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleUpdatePassword(event) {
    event.preventDefault(); setMessage("");
    if (form.password.length < 8) return setMessage("Use at least 8 characters for your new password.");
    if (form.password !== form.confirmPassword) return setMessage("The passwords do not match.");
    setLoading(true);
    try { await AccessProviderService.updatePassword(form.password); setMessage("Password updated. You can now sign in."); setForm({ password: "", confirmPassword: "" }); }
    catch (error) { setMessage(error.message || "Password could not be updated. Try again."); }
    finally { setLoading(false); }
  }
  return (
    <AccessShell eyebrow="Protected update" title="Create a new password" description="Your password is handled only by the configured authentication provider." footer={<Link to="/login">Back to sign in</Link>}>
      <form className="access-form" onSubmit={handleUpdatePassword}>
        {message && <div className="access-alert" role="status">{message}</div>}
        <label>New password<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" autoComplete="new-password" required /></label>
        <label>Confirm password<input value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type="password" autoComplete="new-password" required /></label>
        <button className="access-primary" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
      </form>
    </AccessShell>
  );
}
export default ResetPassword;
