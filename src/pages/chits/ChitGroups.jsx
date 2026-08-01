import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import FormField from "../../components/common/FormField";
import HelpButton from "../../components/common/HelpButton";
import {
  CHIT_GROUP_STATUS,
  CHIT_STATUS_VARIANTS,
  formatCurrency,
} from "../../config/chitPhaseOneData";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import {
  listTenantGroupsPersistent,
  saveTenantGroupPersistent,
  updateTenantGroupPersistent,
} from "../../services/chitDataService";
import { ActivityRepository } from "../../repositories/ActivityRepository";
import "./ChitGroups.css";

const INSTALLMENT_PATTERNS = [
  { value: "FIXED_MONTHLY", label: "Fixed Monthly" },
  { value: "VARIABLE_MONTHLY", label: "Variable Monthly" },
  { value: "LIFTED_NON_LIFTED", label: "Lifted / Non-Lifted" },
  { value: "CUSTOM_RULE", label: "Custom Rule" },
];

const CHIT_MODES = [
  { value: "auction", label: "Auction" },
  { value: "fixed", label: "Fixed" },
  { value: "lottery", label: "Lottery" },
];

const COLLECTION_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "quarterly", label: "Quarterly" },
];

function buildDefaultSchedule(months) {
  const count = Math.max(Number(months) || 0, 0);
  return Array.from({ length: count }, (_, i) => ({
    month: i + 1,
    non_lifted_payable: 0,
    lifted_payable: 0,
    prize_amount: 0,
    dividend: 0,
    notes: "",
  }));
}

