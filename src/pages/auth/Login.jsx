import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { useAuth } from "../../hooks/useAuth";
import { AuthService } from "../../services/auth/AuthService";
import { AccessProviderService } from "../../services/auth/AccessProviderService";

function Login() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("password");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const capabilities = AccessProviderService.getCapabilities();

  async function handleLogin(event) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      if (method === "otp") {
        await AccessProviderService.requestOtp({ phone });
        setMessage("OTP sent. Verification will continue securely with your configured provider.");
        return;
      }
      await AuthService.login(form);
      await loadUser();
      navigate("/dashboard", { replace: true });
    } catch (error) { setMessage(error.message || "Sign in could not be completed. Check your details and try again."); }
    finally { setLoading(false); }
  }

  return (
    <AccessShell eyebrow="Secure access" title="Welcome back" description="Sign in to your VARDHAN OS business workspace." footer={<><Link to="/forgot-password">Forgot password?</Link><span>New organizer? <Link to="/register">Create an account</Link></span></>}>
      <div className="access-methods" role="tablist" aria-label="Sign-in method">
        <button type="button" className={method === "password" ? "active" : ""} onClick={() => { setMethod("password"); setMessage(""); }}>Password</button>
        <button type="button" className={method === "otp" ? "active" : ""} onClick={() => { setMethod("otp"); setMessage(""); }}>Mobile OTP</button>
      </div>
      <form className="access-form" onSubmit={handleLogin}>
        {message && <div className="access-alert" role="status">{message}</div>}
        {method === "password" ? <>
          <label>Email address<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="name@business.com" autoComplete="email" required /></label>
          <label>Password<input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder="Enter your password" autoComplete="current-password" required /></label>
        </> : <label>Mobile number<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210" autoComplete="tel" required /></label>}
        <button className="access-primary" disabled={loading}>{loading ? "Please wait…" : method === "otp" ? "Send secure OTP" : "Sign in securely"}</button>
        {method === "otp" && !capabilities.otp && <p className="access-provider-note">Mobile OTP is provider-ready but not enabled in this environment. No message will be simulated.</p>}
        {capabilities.provider === "demo" && method === "password" && <p className="access-provider-note"><strong>Demo workspace:</strong> admin@vardhan.com / admin123. Do not use this access mode in production.</p>}
      </form>
    </AccessShell>
  );
}

export default Login;
