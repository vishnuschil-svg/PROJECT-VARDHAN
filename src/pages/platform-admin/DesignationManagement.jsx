import { useMemo } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import {
  ORGANIZATION_DESIGNATIONS,
  ORGANIZATION_STATUS_VARIANTS,
  getVisibleOrganizationRecords,
} from "../../config/organizationAccess";
import { CUSTOMER_DATA_SCOPES } from "../../config/customerAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./OrganizationManagement.css";

function DesignationManagement() {
  const { profile, role, company } = useAuth();
  const canManageEverything = isPlatformOwner(profile, role);

  const visibleDesignations = useMemo(
    () =>
      getVisibleOrganizationRecords(
        ORGANIZATION_DESIGNATIONS,
        profile,
        role,
        company,
        isPlatformOwner
      ),
    [company, profile, role]
  );

  const summary = useMemo(
    () => ({
      total: visibleDesignations.length,
      senior: visibleDesignations.filter((item) => item.reportingLevel <= 2).length,
      active: visibleDesignations.filter((item) => item.status === "active").length,
      demo: visibleDesignations.filter(
        (item) => item.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
      accessMode: canManageEverything ? "Platform Owner" : "Tenant Admin",
    }),
    [canManageEverything, visibleDesignations]
  );

  const columns = [
    { key: "designationName", label: "Designation Name", width: "200px" },
    { key: "departmentName", label: "Department", width: "190px" },
    {
      key: "reportingLevel",
      label: "Reporting Level",
      width: "130px",
      render: (value) => (
        <Badge label={`Level ${value}`} variant="info" size="small" />
      ),
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

  return (
    <AdminLayout
      title="Designation Management"
      subtitle="Manage reusable designations and reporting levels"
    >
      <div className="organization-summary-grid">
        <div className="organization-summary-card">
          <span>Total Designations</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Senior Levels</span>
          <strong>{summary.senior}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Active Designations</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Demo Designations</span>
          <strong>{summary.demo}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Access Mode</span>
          <strong>{summary.accessMode}</strong>
        </div>
      </div>

      <div className="organization-security-note">
        <strong>{canManageEverything ? "Platform-wide view" : "Tenant view"}</strong>
        <span>Designations inherit tenant isolation from their department.</span>
      </div>

      <div className="organization-table-shell">
        <Table columns={columns} data={visibleDesignations} />
      </div>
    </AdminLayout>
  );
}

export default DesignationManagement;
