import { useMemo } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import {
  ORGANIZATION_DEPARTMENTS,
  ORGANIZATION_STATUS_VARIANTS,
  getVisibleOrganizationRecords,
} from "../../config/organizationAccess";
import { CUSTOMER_DATA_SCOPES } from "../../config/customerAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./OrganizationManagement.css";

function DepartmentManagement() {
  const { profile, role, company } = useAuth();
  const canManageEverything = isPlatformOwner(profile, role);

  const visibleDepartments = useMemo(
    () =>
      getVisibleOrganizationRecords(
        ORGANIZATION_DEPARTMENTS,
        profile,
        role,
        company,
        isPlatformOwner
      ),
    [company, profile, role]
  );

  const summary = useMemo(
    () => ({
      total: visibleDepartments.length,
      active: visibleDepartments.filter((item) => item.status === "active").length,
      demo: visibleDepartments.filter(
        (item) => item.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
      accessMode: canManageEverything ? "Platform Owner" : "Tenant Admin",
    }),
    [canManageEverything, visibleDepartments]
  );

  const columns = [
    { key: "departmentName", label: "Department Name", width: "190px" },
    { key: "departmentCode", label: "Department Code", width: "130px" },
    { key: "branchName", label: "Branch", width: "190px" },
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

  return (
    <AdminLayout
      title="Department Management"
      subtitle="Manage organization departments inside tenant-isolated branches"
    >
      <div className="organization-summary-grid">
        <div className="organization-summary-card">
          <span>Total Departments</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Active Departments</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Demo Departments</span>
          <strong>{summary.demo}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Access Mode</span>
          <strong>{summary.accessMode}</strong>
        </div>
      </div>

      <div className="organization-security-note">
        <strong>{canManageEverything ? "Platform-wide view" : "Tenant view"}</strong>
        <span>Departments inherit tenant isolation from their branch.</span>
      </div>

      <div className="organization-table-shell">
        <Table columns={columns} data={visibleDepartments} />
      </div>
    </AdminLayout>
  );
}

export default DepartmentManagement;
