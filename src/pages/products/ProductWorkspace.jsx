import { useParams } from "react-router-dom";
import { Navigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../hooks/useAuth";
import { isPlatformOwner } from "../../config/erpModules";
import {
  PRODUCT_CATALOG,
  getProductById,
  hasActiveProductSubscription,
} from "../../config/productLicensing";

function ProductWorkspace() {
  const { productId } = useParams();
  const { profile, role, activeWorkspace } = useAuth();
  const product = getProductById(productId) || PRODUCT_CATALOG[0];
  const canAccess =
    isPlatformOwner(profile, role) ||
    hasActiveProductSubscription(product.id, activeWorkspace);

  if (!canAccess) {
    return <Navigate to={`/upgrade-subscription/${product.id}`} replace />;
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <section className="card solid">
          <div className="module-header">
            <div className="module-icon">{product.shortName}</div>
            <div>
              <h1 className="module-title">{product.productName}</h1>
              <p className="module-description">{product.description}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            <Badge label={product.productCode} variant="primary" size="small" />
            <Badge label={`v${product.version}`} variant="info" size="small" />
            <Badge label="Subscription Active" variant="success" size="small" />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default ProductWorkspace;
