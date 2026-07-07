import ChitNavigation from "./ChitNavigation";
import "./ChitLayout.css";

function ChitLayout({ title, subtitle, actions, children }) {
  return (
    <div className="chit-layout">
      <ChitNavigation />
      <div className="chit-content">
        {(title || subtitle || actions) && (
          <div className="chit-header">
            <div className="chit-header-left">
              <h1 className="chit-page-title">{title}</h1>
              {subtitle && <p className="chit-page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="chit-header-actions">{actions}</div>}
          </div>
        )}
        <div className="chit-page-content">{children}</div>
      </div>
    </div>
  );
}

export default ChitLayout;
