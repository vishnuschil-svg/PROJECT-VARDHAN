import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { PRODUCT_CATALOG, formatPlanPrice, getProductById } from "../../config/productLicensing";
import "./UpgradeSubscription.css";

const PLAN_LABELS = {
  monthly: "Monthly Plan",
  quarterly: "Quarterly Plan",
  halfYearly: "Half-Yearly Plan",
  yearly: "Yearly Plan",
  lifetime: "Lifetime Plan",
};

function UpgradeSubscription() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedProductId = productId || searchParams.get("productId");
  const product = useMemo(
    () => getProductById(selectedProductId) || PRODUCT_CATALOG[0],
    [selectedProductId]
  );

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <section className="upgrade-subscription">
          <div className="upgrade-hero">
            <Badge label="Subscription Required" variant="warning" size="medium" />
            <h1>Unlock {product.productName}</h1>
            <p>
              This tenant does not have an active subscription for this product.
              Choose a plan or contact the platform owner to assign a license.
            </p>
            <div className="upgrade-actions">
              <Button variant="primary" onClick={() => navigate("/products/catalog")}>
                View Product Catalog
              </Button>
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="upgrade-plan-grid">
            {Object.entries(product.plans).map(([planKey, amount]) => (
              <article key={planKey} className="upgrade-plan-card">
                <span>{PLAN_LABELS[planKey]}</span>
                <strong>{formatPlanPrice(amount)}</strong>
                <p>
                  Independent license for {product.productCode} with tenant-safe
                  access controls.
                </p>
                <Button variant={planKey === "yearly" ? "primary" : "default"} fullWidth>
                  Request {PLAN_LABELS[planKey]}
                </Button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default UpgradeSubscription;
