import { useState } from "react";
import { Bot, X } from "lucide-react";
import AIAssistantPanel from "./AIAssistantPanel";
import "./VardhanAIFloatingAssistant.css";

function VardhanAIFloatingAssistant({ activeTenantContext }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="vardhan-floating-ai">
      {isOpen && (
        <div className="vardhan-floating-ai-panel">
          <div className="vardhan-floating-ai-header">
            <div>
              <strong>VARDHAN AI</strong>
              <span>Your 24x7 Business Partner</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close VARDHAN AI"><X size={16} /></button>
          </div>
          <AIAssistantPanel activeTenantContext={activeTenantContext} />
        </div>
      )}
      <button type="button" className="vardhan-floating-ai-button" onClick={() => setIsOpen((current) => !current)}>
        <Bot size={20} />
        VARDHAN AI
      </button>
    </div>
  );
}

export default VardhanAIFloatingAssistant;
