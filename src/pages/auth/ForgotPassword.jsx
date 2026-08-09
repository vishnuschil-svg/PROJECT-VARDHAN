import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";
import { PASSWORD_RECOVERY_MESSAGE, normalizeEmail } from "../../services/auth/CustomerAuthContracts";

function ForgotPassword() {
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleResetRequest(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true); setMessage("");
    try { await AccessProviderService.sendPasswordReset(normalizeEmail(email)); }
    catch { /* Keep account existence and provider responses private. */ }
    finally { submitting.current = false; setMessage(PASSWORD_RECOVERY_MESSAGE); setEmail(""); setLoading(false); }
  }
  return (
    <AccessShell eyebrow="Account recovery" title="Reset your password" description="We only confirm delivery when the authentication provider accepts the request." footer={<Link to="/login">Back to sign in</Link>}>
      <form className="access-form" onSubmit={handleResetRequest}>
        {message && <div className="access-alert success" role="status">{message}</div>}
        <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@business.com" autoComplete="email" required /></label>
        <button className="access-primary" disabled={loading}>{loading ? "Sending…" : "Send reset instructions"}</button>
      </form>
    </AccessShell>
  );
}
export default ForgotPassword;
