import ChitNavigation from "./ChitNavigation";
import VardhanAIFloatingAssistant from "../ai/VardhanAIFloatingAssistant";
import { useAuth } from "../../hooks/useAuth";
import { useLocation, Link } from "react-router-dom";
import "./ChitLayout.css";

function ChitLayout({ title, subtitle, actions, children, showFloatingAI = true }) {
  const { activeTenantContext } = useAuth();
  const location = useLocation();
  return (
    <div className="chit-layout">
      <ChitNavigation />
      <div className="chit-content">
        {(title || subtitle || actions) && (
          <div className="chit-header">
            <div className="chit-header-left">
              <nav className="chit-breadcrumbs" aria-label="Breadcrumb"><Link to="/dashboard">VARDHAN OS</Link><span>/</span><Link to="/chits">MITRA NIDHI</Link>{location.pathname !== "/chits" && <><span>/</span><b>{title}</b></>}</nav>
              <h1 className="chit-page-title">{title}</h1>
              {subtitle && <p className="chit-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="chit-header-actions">{actions}</div>}
          </div>
        )}
        <div className="chit-page-content">{children}</div>
      </div>
      {showFloatingAI && <VardhanAIFloatingAssistant activeTenantContext={activeTenantContext} />}
    </div>
  );
}

export default ChitLayout;
