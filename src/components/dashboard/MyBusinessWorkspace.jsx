import { useNavigate } from "react-router-dom";
import {
  CHIT_MANAGEMENT_ERP,
  CHIT_PRODUCT_NAME,
  hasModuleAccess,
  isPlatformOwner,
} from "../../config/erpModules";
import {
  CUSTOMER_ACCESS_LABELS,
  CUSTOMER_DATA_SCOPES,
  CUSTOMER_TYPES,
} from "../../config/customerAccess";
import { WORKSPACE_TYPES } from "../../config/workspaceAccess";
import { useAuth } from "../../hooks/useAuth";
import "./MyBusinessWorkspace.css";

function MyBusinessWorkspace() {
  const navigate = useNavigate();
  const { profile, role, modules, activeWorkspace, activeTenantContext } = useAuth();
  const canViewWorkspace = isPlatformOwner(profile, role);
  const canOpenChit = hasModuleAccess(CHIT_MANAGEMENT_ERP, modules, profile, role);

  if (!canViewWorkspace || activeWorkspace?.id !== WORKSPACE_TYPES.MY_BUSINESS) {
    return null;
  }

  return (
    <section className="my-business-workspace">
      <div className="my-business-content">
        <div>
          <div className="workspace-label-row">
            <span className="workspace-mode-label">
              {CUSTOMER_ACCESS_LABELS[CUSTOMER_TYPES.OWN_BUSINESS]}
            </span>
            <span className="workspace-data-label">Real chit business</span>
          </div>
          <h2>{CHIT_PRODUCT_NAME}</h2>
          <p>
            Open Chit Management ERP for VARDHAN owned chit operations with
            tenant-isolated own-business data.
          </p>
        </div>

        <div className="workspace-meta-grid">
          <div>
            <span>Tenant</span>
            <strong>{activeTenantContext?.tenant_id}</strong>
          </div>
          <div>
            <span>Data Scope</span>
            <strong>{activeTenantContext?.data_scope || CUSTOMER_DATA_SCOPES.OWN_BUSINESS}</strong>
          </div>
          <div>
            <span>Separated From</span>
            <strong>Demo and Paid Customer data</strong>
          </div>
        </div>
      </div>

      <button
        className="my-business-action"
        type="button"
        disabled={!canOpenChit}
        onClick={() => navigate("/chits?workspace=my-business")}
      >
        Open My Business
      </button>
    </section>
  );
}

export default MyBusinessWorkspace;
