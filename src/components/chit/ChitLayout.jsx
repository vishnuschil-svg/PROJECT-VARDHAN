import VardhanAIFloatingAssistant from "../ai/VardhanAIFloatingAssistant";
import { useAuth } from "../../hooks/useAuth";
import GroupManagerShell from "./GroupManagerShell";
import "./ChitLayout.css";

function ChitLayout({ title, subtitle, actions, children, showFloatingAI = true }) {
  const { activeTenantContext } = useAuth();
  return (
    <GroupManagerShell
      title={title}
      subtitle={subtitle}
      actions={actions}
      floatingAction={showFloatingAI ? <VardhanAIFloatingAssistant activeTenantContext={activeTenantContext} /> : null}
    >
      {children}
    </GroupManagerShell>
  );
}

export default ChitLayout;
