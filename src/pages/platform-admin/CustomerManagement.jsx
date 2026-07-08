import { useMemo, useState } from "react";
import AdminLayout from "../../components/platform-admin/AdminLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import {
  CUSTOMER_ACCESS_SEED,
  CUSTOMER_STATUS_VARIANTS,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_VARIANTS,
  canViewCustomerData,
  countAssignedModules,
} from "../../config/customerAccess";
import { ERP_MODULES, isPlatformOwner } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import "./CustomerManagement.css";

function CustomerManagement() {
  const { profile, role, company } = useAuth();
  const [customers, setCustomers] = useState(CUSTOMER_ACCESS_SEED);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const canViewAllCustomers = isPlatformOwner(profile, role);
  const currentTenantId =
    company?.tenant_id || company?.id || profile?.tenant_id || profile?.company_id;

  const viewerCustomer = useMemo(
    () =>
      customers.find(
        (customer) =>
          customer.tenantId === currentTenantId || customer.id === currentTenantId
      ),
    [customers, currentTenantId]
  );

  const visibleCustomers = useMemo(() => {
    if (canViewAllCustomers) {
      return customers;
    }

    return customers.filter((customer) =>
      canViewCustomerData(viewerCustomer, customer)
    );
  }, [canViewAllCustomers, customers, viewerCustomer]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedCustomerId
  );

  const toggleCustomerModule = (customerId, moduleId) => {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (customer.id !== customerId) {
          return customer;
        }

        return {
          ...customer,
          assignedModules: {
            ...customer.assignedModules,
            [moduleId]: !customer.assignedModules?.[moduleId],
          },
        };
      })
    );
  };

  const columns = [
    { key: "name", label: "Customer", width: "180px" },
    {
      key: "customerType",
      label: "Type",
      width: "150px",
      render: (value) => (
        <Badge
          label={CUSTOMER_TYPE_LABELS[value]}
          variant={CUSTOMER_TYPE_VARIANTS[value]}
          size="small"
        />
      ),
    },
    { key: "tenantId", label: "Tenant", width: "160px" },
    {
      key: "dataScope",
      label: "Data Scope",
      width: "120px",
      render: (value) => <Badge label={value} variant="default" size="small" />,
    },
    {
      key: "assignedModules",
      label: "Modules",
      width: "100px",
      render: (value) => (
        <Badge
          label={`${countAssignedModules(value)} Assigned`}
          variant="primary"
          size="small"
        />
      ),
    },
    { key: "subscription", label: "Plan", width: "110px" },
    {
      key: "status",
      label: "Status",
      width: "90px",
      render: (value) => (
        <Badge
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          variant={CUSTOMER_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    {
      icon: "View",
      label: "View customer",
      onClick: (row) => setSelectedCustomerId(row.id),
      variant: "default",
    },
  ];

  return (
    <AdminLayout
      title="Customer Management"
      subtitle="Manage tenants, customer types and ERP module access"
    >
      <div className="customer-access-summary">
        <div>
          <span className="summary-label">Visible Customers</span>
          <strong>{visibleCustomers.length}</strong>
        </div>
        <div>
          <span className="summary-label">Tenant Isolation</span>
          <strong>{canViewAllCustomers ? "Owner View" : "Tenant View"}</strong>
        </div>
        <div>
          <span className="summary-label">Demo Data Rule</span>
          <strong>Sandbox Only</strong>
        </div>
      </div>

      <div className="customer-table-shell">
        <Table columns={columns} data={visibleCustomers} actions={actions} />
      </div>

      <Modal
        isOpen={Boolean(selectedCustomer)}
        title="Customer Access"
        onClose={() => setSelectedCustomerId(null)}
        size="large"
      >
        {selectedCustomer && (
          <div className="customer-access-modal">
            <div className="customer-detail-grid">
              <FormField label="Customer Name" value={selectedCustomer.name} disabled />
              <FormField label="Owner" value={selectedCustomer.owner} disabled />
              <FormField label="Email" value={selectedCustomer.email} disabled />
              <FormField label="Phone" value={selectedCustomer.phone} disabled />
              <FormField
                label="Customer Type"
                value={CUSTOMER_TYPE_LABELS[selectedCustomer.customerType]}
                disabled
              />
              <FormField label="Tenant ID" value={selectedCustomer.tenantId} disabled />
              <FormField
                label="Data Scope"
                value={selectedCustomer.dataScope}
                disabled
              />
              <FormField
                label="Assigned Modules"
                value={`${countAssignedModules(
                  selectedCustomer.assignedModules
                )}`}
                disabled
              />
            </div>

            <div className="module-assignment-panel">
              <div>
                <h3>Module Access Assignment</h3>
                <p>
                  Module access is assigned per tenant. Demo customers stay in
                  demo sandbox data and cannot access real business tenants.
                </p>
              </div>

              <div className="module-assignment-list">
                {ERP_MODULES.map((module) => (
                  <label key={module.id} className="module-assignment-item">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedCustomer.assignedModules?.[module.id])}
                      onChange={() =>
                        toggleCustomerModule(selectedCustomer.id, module.id)
                      }
                      disabled={!canViewAllCustomers}
                    />
                    <span>
                      <strong>{module.name}</strong>
                      {module.productName && <small>{module.productName}</small>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

export default CustomerManagement;
