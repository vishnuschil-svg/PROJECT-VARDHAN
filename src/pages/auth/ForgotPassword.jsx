import { useState } from "react";
import { Link } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleResetRequest(event) {
    event.preventDefault(); setLoading(true); setMessage("");
    try { await AccessProviderService.sendPasswordReset(email); setMessage("Reset instructions were sent securely. Check your email."); setEmail(""); }
    catch (error) { setMessage(error.message || "Reset instructions could not be sent. Try again."); }
    finally { setLoading(false); }
  }
  return (
    <AccessShell eyebrow="Account recovery" title="Reset your password" description="We only confirm delivery when the authentication provider accepts the request." footer={<Link to="/login">Back to sign in</Link>}>
      <form className="access-form" onSubmit={handleResetRequest}>
        {message && <div className="access-alert" role="status">{message}</div>}
        <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@business.com" autoComplete="email" required /></label>
        <button className="access-primary" disabled={loading}>{loading ? "Sending…" : "Send reset instructions"}</button>
      </form>
    </AccessShell>
  );
}
export default ForgotPassword;
