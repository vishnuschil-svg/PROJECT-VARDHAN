import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessShell from "../../components/auth/AccessShell";
import { AccessProviderService } from "../../services/auth/AccessProviderService";
import { ONBOARDING_STATUS } from "../../services/auth/CustomerAuthContracts";
import { useAuth } from "../../hooks/useAuth";
import { COMPLIANCE_DECLARATION, DECLARATION_VERSION } from "../../config/groupManagerSafety";

function Onboarding() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const submitting = useRef(false);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    AccessProviderService.getOnboardingState().then(async (state) => {
      if (!active) return;
      if (!state.authenticated) return navigate("/login", { replace: true });
      if (!state.verified) return navigate("/verify-email", { replace: true });
      if (!state.profile) await AccessProviderService.ensureVerifiedProfile();
      if (state.status === ONBOARDING_STATUS.COMPLETE && state.profile?.workspace_id) return navigate("/dashboard", { replace: true });
      setBusinessName(state.profile?.business_name || state.metadata?.business_name || "");
      setDeclarationAccepted(state.metadata?.group_manager_declaration_accepted === true);
    }).catch(() => active && setMessage("Your onboarding progress could not be loaded. Refresh to try again.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setMessage("");
    try {
      await AccessProviderService.provisionWorkspace({ businessName, businessType: "chit_management", declarationAccepted, declarationVersion: DECLARATION_VERSION });
      await loadUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Workspace setup could not be completed. Your verified profile is safe; try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <AccessShell eyebrow="First workspace" title="Set up your business" description="Your owner membership and trial are created together in one tenant-isolated operation.">
      {loading ? <div className="access-alert" role="status">Loading onboarding progress…</div> : <form className="access-form" onSubmit={submit}>
        {message && <div className="access-alert" role="alert">{message}</div>}
        <label className="access-field"><span>Business name</span><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} autoComplete="organization" required /></label>
        <label className="access-field"><span>Business type</span><select value="chit_management" disabled><option value="chit_management">Chit Management — MITRA NIDHI CHITI PRO</option></select></label>
        <label className="access-declaration"><input type="checkbox" checked={declarationAccepted} onChange={(event) => setDeclarationAccepted(event.target.checked)} required /><span>{COMPLIANCE_DECLARATION}</span></label>
        <div className="access-alert success">You will be assigned the Owner role with a 30-day trial. Other products remain unavailable until launched.</div>
        <button className="access-primary" disabled={saving}>{saving ? "Creating workspace…" : "Create workspace and continue"}</button>
      </form>}
    </AccessShell>
  );
}

export default Onboarding;
