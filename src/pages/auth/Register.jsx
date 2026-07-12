import { useState } from "react";
import { Link } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";

const initialForm = { mobile: "", fullName: "", businessName: "", email: "", password: "", product: "mitra-nidhi-chiti-pro", plan: "trial" };
function Register() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setMessage("");
    if (form.password.length < 8) return setMessage("Use at least 8 characters for your password.");
    setLoading(true);
    try { await AccessProviderService.registerOrganizer(form); setMessage("Your organizer account was created. Check your provider verification message before signing in."); setForm(initialForm); }
    catch (error) { setMessage(error.message || "Registration could not be completed."); }
    finally { setLoading(false); }
  }
  return (
    <AccessShell eyebrow="Organizer onboarding" title="Create your business workspace" description="Start with MITRA NIDHI CHITI PRO. Business setup continues with an AI-guided checklist after verified access." footer={<span>Already registered? <Link to="/login">Sign in</Link></span>}>
      <form className="access-form" onSubmit={submit}>
        {message && <div className="access-alert" role="status">{message}</div>}
        <div className="access-grid-2">
          <label>Mobile number<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} type="tel" placeholder="+91 98765 43210" required /></label>
          <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" required /></label>
        </div>
        <label>Business name<input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required /></label>
        <div className="access-grid-2">
          <label>Email address<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" autoComplete="email" required /></label>
          <label>Create password<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" autoComplete="new-password" required /></label>
        </div>
        <div className="access-choice-grid">
          <button type="button" className="access-choice active"><strong>MITRA NIDHI CHITI PRO</strong><small>Current priority application</small></button>
          <button type="button" className="access-choice active"><strong>Free trial</strong><small>Activation depends on approved policy</small></button>
        </div>
        <button className="access-primary" disabled={loading}>{loading ? "Creating workspace…" : "Create secure workspace"}</button>
        {AccessProviderService.getCapabilities().provider === "demo" && <p className="access-provider-note">Registration is ready but disabled until the approved authentication provider is connected. No account will be simulated.</p>}
      </form>
    </AccessShell>
  );
}
export default Register;
