import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { AccessProviderService } from "../../services/auth/AccessProviderService";

const COPY = {
  "en-IN": {
    eyebrow: "Private workspace",
    title: "Welcome back",
    description: "Sign in to continue to your secure VARDHAN OS workspace.",
    passwordTab: "Password",
    otpTab: "Mobile OTP",
    email: "Email address",
    emailPlaceholder: "name@business.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    phone: "Mobile number",
    phonePlaceholder: "+91 98765 43210",
    otp: "Verification code",
    otpPlaceholder: "Enter 6-digit OTP",
    forgot: "Forgot password?",
    signIn: "Sign in securely",
    sendOtp: "Send secure OTP",
    verifyOtp: "Verify and continue",
    resendOtp: "Use another number",
    waiting: "Please wait…",
    passkey: "Continue with a passkey",
    passkeyUnavailable: "Passkeys are not supported by this browser.",
    passkeyProvider: "Passkey sign-in requires an approved server challenge provider. No credential request was simulated.",
    otpSent: "OTP sent. Enter the verification code to continue.",
    otpDisabled: "Mobile OTP is not enabled in this environment. No message will be simulated.",
    demo: "Demo workspace: admin@vardhan.com / admin123. Never enable demo access in production.",
    fallbackError: "Sign in could not be completed. Check your details and try again.",
    newOrganizer: "New organizer?",
    createAccount: "Create an account",
    protected: "Protected by tenant-isolated access controls",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  "te-IN": {
    eyebrow: "ప్రైవేట్ వర్క్‌స్పేస్",
    title: "తిరిగి స్వాగతం",
    description: "మీ సురక్షిత వర్ధన్ OS వర్క్‌స్పేస్‌లో కొనసాగడానికి సైన్ ఇన్ చేయండి.",
    passwordTab: "పాస్‌వర్డ్",
    otpTab: "మొబైల్ OTP",
    email: "ఈమెయిల్ చిరునామా",
    emailPlaceholder: "name@business.com",
    password: "పాస్‌వర్డ్",
    passwordPlaceholder: "మీ పాస్‌వర్డ్ నమోదు చేయండి",
    phone: "మొబైల్ నంబర్",
    phonePlaceholder: "+91 98765 43210",
    otp: "ధృవీకరణ కోడ్",
    otpPlaceholder: "6 అంకెల OTP నమోదు చేయండి",
    forgot: "పాస్‌వర్డ్ మర్చిపోయారా?",
    signIn: "సురక్షితంగా సైన్ ఇన్ చేయండి",
    sendOtp: "సురక్షిత OTP పంపండి",
    verifyOtp: "ధృవీకరించి కొనసాగండి",
    resendOtp: "మరొక నంబర్ ఉపయోగించండి",
    waiting: "దయచేసి వేచి ఉండండి…",
    passkey: "పాస్‌కీతో కొనసాగండి",
    passkeyUnavailable: "ఈ బ్రౌజర్ పాస్‌కీలకు మద్దతు ఇవ్వదు.",
    passkeyProvider: "పాస్‌కీ సైన్ ఇన్‌కు ఆమోదించిన సర్వర్ ఛాలెంజ్ ప్రొవైడర్ అవసరం. నకిలీ ధృవీకరణ చేయబడలేదు.",
    otpSent: "OTP పంపబడింది. కొనసాగడానికి ధృవీకరణ కోడ్ నమోదు చేయండి.",
    otpDisabled: "ఈ వాతావరణంలో మొబైల్ OTP ప్రారంభించబడలేదు. నకిలీ సందేశం పంపబడదు.",
    demo: "డెమో వర్క్‌స్పేస్: admin@vardhan.com / admin123. ప్రొడక్షన్‌లో డెమో యాక్సెస్‌ను ఎప్పుడూ ప్రారంభించవద్దు.",
    fallbackError: "సైన్ ఇన్ పూర్తి కాలేదు. మీ వివరాలను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.",
    newOrganizer: "కొత్త నిర్వాహకులా?",
    createAccount: "ఖాతా సృష్టించండి",
    protected: "టెనెంట్-ఐసోలేటెడ్ యాక్సెస్ నియంత్రణలతో రక్షించబడింది",
    showPassword: "పాస్‌వర్డ్ చూపించండి",
    hidePassword: "పాస్‌వర్డ్ దాచండి",
  },
};

function PremiumLogin() {
  const navigate = useNavigate();
  const { locale = "en-IN" } = useOutletContext() || {};
  const { loadUser, login } = useAuth();
  const copy = COPY[locale] || COPY["en-IN"];
  const capabilities = AccessProviderService.getCapabilities();
  const [method, setMethod] = useState("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectMethod = (nextMethod) => {
    setMethod(nextMethod);
    setMessage(null);
    setOtpRequested(false);
    setOtp("");
  };

  const finishAuthentication = async () => {
    await loadUser();
    navigate("/dashboard", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (method === "otp") {
        if (!otpRequested) {
          await AccessProviderService.requestOtp({ phone });
          setOtpRequested(true);
          setMessage({ tone: "success", text: copy.otpSent });
          return;
        }
        await AccessProviderService.verifyOtp({ phone, token: otp });
        await finishAuthentication();
        return;
      }
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage({ tone: "error", text: error?.message || copy.fallbackError });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = () => {
    setMessage({
      tone: "info",
      text: capabilities.passkey ? copy.passkeyProvider : copy.passkeyUnavailable,
    });
  };

  return (
    <section className="premium-login-card" aria-labelledby="premium-login-title">
      <div className="premium-login-heading">
        <span className="premium-login-eyebrow"><LockKeyhole size={14} />{copy.eyebrow}</span>
        <h1 id="premium-login-title">{copy.title}</h1>
        <p>{copy.description}</p>
      </div>

      <div className="premium-auth-tabs" role="tablist" aria-label="Sign-in method">
        <button type="button" role="tab" aria-selected={method === "password"} className={method === "password" ? "active" : ""} onClick={() => selectMethod("password")}><KeyRound size={16} />{copy.passwordTab}</button>
        <button type="button" role="tab" aria-selected={method === "otp"} className={method === "otp" ? "active" : ""} onClick={() => selectMethod("otp")}><Phone size={16} />{copy.otpTab}</button>
      </div>

      <form className="premium-login-form" onSubmit={handleSubmit}>
        {message && <div className={`premium-auth-message ${message.tone}`} role="status">{message.text}</div>}

        {method === "password" ? (
          <>
            <label className="premium-auth-field">
              <span>{copy.email}</span>
              <span className="premium-auth-input"><Mail size={18} /><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" placeholder={copy.emailPlaceholder} autoComplete="email" inputMode="email" required /></span>
            </label>
            <label className="premium-auth-field">
              <span>{copy.password}</span>
              <span className="premium-auth-input"><LockKeyhole size={18} /><input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} type={showPassword ? "text" : "password"} placeholder={copy.passwordPlaceholder} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? copy.hidePassword : copy.showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
            </label>
            <div className="premium-login-help"><Link to="/forgot-password">{copy.forgot}</Link></div>
          </>
        ) : (
          <>
            <label className="premium-auth-field">
              <span>{copy.phone}</span>
              <span className="premium-auth-input"><Phone size={18} /><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder={copy.phonePlaceholder} autoComplete="tel" inputMode="tel" disabled={otpRequested} required /></span>
            </label>
            {otpRequested && <label className="premium-auth-field"><span>{copy.otp}</span><span className="premium-auth-input"><ShieldCheck size={18} /><input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} type="text" placeholder={copy.otpPlaceholder} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required autoFocus /></span></label>}
            {otpRequested && <button className="premium-auth-link-button" type="button" onClick={() => { setOtpRequested(false); setOtp(""); setMessage(null); }}>{copy.resendOtp}</button>}
          </>
        )}

        <button className="premium-auth-primary" type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="premium-auth-spinner" size={19} /> : <ArrowRight size={19} />}
          {loading ? copy.waiting : method === "password" ? copy.signIn : otpRequested ? copy.verifyOtp : copy.sendOtp}
        </button>

        <div className="premium-auth-divider"><span>or</span></div>
        <button className="premium-passkey-button" type="button" onClick={handlePasskey}><Fingerprint size={21} />{copy.passkey}</button>

        {method === "otp" && !capabilities.otp && <p className="premium-provider-note">{copy.otpDisabled}</p>}
        {capabilities.provider === "demo" && method === "password" && <p className="premium-provider-note">{copy.demo}</p>}
      </form>

      <footer className="premium-login-footer">
        <span>{copy.newOrganizer} <Link to="/register">{copy.createAccount}</Link></span>
        <small><ShieldCheck size={13} />{copy.protected}</small>
      </footer>
    </section>
  );
}

export default PremiumLogin;
