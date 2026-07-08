import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { isPlatformOwner } from "../../config/erpModules";
import {
  PRODUCT_CATALOG,
  formatPlanPrice,
  getProductsWithSubscriptionState,
} from "../../config/productLicensing";
import "./ProductCatalog.css";

const PLAN_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfYearly: "Half-Yearly",
  yearly: "Yearly",
  lifetime: "Lifetime",
};

function ProductCatalogContent({ platformMode }) {
  const { profile, role, activeWorkspace } = useAuth();
  const canManage = platformMode && isPlatformOwner(profile, role);
  const [products, setProducts] = useState(PRODUCT_CATALOG);
  const customerProducts = getProductsWithSubscriptionState(activeWorkspace);
  const visibleProducts = canManage ? products : customerProducts;

  const toggleProduct = (productId) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              isActive: !product.isActive,
              status: product.isActive ? "Inactive" : "Active",
            }
          : product
      )
    );
  };

  return (
    <div className="product-catalog">
      <div className="product-catalog-summary">
        <div>
          <span className="product-catalog-eyebrow">VARDHAN Product Licensing</span>
          <h2>Independent subscriptions for every ERP product</h2>
          <p>
            Each product carries its own plan, license state and tenant-safe
            access control.
          </p>
        </div>
        <div className="product-catalog-kpis">
          <div>
            <span>Total Products</span>
            <strong>{visibleProducts.length}</strong>
          </div>
          <div>
            <span>{canManage ? "Active Products" : "Subscribed"}</span>
            <strong>
              {canManage
                ? visibleProducts.filter((product) => product.isActive).length
                : visibleProducts.filter((product) => product.subscribed).length}
            </strong>
          </div>
        </div>
      </div>

      <div className="product-catalog-grid">
        {visibleProducts.map((product) => (
          <article
            key={product.id}
            className={`product-card ${product.locked ? "product-card-locked" : ""}`}
          >
            <div className="product-card-header">
              <div className="product-card-icon">{product.shortName}</div>
              <div>
                <h3>{product.productName}</h3>
                <p>{product.productCode}</p>
              </div>
            </div>

            <p className="product-card-description">{product.description}</p>

            <div className="product-card-meta">
              <Badge
                label={product.status}
                variant={product.isActive ? "success" : "warning"}
                size="small"
              />
              <Badge label={`v${product.version}`} variant="primary" size="small" />
              <Badge
                label={product.trialAvailable ? "Trial Available" : "No Trial"}
                variant={product.trialAvailable ? "info" : "default"}
                size="small"
              />
              {!canManage && (
                <Badge
                  label={product.subscribed ? "Subscribed" : "Locked"}
                  variant={product.subscribed ? "success" : "warning"}
                  size="small"
                />
              )}
            </div>

            <div className="product-plan-grid">
              {Object.entries(product.plans).map(([planKey, amount]) => (
                <div key={planKey} className="product-plan">
                  <span>{PLAN_LABELS[planKey]}</span>
                  <strong>{formatPlanPrice(amount)}</strong>
                </div>
              ))}
            </div>

            {canManage && (
              <div className="product-card-actions">
                <Button variant="default" size="small">Edit Product</Button>
                <Button
                  variant={product.isActive ? "warning" : "success"}
                  size="small"
                  onClick={() => toggleProduct(product.id)}
                >
                  {product.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function ProductCatalog({ platformMode = false }) {
  const title = "Product Catalog";
  const subtitle = platformMode
    ? "Create, edit, activate and price VARDHAN ERP products"
    : "Review available ERP products and subscription plans";

  if (platformMode) {
    return (
      <AdminLayout title={title} subtitle={subtitle}>
        <ProductCatalogContent platformMode />
      </AdminLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <ProductCatalogContent />
      </div>
    </DashboardLayout>
  );
}

export default ProductCatalog;
