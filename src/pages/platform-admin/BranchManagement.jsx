import { useMemo } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import {
  ORGANIZATION_BRANCHES,
  ORGANIZATION_STATUS_VARIANTS,
  getVisibleOrganizationRecords,
} from "../../config/organizationAccess";
import { CUSTOMER_DATA_SCOPES } from "../../config/customerAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./OrganizationManagement.css";

function BranchManagement() {
  const { profile, role, company } = useAuth();
  const canViewAllBranches = isPlatformOwner(profile, role);
  const visibleBranches = useMemo(
    () =>
      getVisibleOrganizationRecords(
        ORGANIZATION_BRANCHES,
        profile,
        role,
        company,
        isPlatformOwner
      ),
    [company, profile, role]
  );

  const summary = useMemo(
    () => ({
      total: visibleBranches.length,
      active: visibleBranches.filter((branch) => branch.status === "active").length,
      demo: visibleBranches.filter(
        (branch) => branch.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
      real: visibleBranches.filter(
        (branch) => branch.dataScope !== CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
    }),
    [visibleBranches]
  );

  const columns = [
    { key: "branchName", label: "Branch Name", width: "180px" },
    { key: "branchCode", label: "Branch Code", width: "110px" },
    { key: "companyName", label: "Company", width: "190px" },
    { key: "manager", label: "Branch Manager", width: "150px" },
    { key: "location", label: "Location", width: "120px" },
    { key: "contact", label: "Contact Number", width: "140px" },
    {
      key: "status",
      label: "Status",
      width: "90px",
      render: (value) => (
        <Badge
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          variant={ORGANIZATION_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  return (
    <AdminLayout
      title="Branch Management"
      subtitle="Manage customer branches with tenant-wise data separation"
    >
      <div className="organization-summary-grid">
        <div className="organization-summary-card">
          <span>Total Branches</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Active Branches</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Demo Branches</span>
          <strong>{summary.demo}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Real / Own Branches</span>
          <strong>{summary.real}</strong>
        </div>
      </div>

      <div className="organization-security-note">
        <strong>{canViewAllBranches ? "Platform-wide view" : "Tenant view"}</strong>
        <span>
          Demo branches remain separated from real and own-business branch data.
        </span>
      </div>

      <div className="organization-table-shell">
        <Table columns={columns} data={visibleBranches} />
      </div>
    </AdminLayout>
  );
}

export default BranchManagement;
