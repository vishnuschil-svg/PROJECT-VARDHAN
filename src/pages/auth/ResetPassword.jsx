import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";
import { isStrongPassword } from "../../services/auth/CustomerAuthContracts";

function ResetPassword() {
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  useEffect(() => {
    let active = true;
    AccessProviderService.hasRecoverySession().then((valid) => active && setValidSession(valid)).catch(() => active && setValidSession(false)).finally(() => active && setChecking(false));
    return () => { active = false; };
  }, []);
  async function handleUpdatePassword(event) {
    event.preventDefault();
    if (submitting.current || !validSession) return;
    setMessage("");
    if (!isStrongPassword(form.password)) return setMessage("Use at least 8 characters with a letter and a number.");
    if (form.password !== form.confirmPassword) return setMessage("The passwords do not match.");
    submitting.current = true;
    setLoading(true);
    try { await AccessProviderService.updatePassword(form.password); setMessage("Password updated. Redirecting to sign in…"); setForm({ password: "", confirmPassword: "" }); window.setTimeout(() => navigate("/login", { replace: true }), 1200); }
    catch (error) { setMessage(error.message || "Password could not be updated. Try again."); }
    finally { submitting.current = false; setLoading(false); }
  }
  return (
    <AccessShell eyebrow="Protected update" title="Create a new password" description="Your password is handled only by the configured authentication provider." footer={<Link to="/login">Back to sign in</Link>}>
      {checking ? <div className="access-alert" role="status">Checking recovery link…</div> : !validSession ? <div className="access-alert" role="alert">This recovery link is invalid or expired. <Link to="/forgot-password">Request a new link</Link>.</div> : <form className="access-form" onSubmit={handleUpdatePassword}>
        {message && <div className="access-alert" role="status">{message}</div>}
        <label>New password<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" autoComplete="new-password" required /></label>
        <label>Confirm password<input value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type="password" autoComplete="new-password" required /></label>
        <button className="access-primary" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
      </form>}
    </AccessShell>
  );
}
export default ResetPassword;
