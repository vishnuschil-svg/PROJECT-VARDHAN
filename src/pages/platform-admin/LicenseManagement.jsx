import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { getLicenseRows } from "../../config/productLicensing";

function LicenseManagement() {
  const licenses = getLicenseRows();

  const columns = [
    { key: "company", label: "Customer", width: "170px" },
    { key: "product", label: "Product", width: "180px" },
    {
      key: "productCode",
      label: "Code",
      width: "100px",
      render: (val) => <Badge label={val} variant="primary" size="small" />,
    },
    { key: "licenseKey", label: "License Key", width: "160px" },
    { key: "plan", label: "Plan", width: "110px" },
    { key: "seats", label: "Seats", width: "80px" },
    { key: "used", label: "Used", width: "80px" },
    { key: "expiry", label: "Expires", width: "120px" },
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
  ];

  const actions = [
    { icon: "Add", label: "Add", onClick: () => {}, variant: "success" },
    { icon: "Renew", label: "Renew", onClick: () => {}, variant: "primary" },
    { icon: "Edit", label: "Edit", onClick: () => {}, variant: "default" },
  ];

  return (
    <AdminLayout
      title="License Management"
      subtitle="View all product licenses across customer tenants"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={licenses} actions={actions} />
      </div>
    </AdminLayout>
  );
}

export default LicenseManagement;
