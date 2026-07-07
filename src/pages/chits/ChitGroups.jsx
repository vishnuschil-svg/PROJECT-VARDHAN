import { useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockChitGroups } from "../../config/chitMockData";
import "./ChitGroups.css";

const emptyForm = {
  group_name: "",
  batch_number: "",
  description: "",
  chit_value: "",
  member_count: "",
  monthly_installment: "",
  duration_months: "",
  start_date: "",
  auction_date: "",
  status: "active",
};

function ChitGroups() {
  const [groups, setGroups] = useState(mockChitGroups);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingGroup(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (row) => {
    setEditingGroup(row);
    setFormData({
      group_name: row.group_name || "",
      batch_number: row.batch_number || "",
      description: row.description || "",
      chit_value: row.chit_value || "",
      member_count: row.member_count || "",
      monthly_installment: row.monthly_installment || "",
      duration_months: row.duration_months || "",
      start_date: row.start_date || "",
      auction_date: row.auction_date || "",
      status: row.status || "active",
    });
    setShowCreateModal(true);
  };

  const handleChange = (field, value) => {
    const next = { ...formData, [field]: value };

    if (field === "chit_value" || field === "member_count") {
      const chitValue = Number(field === "chit_value" ? value : next.chit_value);
      const members = Number(field === "member_count" ? value : next.member_count);
      if (chitValue > 0 && members > 0) {
        next.monthly_installment = Math.round(chitValue / members);
        next.duration_months = members;
      }
    }

    setFormData(next);
  };

  const validate = () => {
    if (!formData.group_name.trim()) return "Batch name is required.";
    if (!formData.batch_number.trim()) return "Batch number is required.";
    if (Number(formData.chit_value) <= 0) return "Chit value must be greater than 0.";
    if (Number(formData.member_count) <= 1) return "Members count must be greater than 1.";
    if (Number(formData.monthly_installment) <= 0) return "Monthly installment is required.";
    if (!formData.start_date) return "Start date is required.";
    return "";
  };

  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      chit_value: Number(formData.chit_value),
      member_count: Number(formData.member_count),
      monthly_installment: Number(formData.monthly_installment),
      duration_months: Number(formData.duration_months),
      company_id: "demo-company",
      updated_at: new Date().toISOString(),
    };

    if (editingGroup) {
      setGroups((prev) =>
        prev.map((g) => (g.id === editingGroup.id ? { ...g, ...payload } : g))
      );
    } else {
      setGroups((prev) => [
        {
          id: Date.now(),
          ...payload,
          created_by: "demo-user",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setShowCreateModal(false);
    resetForm();
  };

  const handleDelete = (row) => {
    const ok = window.confirm(`Delete batch "${row.group_name}"?`);
    if (!ok) return;
    setGroups((prev) => prev.filter((g) => g.id !== row.id));
  };

  const columns = [
    { key: "group_name", label: "Batch Name", width: "180px" },
    {
      key: "chit_value",
      label: "Chit Value",
      width: "120px",
      render: (val) => `₹${Number(val || 0).toLocaleString()}`,
    },
    { key: "member_count", label: "Members", width: "100px" },
    {
      key: "monthly_installment",
      label: "Monthly",
      width: "120px",
      render: (val) => `₹${Number(val || 0).toLocaleString()}`,
    },
    {
      key: "duration_months",
      label: "Duration",
      width: "100px",
      render: (val) => `${val || 0} months`,
    },
    {
      key: "status",
      label: "Status",
      width: "100px",
      render: (val) => (
        <Badge
          label={val}
          variant={val === "active" ? "success" : val === "closed" ? "error" : "warning"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    {
      icon: "👁️",
      label: "View",
      onClick: (row) => {
        setSelectedGroup(row);
        setShowDetailsModal(true);
      },
      variant: "default",
    },
    { icon: "✏️", label: "Edit", onClick: openEdit, variant: "default" },
    { icon: "🗑️", label: "Delete", onClick: handleDelete, variant: "error" },
  ];

  return (
    <ChitLayout
      title="Chit Batches"
      subtitle="Create and manage chit batches"
      actions={
        <Button variant="primary" icon="➕" onClick={openCreate}>
          Create New Batch
        </Button>
      }
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={groups} actions={actions} />
      </div>

      <Modal
        isOpen={showCreateModal}
        title={editingGroup ? "Edit Chit Batch" : "Create New Chit Batch"}
        size="large"
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingGroup ? "Update Batch" : "Save Batch"}
            </Button>
          </>
        }
      >
        <div className="group-details-modal">
          {error && (
            <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div className="detail-row">
            <label>Batch Name *</label>
            <input
              value={formData.group_name}
              onChange={(e) => handleChange("group_name", e.target.value)}
              placeholder="Example: Srinidhi 20K (01)"
            />
          </div>

          <div className="detail-row">
            <label>Batch Number *</label>
            <input
              value={formData.batch_number}
              onChange={(e) => handleChange("batch_number", e.target.value)}
              placeholder="Example: CHIT-001"
            />
          </div>

          <div className="detail-row">
            <label>Description</label>
            <input
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Short notes"
            />
          </div>

          <div className="detail-row">
            <label>Chit Value *</label>
            <input
              type="number"
              value={formData.chit_value}
              onChange={(e) => handleChange("chit_value", e.target.value)}
              placeholder="20000"
            />
          </div>

          <div className="detail-row">
            <label>Members Count *</label>
            <input
              type="number"
              value={formData.member_count}
              onChange={(e) => handleChange("member_count", e.target.value)}
              placeholder="20"
            />
          </div>

          <div className="detail-row">
            <label>Monthly Installment *</label>
            <input
              type="number"
              value={formData.monthly_installment}
              onChange={(e) => handleChange("monthly_installment", e.target.value)}
              placeholder="1000"
            />
          </div>

          <div className="detail-row">
            <label>Duration Months</label>
            <input
              type="number"
              value={formData.duration_months}
              onChange={(e) => handleChange("duration_months", e.target.value)}
              placeholder="20"
            />
          </div>

          <div className="detail-row">
            <label>Start Date *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
            />
          </div>

          <div className="detail-row">
            <label>Auction Date</label>
            <input
              type="date"
              value={formData.auction_date}
              onChange={(e) => handleChange("auction_date", e.target.value)}
            />
          </div>

          <div className="detail-row">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailsModal}
        title="Chit Batch Details"
        size="large"
        onClose={() => setShowDetailsModal(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowDetailsModal(false);
                openEdit(selectedGroup);
              }}
            >
              Edit
            </Button>
          </>
        }
      >
        {selectedGroup && (
          <div className="group-details-modal">
            <div className="detail-row">
              <label>Batch Name:</label>
              <span>{selectedGroup.group_name}</span>
            </div>
            <div className="detail-row">
              <label>Batch Number:</label>
              <span>{selectedGroup.batch_number || "-"}</span>
            </div>
            <div className="detail-row">
              <label>Description:</label>
              <span>{selectedGroup.description || "-"}</span>
            </div>
            <div className="detail-row">
              <label>Chit Value:</label>
              <span>₹{Number(selectedGroup.chit_value || 0).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <label>Members:</label>
              <span>{selectedGroup.member_count}</span>
            </div>
            <div className="detail-row">
              <label>Monthly Installment:</label>
              <span>₹{Number(selectedGroup.monthly_installment || 0).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <label>Duration:</label>
              <span>{selectedGroup.duration_months} months</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span>
                <Badge
                  label={selectedGroup.status}
                  variant={selectedGroup.status === "active" ? "success" : "warning"}
                />
              </span>
            </div>
            <div className="detail-row">
              <label>Start Date:</label>
              <span>
                {selectedGroup.start_date
                  ? new Date(selectedGroup.start_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </ChitLayout>
  );
}

export default ChitGroups;
