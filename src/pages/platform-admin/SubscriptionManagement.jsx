import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { getSubscriptionRows } from "../../config/productLicensing";

function SubscriptionManagement() {
  const subscriptions = getSubscriptionRows();

  const columns = [
    { key: "customerName", label: "Customer", width: "170px" },
    { key: "productName", label: "Product", width: "190px" },
    {
      key: "productCode",
      label: "Code",
      width: "100px",
      render: (val) => <Badge label={val} variant="primary" size="small" />,
    },
    { key: "planType", label: "Plan", width: "120px" },
    { key: "billingCycle", label: "Billing", width: "110px" },
    { key: "seatsUsage", label: "Seats", width: "90px" },
    {
      key: "status",
      label: "Status",
      width: "100px",
      render: (val) => (
        <Badge
          label={val}
          variant={val === "active" ? "success" : val === "trial" ? "warning" : "error"}
          size="small"
        />
      ),
    },
    { key: "expiresOn", label: "Expires", width: "120px" },
  ];

  const actions = [
    { icon: "Edit", label: "Edit", onClick: () => {}, variant: "default" },
    { icon: "Assign", label: "Assign", onClick: () => {}, variant: "success" },
    { icon: "Pause", label: "Pause", onClick: () => {}, variant: "warning" },
  ];

  return (
    <AdminLayout
      title="Subscription Management"
      subtitle="Assign independent product subscriptions to customers"
      actions={<Button variant="primary">Assign Subscription</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={subscriptions} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default SubscriptionManagement;
