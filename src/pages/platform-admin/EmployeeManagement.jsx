import { useMemo, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import {
  EMPLOYEE_ACCESS_SEED,
  EMPLOYEE_STATUS_VARIANTS,
  enrichEmployee,
  getVisibleEmployees,
} from "../../config/employeeAccess";
import { CUSTOMER_DATA_SCOPES } from "../../config/customerAccess";
import {
  ORGANIZATION_BRANCHES,
  ORGANIZATION_COMPANIES,
  ORGANIZATION_DEPARTMENTS,
  ORGANIZATION_DESIGNATIONS,
  getVisibleOrganizationRecords,
} from "../../config/organizationAccess";
import { isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./EmployeeManagement.css";
import "./OrganizationManagement.css";

const EMPTY_EMPLOYEE = {
  employeeName: "",
  employeeCode: "",
  companyId: "",
  branchId: "",
  departmentId: "",
  designationId: "",
  mobileNumber: "",
  email: "",
  joiningDate: "",
  status: "active",
};

function toOptions(items, valueKey, labelKey) {
  return items.map((item) => ({
    value: item[valueKey],
    label: item[labelKey],
  }));
}

function EmployeeManagement() {
  const { profile, role, company } = useAuth();
  const canManageEverything = isPlatformOwner(profile, role);
  const [employees, setEmployees] = useState(EMPLOYEE_ACCESS_SEED);
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(EMPTY_EMPLOYEE);

  const visibleEmployees = useMemo(
    () => getVisibleEmployees(employees, profile, role, company, isPlatformOwner),
    [company, employees, profile, role]
  );

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

  const filteredBranches = visibleBranches.filter(
    (branch) => !form.companyId || branch.companyId === form.companyId
  );
  const filteredDepartments = visibleDepartments.filter(
    (department) => !form.branchId || department.branchId === form.branchId
  );
  const filteredDesignations = visibleDesignations.filter(
    (designation) =>
      !form.departmentId || designation.departmentId === form.departmentId
  );

  const summary = useMemo(
    () => ({
      total: visibleEmployees.length,
      active: visibleEmployees.filter((item) => item.status === "active").length,
      demo: visibleEmployees.filter(
        (item) => item.dataScope === CUSTOMER_DATA_SCOPES.DEMO_SANDBOX
      ).length,
      accessMode: canManageEverything ? "Platform Owner" : "Tenant Admin",
    }),
    [canManageEverything, visibleEmployees]
  );

  const updateForm = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "companyId") {
        next.branchId = "";
        next.departmentId = "";
        next.designationId = "";
      }

      if (key === "branchId") {
        next.departmentId = "";
        next.designationId = "";
      }

      if (key === "departmentId") {
        next.designationId = "";
      }

      return next;
    });
  };

  const openAddModal = () => {
    setForm({
      ...EMPTY_EMPLOYEE,
      companyId: visibleCompanies[0]?.id || "",
    });
    setModalMode("add");
  };

  const openEditModal = (employee) => {
    setForm(employee);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setForm(EMPTY_EMPLOYEE);
  };

  const saveEmployee = () => {
    const selectedCompany = ORGANIZATION_COMPANIES.find(
      (item) => item.id === form.companyId
    );
    const normalized = enrichEmployee({
      ...form,
      id: form.id || `emp-${Date.now()}`,
      tenantId: selectedCompany?.tenantId,
      customerType: selectedCompany?.customerType,
      dataScope: selectedCompany?.dataScope,
    });

    setEmployees((currentEmployees) => {
      if (modalMode === "edit") {
        return currentEmployees.map((employee) =>
          employee.id === normalized.id ? normalized : employee
        );
      }

      return [...currentEmployees, normalized];
    });

    closeModal();
  };

  const columns = [
    { key: "employeeName", label: "Employee Name", width: "170px" },
    { key: "employeeCode", label: "Employee Code", width: "130px" },
    { key: "companyName", label: "Company", width: "180px" },
    { key: "branchName", label: "Branch", width: "170px" },
    { key: "departmentName", label: "Department", width: "150px" },
    { key: "designationName", label: "Designation", width: "150px" },
    { key: "mobileNumber", label: "Mobile Number", width: "140px" },
    { key: "email", label: "Email", width: "190px" },
    { key: "joiningDate", label: "Joining Date", width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "100px",
      render: (value) => (
        <Badge
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          variant={EMPLOYEE_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    {
      icon: "Edit",
      label: "Edit employee",
      onClick: openEditModal,
      variant: "default",
    },
  ];

  return (
    <AdminLayout
      title="Employee Management"
      subtitle="Manage employees using the shared organization structure"
      actions={
        <Button variant="primary" icon="Add" onClick={openAddModal}>
          Add Employee
        </Button>
      }
    >
      <div className="organization-summary-grid">
        <div className="organization-summary-card">
          <span>Total Employees</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Active Employees</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Demo Employees</span>
          <strong>{summary.demo}</strong>
        </div>
        <div className="organization-summary-card">
          <span>Access Mode</span>
          <strong>{summary.accessMode}</strong>
        </div>
      </div>

      <div className="organization-security-note">
        <strong>{canManageEverything ? "Platform-wide view" : "Tenant view"}</strong>
        <span>Demo employees stay separated from real and own-business employees.</span>
      </div>

      <div className="organization-table-shell">
        <Table columns={columns} data={visibleEmployees} actions={actions} />
      </div>

      <Modal
        isOpen={Boolean(modalMode)}
        title={modalMode === "edit" ? "Edit Employee" : "Add Employee"}
        onClose={closeModal}
        size="large"
        footer={
          <div className="employee-modal-actions">
            <Button variant="default" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEmployee}>
              Save Employee
            </Button>
          </div>
        }
      >
        <div className="employee-form-grid">
          <FormField
            label="Employee Name"
            value={form.employeeName}
            onChange={(value) => updateForm("employeeName", value)}
            required
          />
          <FormField
            label="Employee Code"
            value={form.employeeCode}
            onChange={(value) => updateForm("employeeCode", value)}
            required
          />
          <FormField
            label="Company"
            type="select"
            value={form.companyId}
            onChange={(value) => updateForm("companyId", value)}
            options={toOptions(visibleCompanies, "id", "companyName")}
            required
          />
          <FormField
            label="Branch"
            type="select"
            value={form.branchId}
            onChange={(value) => updateForm("branchId", value)}
            options={toOptions(filteredBranches, "id", "branchName")}
            required
          />
          <FormField
            label="Department"
            type="select"
            value={form.departmentId}
            onChange={(value) => updateForm("departmentId", value)}
            options={toOptions(filteredDepartments, "id", "departmentName")}
            required
          />
          <FormField
            label="Designation"
            type="select"
            value={form.designationId}
            onChange={(value) => updateForm("designationId", value)}
            options={toOptions(filteredDesignations, "id", "designationName")}
            required
          />
          <FormField
            label="Mobile Number"
            value={form.mobileNumber}
            onChange={(value) => updateForm("mobileNumber", value)}
          />
          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => updateForm("email", value)}
          />
          <FormField
            label="Joining Date"
            type="date"
            value={form.joiningDate}
            onChange={(value) => updateForm("joiningDate", value)}
          />
          <FormField
            label="Status"
            type="select"
            value={form.status}
            onChange={(value) => updateForm("status", value)}
            options={[
              { value: "active", label: "Active" },
              { value: "setup", label: "Setup" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default EmployeeManagement;
