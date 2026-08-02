import { ShieldCheck } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import SmartChitCapture from "../../components/ai/SmartChitCapture.jsx";
import { useAuth } from "../../hooks/useAuth.js";

function SmartChitCapturePage() {
  const { activeTenantContext } = useAuth();
  return (
    <ChitLayout
      title="Smart Chit Capture"
      subtitle="Authenticated, workspace-scoped document extraction with editable review"
      showFloatingAI={false}
    >
      <div className="smart-capture-page">
        <p className="smart-capture-trust">
          <ShieldCheck size={16} /> Authenticated OCR proxy â€" no provider keys in the browser
        </p>
        <SmartChitCapture activeTenantContext={activeTenantContext} />
      </div>
    </ChitLayout>
  );
}

export default SmartChitCapturePage;
