import { useNavigate } from "react-router-dom";
import { getProductsWithSubscriptionState } from "../../config/productLicensing";
import { useAuth } from "../../hooks/useAuth";

function ModuleGrid() {
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();
  const products = getProductsWithSubscriptionState(activeWorkspace);
  const accessLabel = activeWorkspace?.label || "Assigned Modules";

  return (
    <section className="module-grid-section">
      <div className="section-title-row">
        <div>
          <h2>ERP Product Suite</h2>
          <p>Manage all VARDHAN products from one secure workspace.</p>
        </div>
        <span className="module-access-mode">{accessLabel}</span>
      </div>

      <div className="module-grid">
        {products.map((module) => {
          const isActive = module.isActive;
          const canAccess = module.subscribed;

          return (
            <div
              key={module.id}
              className={`card solid module-card ${
                isActive ? "interactive" : ""
              } ${module.locked ? "module-card-locked" : ""}`}
              onClick={() => {
                if (isActive && canAccess) {
                  navigate(module.path);
                  return;
                }

                if (isActive && !canAccess) {
                  navigate(`/upgrade-subscription/${module.id}`);
                }
              }}
              aria-disabled={!isActive || !canAccess}
            >
              <div className="module-header">
                <div className="module-icon">{module.shortName}</div>
                <div>
                  <h3 className="module-title">{module.name}</h3>
                  <p className="module-description">{module.description}</p>
                </div>
              </div>

              <div className="module-footer">
                <span className={`module-badge ${canAccess ? "active" : "soon"}`}>
                  {canAccess ? module.licenseStatus : "Locked"}
                </span>
                <button
                  className="module-link"
                  type="button"
                  disabled={!isActive}
                >
                  {isActive && canAccess ? "Open Product ->" : "Upgrade Subscription"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ModuleGrid;
