import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import FormField from "../../components/common/FormField";
import ChitStudioLauncher from "../../components/chitStudio/ChitStudioLauncher";
import {
  CHIT_GROUP_STATUS,
  CHIT_STATUS_VARIANTS,
  formatCurrency,
  getNextGroupCode,
} from "../../config/chitPhaseOneData";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, saveTenantGroup, updateTenantGroup } from "../../services/chitDataService";
import "./ChitGroups.css";

const EMPTY_GROUP = {
  chit_name: "",
  chit_code: "",
  chit_value: "",
  monthly_amount: "",
  total_members: "",
  total_months: "",
  start_date: "",
  end_date: "",
  status: CHIT_GROUP_STATUS.ACTIVE,
};

function ChitGroups() {
  const [searchParams] = useSearchParams();
  const { activeTenantContext } = useAuth();
  const [groups, setGroups] = useState([]);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY_GROUP);
  const [error, setError] = useState("");

  useEffect(() => {
    setGroups(listTenantGroups(activeTenantContext));
  }, [activeTenantContext]);

  const tenantGroups = useMemo(() => groups, [groups]);

  const openCreate = () => {
    setFormData({
      ...EMPTY_GROUP,
      chit_code: getNextGroupCode(tenantGroups),
    });
    setError("");
    setModalMode("create");
  };

  const openEdit = (row) => {
    setFormData(row);
    setError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_GROUP);
    setError("");
  };

  const handleChange = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "chit_value" || field === "total_members") {
        const chitValue = Number(field === "chit_value" ? value : next.chit_value);
        const members = Number(field === "total_members" ? value : next.total_members);

        if (chitValue > 0 && members > 0) {
          next.monthly_amount = Math.round(chitValue / members);
          next.total_months = members;
        }
      }

      return next;
    });
  };

  const validate = () => {
    if (!formData.chit_name.trim()) return "Chit Name is required.";
    if (!formData.chit_code.trim()) return "Chit Code is required.";
    if (Number(formData.chit_value) <= 0) return "Chit Value must be greater than 0.";
    if (Number(formData.monthly_amount) <= 0) return "Monthly Amount is required.";
    if (Number(formData.total_members) <= 1) return "Total Members must be greater than 1.";
    if (Number(formData.total_months) <= 1) return "Total Months must be greater than 1.";
    if (!formData.start_date) return "Start Date is required.";
    if (!formData.end_date) return "End Date is required.";
    return "";
  };

  const saveGroup = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      chit_value: Number(formData.chit_value),
      monthly_amount: Number(formData.monthly_amount),
      total_members: Number(formData.total_members),
      total_months: Number(formData.total_months),
      today_collections: Number(formData.today_collections || 0),
      pending_collections: Number(formData.pending_collections || 0),
      outstanding_amount: Number(formData.outstanding_amount || formData.chit_value || 0),
      next_auction_date: formData.next_auction_date || formData.start_date,
      tenant_id: activeTenantContext?.tenant_id,
      data_scope: activeTenantContext?.data_scope,
    };

    saveTenantGroup(
      modalMode === "edit"
        ? payload
        : {
            id: `chit-${Date.now()}`,
            ...payload,
          },
      activeTenantContext
    );
    setGroups(listTenantGroups(activeTenantContext));

    closeModal();
  };

  const updateStatus = (row, status) => {
    updateTenantGroup(row.id, { status }, activeTenantContext);
    setGroups(listTenantGroups(activeTenantContext));
  };

  const columns = [
    { key: "chit_name", label: "Chit Name", width: "180px" },
    { key: "chit_code", label: "Chit Code", width: "120px" },
    {
      key: "chit_value",
      label: "Chit Value",
      width: "120px",
      render: (value) => formatCurrency(value),
    },
    {
      key: "monthly_amount",
      label: "Monthly Amount",
      width: "140px",
      render: (value) => formatCurrency(value),
    },
    { key: "total_members", label: "Total Members", width: "120px" },
    { key: "total_months", label: "Total Months", width: "120px" },
    { key: "start_date", label: "Start Date", width: "120px" },
    { key: "end_date", label: "End Date", width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "100px",
      render: (value) => (
        <Badge
          label={value}
          variant={CHIT_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    { icon: "Edit", label: "Edit Group", onClick: openEdit, variant: "default" },
    {
      icon: "Close",
      label: "Close Group",
      onClick: (row) => updateStatus(row, CHIT_GROUP_STATUS.CLOSED),
      variant: "warning",
    },
    {
      icon: "Archive",
      label: "Archive Group",
      onClick: (row) => updateStatus(row, CHIT_GROUP_STATUS.ARCHIVED),
      variant: "danger",
    },
  ];

  return (
    <ChitLayout
      title="Chit Group Management"
      subtitle={`${CHIT_PRODUCT_NAME} - ${activeTenantContext?.workspace_label || "Tenant"} groups`}
      actions={
        <>
          <ChitStudioLauncher
            activeTenantContext={activeTenantContext}
            onCreated={() => setGroups(listTenantGroups(activeTenantContext))}
            showCreateGroupButton
            defaultOpen={searchParams.get("create") === "1"}
          />
        </>
      }
    >
      <div className="chit-group-page">
        <div className="chit-tenant-banner">
          <div>
            <span>Active tenant</span>
            <strong>{activeTenantContext?.tenant_id || "No tenant selected"}</strong>
          </div>
          <Badge
            label={activeTenantContext?.data_scope || "no_scope"}
            variant={activeTenantContext?.data_scope === "demo_sandbox" ? "warning" : "success"}
            size="small"
          />
        </div>

        <div className="chit-group-table-shell">
          <Table columns={columns} data={tenantGroups} actions={actions} />
        </div>
      </div>

      <Modal
        isOpen={Boolean(modalMode)}
        title={modalMode === "edit" ? "Edit Chit Group" : "Create Chit Group"}
        size="large"
        onClose={closeModal}
        footer={
          <div className="chit-modal-actions">
            <Button variant="default" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveGroup}>
              Save Group
            </Button>
          </div>
        }
      >
        <div className="chit-group-form">
          {error && <div className="chit-form-error">{error}</div>}
          <FormField
            label="Chit Name"
            value={formData.chit_name}
            onChange={(value) => handleChange("chit_name", value)}
            required
          />
          <FormField
            label="Chit Code"
            value={formData.chit_code}
            onChange={(value) => handleChange("chit_code", value)}
            required
          />
          <FormField
            label="Chit Value"
            type="number"
            value={formData.chit_value}
            onChange={(value) => handleChange("chit_value", value)}
            required
          />
          <FormField
            label="Monthly Amount"
            type="number"
            value={formData.monthly_amount}
            onChange={(value) => handleChange("monthly_amount", value)}
            required
          />
          <FormField
            label="Total Members"
            type="number"
            value={formData.total_members}
            onChange={(value) => handleChange("total_members", value)}
            required
          />
          <FormField
            label="Total Months"
            type="number"
            value={formData.total_months}
            onChange={(value) => handleChange("total_months", value)}
            required
          />
          <FormField
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(value) => handleChange("start_date", value)}
            required
          />
          <FormField
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(value) => handleChange("end_date", value)}
            required
          />
          <FormField
            label="Status"
            type="select"
            value={formData.status}
            onChange={(value) => handleChange("status", value)}
            options={[
              { value: CHIT_GROUP_STATUS.ACTIVE, label: "Active" },
              { value: CHIT_GROUP_STATUS.UPCOMING, label: "Upcoming" },
              { value: CHIT_GROUP_STATUS.CLOSED, label: "Closed" },
              { value: CHIT_GROUP_STATUS.ARCHIVED, label: "Archived" },
            ]}
          />
        </div>
      </Modal>
    </ChitLayout>
  );
}

export default ChitGroups;
