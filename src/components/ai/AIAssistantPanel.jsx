import VardhanAIAssistant from "./VardhanAIAssistant";

function AIAssistantPanel({ activeTenantContext, onOpenImport }) {
  return (
    <div className="ai-assistant-panel">
      <VardhanAIAssistant activeTenantContext={activeTenantContext} onOpenImport={onOpenImport} />
    </div>
  );
}

export default AIAssistantPanel;
