import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";
import { normalizeOtp } from "../../services/auth/CustomerAuthContracts";

function EmailVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputs = useRef([]);
  const submitting = useRef(false);
  const email = location.state?.email || window.sessionStorage.getItem("vardhan.pendingVerificationEmail") || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(() => {
    const persisted = Number(window.sessionStorage.getItem("vardhan.otpResendAfter") || 0);
    return Math.max(Number(location.state?.countdown || 0), Math.ceil((persisted - Date.now()) / 1000), 0);
  });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  function setDigit(index, value) {
    const nextValue = normalizeOtp(value).slice(-1);
    setDigits((current) => current.map((digit, position) => position === index ? nextValue : digit));
    if (nextValue && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  }

  function handlePaste(event) {
    const pasted = normalizeOtp(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => pasted[index] || ""));
    inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }

  async function verify(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (!email) return setMessage("Return to registration and request a new verification code.");
    const token = digits.join("");
    if (token.length !== 6) return setMessage("Enter the complete 6-digit verification code.");
    submitting.current = true;
    setLoading(true);
    setMessage("");
    try {
      await AccessProviderService.verifyEmailOtp({ email, token });
      window.sessionStorage.removeItem("vardhan.pendingVerificationEmail");
      window.sessionStorage.removeItem("vardhan.otpResendAfter");
      navigate("/onboarding", { replace: true });
    } catch (error) {
      try {
        const state = await AccessProviderService.getOnboardingState();
        if (state.verified) {
          await AccessProviderService.ensureVerifiedProfile();
          navigate("/onboarding", { replace: true });
          return;
        }
      } catch {
        // Keep the original customer-safe verification message.
      }
      setMessage(error.message || "The code could not be verified. Try again.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || countdown > 0 || resending) return;
    setResending(true);
    setMessage("");
    try {
      await AccessProviderService.resendEmailOtp(email);
      setCountdown(60);
      window.sessionStorage.setItem("vardhan.otpResendAfter", String(Date.now() + 60_000));
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setMessage("A new verification code was sent.");
    } catch (error) {
      setMessage(error.message || "A new code could not be sent. Try again later.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AccessShell eyebrow="Email verification" title="Enter your verification code" description={email ? `We sent a code to ${email}.` : "Your verification request could not be resumed."} footer={<span><Link to="/register">Back to registration</Link> · <Link to="/login">Sign in</Link></span>}>
      <form className="access-form" onSubmit={verify}>
        {message && <div className="access-alert" role="status">{message}</div>}
        <div className="access-otp" onPaste={handlePaste}>
          {digits.map((digit, index) => <input key={index} ref={(node) => { inputs.current[index] = node; }} value={digit} onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} aria-label={`Verification digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} autoFocus={index === 0} />)}
        </div>
        <button className="access-primary" disabled={loading || digits.join("").length !== 6}>{loading ? "Verifying…" : "Verify email"}</button>
        <button className="access-secondary" type="button" onClick={resend} disabled={!email || countdown > 0 || resending}>{resending ? "Sending…" : countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}</button>
      </form>
    </AccessShell>
  );
}

export default EmailVerification;
