import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SmartChitCapture from "../../components/ai/SmartChitCapture.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import "../../components/dashboard/Dashboard.css";

function SmartChitCapturePage() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  return (
    <main className="smart-capture-page">
      <header className="smart-capture-page-header">
        <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
        <div><h1>Smart Chit Capture</h1><p><ShieldCheck size={16} /> Authenticated and workspace-scoped</p></div>
      </header>
      <SmartChitCapture activeTenantContext={activeTenantContext} />
    </main>
  );
}

export default SmartChitCapturePage;
