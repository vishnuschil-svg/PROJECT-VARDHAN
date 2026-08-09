import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";
import { validateRegistration } from "../../services/auth/CustomerAuthContracts";

const initialForm = {
  fullName: "", email: "", countryCode: "+91", mobile: "", businessName: "",
  password: "", acceptedTerms: false,
};

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submitting = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setMessage("");
    const validation = validateRegistration(form);
    setErrors(validation.errors);
    if (!validation.ok) return;
    submitting.current = true;
    setLoading(true);
    try {
      const result = await AccessProviderService.registerOrganizer({ ...form, referralCode: searchParams.get("ref") || "" });
      if (result.status === "duplicate") {
        setMessage("An account may already exist. Sign in, verify the pending account, or reset the password.");
        return;
      }
      window.sessionStorage.setItem("vardhan.pendingVerificationEmail", result.email);
      if (result.requiresVerification) {
        window.sessionStorage.setItem("vardhan.otpResendAfter", String(Date.now() + 60_000));
        navigate("/verify-email", { replace: true, state: { email: result.email, countdown: 60 } });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch (error) {
      setErrors(error.validation || {});
      setMessage(error.message || "Registration could not be completed. Try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <AccessShell eyebrow="Customer registration" title="Create your Vardhan account" description="Verify your email before the first tenant-isolated workspace is created." footer={<span>Already registered? <Link to="/login">Sign in</Link></span>}>
      <form className="access-form" onSubmit={submit} noValidate>
        {searchParams.get("ref") && <div className="access-alert">Referral code <strong>{searchParams.get("ref").toUpperCase()}</strong> will be securely attributed after email verification.</div>}
        {message && <div className="access-alert" role="alert">{message} <Link to="/forgot-password">Recover access</Link></div>}
        <label className="access-field"><span>Full name</span><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" aria-invalid={Boolean(errors.fullName)} required />{errors.fullName && <small className="access-error">{errors.fullName}</small>}</label>
        <label className="access-field"><span>Email address</span><input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} required />{errors.email && <small className="access-error">{errors.email}</small>}</label>
        <div className="access-phone-row">
          <label className="access-field"><span>Country code</span><select value={form.countryCode} onChange={(e) => update("countryCode", e.target.value)} aria-label="Country code"><option value="+91">+91 India</option></select></label>
          <label className="access-field"><span>Mobile number</span><input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} type="tel" autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" aria-invalid={Boolean(errors.mobile)} required />{errors.mobile && <small className="access-error">{errors.mobile}</small>}</label>
        </div>
        <label className="access-field"><span>Business or company name</span><input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} autoComplete="organization" aria-invalid={Boolean(errors.businessName)} required />{errors.businessName && <small className="access-error">{errors.businessName}</small>}</label>
        <label className="access-field"><span>Password</span><input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} required />{errors.password ? <small className="access-error">{errors.password}</small> : <small>At least 8 characters with a letter and a number.</small>}</label>
        <label className="access-check"><input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update("acceptedTerms", e.target.checked)} /><span>I accept the Terms and Privacy Policy.</span></label>
        {errors.acceptedTerms && <small className="access-error">{errors.acceptedTerms}</small>}
        <button className="access-primary" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
        {!AccessProviderService.getCapabilities().phoneOtp && <p className="access-provider-note">Verification is sent by email. SMS OTP is not configured and will not be simulated.</p>}
      </form>
    </AccessShell>
  );
}

export default Register;