function ChitGroups() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  const [groups, setGroups] = useState([]);
  const [modalMode, setModalMode] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [formData, setFormData] = useState({
    chit_name: "",
    chit_code: "",
    chit_value: "",
    monthly_amount: "",
    total_members: "",
    total_months: "",
    start_date: "",
    end_date: "",
    collection_frequency: "monthly",
    commission: "",
    chit_mode: "auction",
    status: CHIT_GROUP_STATUS.ACTIVE,
    notes: "",
    installment_pattern: "FIXED_MONTHLY",
    fixed_after_lift: "",
    schedule: [],
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const submitRef = useRef(false);

  useEffect(() => {
    let active = true;
    listTenantGroupsPersistent(activeTenantContext)
      .then((records) => { if (active) setGroups(records); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [activeTenantContext]);

  const tenantGroups = useMemo(() => groups, [groups]);

  const openEdit = (row) => {
    setFormData({
      id: row.id,
      chit_name: row.chit_name || "",
      chit_code: row.chit_code || "",
      chit_value: row.chit_value || "",
      monthly_amount: row.monthly_amount || "",
      total_members: row.total_members || "",
      total_months: row.total_months || "",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      collection_frequency: row.collection_frequency || "monthly",
      commission: row.commission || "",
      chit_mode: row.chit_mode || "auction",
      status: row.status || CHIT_GROUP_STATUS.ACTIVE,
      notes: row.notes || "",
      installment_pattern: row.installment_pattern || "FIXED_MONTHLY",
      fixed_after_lift: row.fixed_after_lift || "",
      schedule: row.schedule && row.schedule.length > 0 ? row.schedule : buildDefaultSchedule(row.total_months),
    });
    setError("");
    setModalMode("edit");
  };

  const openCreate = () => {
    setChoiceOpen(true);
  };

  const closeChoice = () => {
    setChoiceOpen(false);
  };

  const startManualCreate = () => {
    setChoiceOpen(false);
    setFormData({
      chit_name: "",
      chit_code: "",
      chit_value: "",
      monthly_amount: "",
      total_members: "",
      total_months: "",
      start_date: "",
      end_date: "",
      collection_frequency: "monthly",
      commission: "",
      chit_mode: "auction",
      status: CHIT_GROUP_STATUS.ACTIVE,
      notes: "",
      installment_pattern: "FIXED_MONTHLY",
      fixed_after_lift: "",
      schedule: [],
    });
    setError("");
    setSubmitting(false);
    setShowPreview(false);
    submitRef.current = false;
    setModalMode("create");
  };

  const closeModal = () => {
    setModalMode(null);
    setShowPreview(false);
    setError("");
    setSubmitting(false);
    submitRef.current = false;
  };

  const handleChange = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "installment_pattern" && value !== current.installment_pattern) {
        // Reset schedule when pattern changes
        next.schedule = [];
        next.monthly_amount = current.monthly_amount;
        next.fixed_after_lift = "";
      }

      // Auto-suggest monthly_amount for fixed pattern or when chit_value/members change
      if ((field === "chit_value" || field === "total_members") && next.installment_pattern === "FIXED_MONTHLY") {
        const chitValue = Number(field === "chit_value" ? value : next.chit_value);
        const members = Number(field === "total_members" ? value : next.total_members);
        if (chitValue > 0 && members > 0) {
          const suggested = Math.round(chitValue / members);
          // Only auto-set if user hasn't manually edited OR if it matches the old suggestion
          if (!next._manualMonthlyAmount) {
            next.monthly_amount = suggested;
            next.total_months = members;
          }
        }
      }

      // Regenerate schedule when months change (only if not user-edited)
      if (field === "total_months" && next.installment_pattern !== "FIXED_MONTHLY") {
        const months = Number(value) || 0;
        if (current.schedule && current.schedule.length > 0 && !current._scheduleEdited) {
          // Only rebuild if schedule hasn't been manually edited
          next.schedule = buildDefaultSchedule(months);
        } else if (!current.schedule || current.schedule.length === 0) {
          next.schedule = buildDefaultSchedule(months);
        }
      }

      return next;
    });
  };

  const handleScheduleCell = (index, field, value) => {
    setFormData((current) => {
      const schedule = [...(current.schedule || [])];
      if (!schedule[index]) {
        schedule[index] = { month: index + 1, non_lifted_payable: 0, lifted_payable: 0, prize_amount: 0, dividend: 0, notes: "" };
      }
      schedule[index] = { ...schedule[index], [field]: value };
      return { ...current, schedule, _scheduleEdited: true };
    });
  };

  const validate = () => {
    if (!formData.chit_name.trim()) return "Chit Name is required.";
    if (!formData.chit_code.trim()) return "Group Code is required.";
    if (Number(formData.chit_value) <= 0) return "Chit Value must be greater than 0.";
    if (Number(formData.total_members) <= 1) return "Member Count must be greater than 1.";
    if (Number(formData.total_months) <= 1) return "Duration/months must be greater than 1.";
    if (!formData.start_date) return "Start Date is required.";
    if (!formData.end_date) return "End Date is required.";
    if (!formData.collection_frequency) return "Collection Frequency is required.";
    if (!formData.chit_mode) return "Chit Mode is required.";

    const pattern = formData.installment_pattern;

    if (pattern === "FIXED_MONTHLY") {
      if (Number(formData.monthly_amount) <= 0) return "Base Installment is required for fixed monthly.";
    }

    if (pattern === "LIFTED_NON_LIFTED" && !formData.fixed_after_lift) {
      return "Fixed Amount After Lift is required for Lifted/Non-Lifted pattern.";
    }

    // Validate schedule for non-fixed patterns
    if (pattern !== "FIXED_MONTHLY") {
      const schedule = formData.schedule || [];
      const months = Number(formData.total_months) || 0;
      if (schedule.length < months) {
        return `All ${months} months must have a schedule entry. ${months - schedule.length} month(s) missing.`;
      }
      for (let i = 0; i < Math.min(schedule.length, months); i++) {
        const row = schedule[i];
        if (!row) return `Month ${i + 1} schedule is empty.`;
        const nl = Number(row.non_lifted_payable);
        const lp = Number(row.lifted_payable);
        if (nl < 0) return `Month ${i + 1}: Non-lifted payable cannot be negative.`;
        if (lp < 0) return `Month ${i + 1}: Lifted payable cannot be negative.`;
        if (pattern === "VARIABLE_MONTHLY" && nl <= 0 && lp <= 0) {
          return `Month ${i + 1}: At least one payable amount is required.`;
        }
        if (pattern === "LIFTED_NON_LIFTED" && nl <= 0) {
          return `Month ${i + 1}: Non-lifted payable is required.`;
        }
      }
    }

    // Duplicate code check on create
    if (modalMode === "create") {
      const code = formData.chit_code.trim().toUpperCase();
      const duplicate = groups.some(
        (g) =>
          g.chit_code.trim().toUpperCase() === code &&
          g.tenant_id === activeTenantContext?.tenant_id &&
          g.data_scope === activeTenantContext?.data_scope
      );
      if (duplicate) return `Group Code "${formData.chit_code}" already exists for this tenant.`;
    }

    return "";
  };

  const saveGroup = async () => {
    if (submitRef.current) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    submitRef.current = true;
    setSubmitting(true);

    const pattern = formData.installment_pattern;
    let schedule = [];
    if (pattern !== "FIXED_MONTHLY") {
      schedule = (formData.schedule || []).slice(0, Number(formData.total_months) || 0);
    }

    const payload = {
      ...formData,
      chit_value: Number(formData.chit_value),
      monthly_amount: pattern === "FIXED_MONTHLY" ? Number(formData.monthly_amount) : 0,
      total_members: Number(formData.total_members),
      total_months: Number(formData.total_months),
      commission: formData.commission ? Number(formData.commission) : 0,
      fixed_after_lift: formData.fixed_after_lift ? Number(formData.fixed_after_lift) : 0,
      schedule,
      today_collections: Number(formData.today_collections || 0),
      pending_collections: Number(formData.pending_collections || 0),
      outstanding_amount: Number(formData.outstanding_amount || formData.chit_value || 0),
      next_auction_date: formData.next_auction_date || formData.start_date,
      tenant_id: activeTenantContext?.tenant_id,
      data_scope: activeTenantContext?.data_scope,
      _manualMonthlyAmount: undefined,
      _scheduleEdited: undefined,
    };

    try {
      const saved = await saveTenantGroupPersistent(
        modalMode === "edit"
          ? payload
          : {
              chit_code: formData.chit_code.trim().toUpperCase(),
              ...payload,
            },
        activeTenantContext
      );

      ActivityRepository.addActivity(
        {
          type: "chit_group",
          action: modalMode === "edit" ? "updated" : "created",
          label: `Chit Group ${modalMode === "edit" ? "updated" : "created"}: ${saved.chit_name}`,
          reference_type: "chit_group",
          reference_id: saved.id,
          metadata: {
            chit_code: saved.chit_code,
            chit_value: saved.chit_value,
            installment_pattern: pattern,
          },
        },
        activeTenantContext
      );

      setGroups(await listTenantGroupsPersistent(activeTenantContext));
      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Chit group save failed.");
      setSubmitting(false);
      submitRef.current = false;
    }
  };

  const updateStatus = async (row, status) => {
    try {
      await updateTenantGroupPersistent(row.id, { status }, activeTenantContext);
      setGroups(await listTenantGroupsPersistent(activeTenantContext));
    } catch (updateError) {
      setError(updateError.message || "Chit status update failed.");
      return;
    }
    ActivityRepository.addActivity(
      {
        type: "chit_group",
        action: "status_changed",
        label: `Chit Group "${row.chit_name}" status changed to ${status}`,
        reference_type: "chit_group",
        reference_id: row.id,
        metadata: { from: row.status, to: status },
      },
      activeTenantContext
    );
  };

  const missingMonths = (() => {
    const pattern = formData.installment_pattern;
    if (pattern === "FIXED_MONTHLY") return 0;
    const months = Number(formData.total_months) || 0;
    const schedule = formData.schedule || [];
    return Math.max(0, months - schedule.length);
  })();

  // Build preview rows
  const previewRows = useMemo(() => {
    const pattern = formData.installment_pattern;
    if (pattern === "FIXED_MONTHLY") {
      const amt = Number(formData.monthly_amount) || 0;
      const months = Number(formData.total_months) || 0;
      return Array.from({ length: months }, (_, i) => ({
        month: i + 1,
        non_lifted: amt,
        lifted: amt,
        prize: 0,
        dividend: 0,
      }));
    }
    return (formData.schedule || []).slice(0, Number(formData.total_months) || 0).map((r) => ({
      month: r.month || (formData.schedule.indexOf(r) + 1),
      non_lifted: Number(r.non_lifted_payable) || 0,
      lifted: Number(r.lifted_payable) || 0,
      prize: Number(r.prize_amount) || 0,
      dividend: Number(r.dividend) || 0,
    }));
  }, [formData.installment_pattern, formData.monthly_amount, formData.total_months, formData.schedule]);

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
    {
      icon: "Edit",
      label: "Edit Group",
      onClick: openEdit,
      variant: "default",
    },
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

  const pattern = formData.installment_pattern;
  const showBaseInstallment = pattern === "FIXED_MONTHLY";
  const showSchedule = pattern === "VARIABLE_MONTHLY" || pattern === "LIFTED_NON_LIFTED";
  const showLiftField = pattern === "LIFTED_NON_LIFTED";

  return (
    <ChitLayout
      title="Chit Group Management"
      subtitle={`${CHIT_PRODUCT_NAME} - ${activeTenantContext?.workspace_label || "Tenant"} groups`}
      actions={
        <>
          <Button variant="primary" onClick={openCreate}>Create Chit Group</Button>
          <HelpButton feature="GROUPS" variant="secondary" />
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

      {/* Three-entry-point choice modal */}
      <Modal isOpen={choiceOpen} title="Create Chit Group" size="medium" onClose={closeChoice}>
        <div className="chit-create-choices">
          <button className="chit-create-card" onClick={startManualCreate} type="button">
            <span className="chit-create-icon">+</span>
            <div className="chit-create-card-content">
              <strong>Manual Fresh Chit</strong>
              <small>Enter chit details manually. No document or AI required.</small>
            </div>
            <span className="chit-create-arrow">&rarr;</span>
          </button>
          <button className="chit-create-card" onClick={() => { setChoiceOpen(false); navigate("/chits/ai-chit/upload"); }} type="button">
            <span className="chit-create-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </span>
            <div className="chit-create-card-content">
              <strong>AI / Document Import</strong>
              <small>Upload an image, PDF, Excel, or handwritten document. AI extracts chit details.</small>
            </div>
            <span className="chit-create-arrow">&rarr;</span>
          </button>
          <button className="chit-create-card" onClick={() => { setChoiceOpen(false); navigate("/chits/ai-chit"); }} type="button">
            <span className="chit-create-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
                <line x1="4" y1="4" x2="9" y2="9"/>
              </svg>
            </span>
            <div className="chit-create-card-content">
              <strong>Existing Running Chit</strong>
              <small>Import or migrate an already-running chit from a document or previous system.</small>
            </div>
            <span className="chit-create-arrow">&rarr;</span>
          </button>
        </div>
      </Modal>

      {/* Create / Edit form modal */}
      <Modal
        isOpen={Boolean(modalMode)}
        title={modalMode === "edit" ? "Edit Chit Group" : "Manual Fresh Chit"}
        size="xlarge"
        onClose={closeModal}
        footer={
          <div className="chit-modal-actions">
            {pattern !== "FIXED_MONTHLY" && modalMode === "create" && (
              <Button variant="secondary" onClick={() => setShowPreview(true)} disabled={submitting}>
                Preview Schedule
              </Button>
            )}
            <Button variant="default" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveGroup} disabled={submitting}>
              {submitting ? "Saving..." : "Save Group"}
            </Button>
          </div>
        }
      >
        <div className="chit-group-form">
          {error && <div className="chit-form-error">{error}</div>}

          <FormField label="Chit Name" value={formData.chit_name} onChange={(value) => handleChange("chit_name", value)} required />
          <FormField label="Group Code" value={formData.chit_code} onChange={(value) => handleChange("chit_code", value)} placeholder="e.g. VGC-2026-01" required />
          <FormField label="Chit Value" type="number" value={formData.chit_value} onChange={(value) => handleChange("chit_value", value)} required />
          <FormField label="Member Count" type="number" value={formData.total_members} onChange={(value) => handleChange("total_members", value)} required />
          <FormField label="Duration / Months" type="number" value={formData.total_months} onChange={(value) => handleChange("total_months", value)} required />

          {/* Installment Pattern */}
          <FormField
            label="Installment Pattern"
            type="select"
            value={formData.installment_pattern}
            onChange={(value) => handleChange("installment_pattern", value)}
            options={INSTALLMENT_PATTERNS}
            required
          />

          {showBaseInstallment && (
            <FormField
              label="Base Installment (fixed monthly payable)"
              type="number"
              value={formData.monthly_amount}
              onChange={(value) => {
                handleChange("monthly_amount", value);
                // Mark as manually edited
                setFormData((c) => ({ ...c, _manualMonthlyAmount: true }));
              }}
              required
            />
          )}

          {showLiftField && (
            <FormField
              label="Fixed Amount After Lift"
              type="number"
              value={formData.fixed_after_lift}
              onChange={(value) => handleChange("fixed_after_lift", value)}
              placeholder="Amount payable by lifted members each month"
              required
            />
          )}

          <FormField label="Start Date" type="date" value={formData.start_date} onChange={(value) => handleChange("start_date", value)} required />
          <FormField label="End Date" type="date" value={formData.end_date} onChange={(value) => handleChange("end_date", value)} required />
          <FormField label="Collection Frequency" type="select" value={formData.collection_frequency} onChange={(value) => handleChange("collection_frequency", value)} options={COLLECTION_FREQUENCIES} required />
          <FormField label="Foreman Commission" type="number" value={formData.commission} onChange={(value) => handleChange("commission", value)} placeholder="0" />
          <FormField label="Chit Mode" type="select" value={formData.chit_mode} onChange={(value) => handleChange("chit_mode", value)} options={CHIT_MODES} required />
          <FormField label="Status" type="select" value={formData.status} onChange={(value) => handleChange("status", value)} options={[
            { value: CHIT_GROUP_STATUS.ACTIVE, label: "Active" },
            { value: CHIT_GROUP_STATUS.UPCOMING, label: "Upcoming" },
            { value: CHIT_GROUP_STATUS.CLOSED, label: "Closed" },
            { value: CHIT_GROUP_STATUS.ARCHIVED, label: "Archived" },
          ]} />
          <FormField label="Notes" type="textarea" value={formData.notes} onChange={(value) => handleChange("notes", value)} rows={3} />
        </div>

        {/* Month-wise schedule for variable / lifted patterns */}
        {showSchedule && (
          <div className="chit-schedule-section">
            <h3 className="chit-schedule-title">
              Month-wise Schedule
              {missingMonths > 0 && <span className="chit-schedule-warn">{missingMonths} month(s) missing</span>}
            </h3>
            {pattern === "LIFTED_NON_LIFTED" && (
              <p className="chit-schedule-desc">Define the non-lifted payable per month. Lifted members pay the fixed amount shown above.</p>
            )}
            {pattern === "VARIABLE_MONTHLY" && (
              <p className="chit-schedule-desc">Define the non-lifted and lifted payable amounts per month. Values can differ each month.</p>
            )}
            <div className="chit-schedule-table-wrap">
              <table className="chit-schedule-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Non-lifted Payable</th>
                    {pattern === "VARIABLE_MONTHLY" && <th>Lifted Payable</th>}
                    <th>Prize Amount</th>
                    <th>Dividend</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Number(formData.total_months) || 0 }, (_, i) => {
                    const row = (formData.schedule || [])[i] || {};
                    return (
                      <tr key={i}>
                        <td className="chit-schedule-month">{i + 1}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={row.non_lifted_payable ?? ""}
                            onChange={(e) => handleScheduleCell(i, "non_lifted_payable", e.target.value)}
                            placeholder="Amount"
                          />
                        </td>
                        {pattern === "VARIABLE_MONTHLY" && (
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={row.lifted_payable ?? ""}
                              onChange={(e) => handleScheduleCell(i, "lifted_payable", e.target.value)}
                              placeholder="Amount"
                            />
                          </td>
                        )}
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={row.prize_amount ?? ""}
                            onChange={(e) => handleScheduleCell(i, "prize_amount", e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={row.dividend ?? ""}
                            onChange={(e) => handleScheduleCell(i, "dividend", e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            value={row.notes ?? ""}
                            onChange={(e) => handleScheduleCell(i, "notes", e.target.value)}
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pattern === "CUSTOM_RULE" && (
          <div className="chit-custom-rule-notice">
            <p>Custom rule scheduling routes to the advanced rule designer.</p>
            <Button variant="secondary" onClick={() => window.open("/chits/ai-chit/rules", "_blank")}>
              Open Rule Designer
            </Button>
          </div>
        )}

        {/* Preview modal */}
        <Modal isOpen={showPreview} title="Schedule Preview" size="large" onClose={() => setShowPreview(false)}>
          <div className="chit-preview-table-wrap">
            <table className="chit-schedule-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Non-lifted Payable</th>
                  <th>Lifted Payable</th>
                  <th>Prize Amount</th>
                  <th>Dividend</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 && (
                  <tr><td colSpan={5} className="chit-preview-empty">No schedule data to preview.</td></tr>
                )}
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.month}</td>
                    <td>{formatCurrency(row.non_lifted)}</td>
                    <td>{formatCurrency(row.lifted)}</td>
                    <td>{formatCurrency(row.prize)}</td>
                    <td>{formatCurrency(row.dividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="chit-modal-actions" style={{ marginTop: 16 }}>
            <Button variant="default" onClick={() => setShowPreview(false)}>Close Preview</Button>
          </div>
        </Modal>
      </Modal>
    </ChitLayout>
  );
}

export default ChitGroups;
