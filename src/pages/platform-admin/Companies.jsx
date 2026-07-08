import { useMemo, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import {
  ORGANIZATION_COMPANIES,
  ORGANIZATION_STATUS_VARIANTS,
  getVisibleOrganizationRecords,
} from "../../config/organizationAccess";
import { CUSTOMER_DATA_SCOPES } from "../../config/customerAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./OrganizationManagement.css";

function Companies() {
  const { profile, role, company } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const visibleCompanies = useMemo(
    () =>
      getVisibleOrganizationRecords(
        ORGANIZATION_COMPANIES,
        profile,
        role,
        company,
        isPlatformOwner
      ),
    [company, profile, role]
  );

  const selectedCompany = ORGANIZATION_COMPANIES.find(
    (record) => record.id === selectedCompanyId
  );

  const summary = useMemo(
    () => ({
      total: visibleCompanies.length,
      active: visibleCompanies.filter((record) => record.status === "active").length,
      demo: visibleCompanies.filter(
        (record) => record.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
      tenantMode: isPlatformOwner(profile, role) ? "Platform Owner" : "Tenant Admin",
    }),
    [profile, role, visibleCompanies]
  );

  const columns = [
    { key: "companyName", label: "Company Name", width: "190px" },
    { key: "companyCode", label: "Code", width: "90px" },
    { key: "gstNumber", label: "GST Number", width: "150px" },
    { key: "pan", label: "PAN", width: "120px" },
    { key: "address", label: "Address", width: "180px" },
    { key: "contact", label: "Contact Number", width: "140px" },
    { key: "email", label: "Email", width: "180px" },
    {
      key: "logo",
      label: "Logo",
      width: "80px",
      render: (value) => <span className="organization-logo">{value}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "100px",
      render: (value) => (
        <Badge
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          variant={ORGANIZATION_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    {
      icon: "View",
      label: "View company",
      onClick: (row) => setSelectedCompanyId(row.id),
      variant: "default",
    },
  ];

  return (
    <AdminLayout
      title="Company Management"
      subtitle="Manage organization companies with reusable tenant isolation"
    >
      <div className="organization-summary-grid">
        <div className="organization-summary-card">
          <span>Total Companies</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Active Companies</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Demo Companies</span>
          <strong>{summary.demo}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Access Mode</span>
          <strong>{summary.tenantMode}</strong>
        </div>
      </div>

      <div className="organization-table-shell">
        <Table columns={columns} data={visibleCompanies} actions={actions} />
      </div>

      <Modal
        isOpen={Boolean(selectedCompany)}
        title="Company Details"
        onClose={() => setSelectedCompanyId(null)}
        size="large"
      >
        {selectedCompany && (
          <div className="organization-detail-grid">
            <FormField label="Company Name" value={selectedCompany.companyName} disabled />
            <FormField label="Company Code" value={selectedCompany.companyCode} disabled />
            <FormField label="GST Number" value={selectedCompany.gstNumber || "Not provided"} disabled />
            <FormField label="PAN" value={selectedCompany.pan || "Not provided"} disabled />
            <FormField label="Address" value={selectedCompany.address} disabled />
            <FormField label="Contact Number" value={selectedCompany.contact} disabled />
            <FormField label="Email" value={selectedCompany.email} disabled />
            <FormField label="Logo" value={selectedCompany.logo} disabled />
            <FormField label="Status" value={selectedCompany.status} disabled />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

export default Companies;
