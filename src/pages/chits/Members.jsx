import { Eye, Pencil, Search, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import Tabs from "../../components/common/Tabs";
import {
  MEMBER_STATUS,
  MEMBER_STATUS_VARIANTS,
  getMemberGroupName,
  getMemberSummary,
  getNextMemberNumber,
  maskAadhaarNumber,
  maskAccountNumber,
} from "../../config/chitMemberData";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { listTenantGroups, listTenantMembers, saveTenantMember } from "../../services/chitDataService";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { buildMemberLedger } from "../../config/chitMemberLedger";
import "./Members.css";

const EMPTY_MEMBER = {
  member_name: "",
  member_number: "",
  mobile_number: "",
  whatsapp_number: "",
  email: "",
  address: "",
  aadhaar_masked: "",
  pan: "",
  nominee_name: "",
  nominee_mobile: "",
  bank_name: "",
  account_number_masked: "",
  ifsc: "",
  chit_group_id: "",
  join_date: "",
  status: MEMBER_STATUS.ACTIVE,
};

function Members() {
  const { activeTenantContext } = useAuth();
  const collections = useTenantCollections(activeTenantContext);
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [formData, setFormData] = useState(EMPTY_MEMBER);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setGroups(listTenantGroups(activeTenantContext));
    setMembers(listTenantMembers(activeTenantContext));
  }, [activeTenantContext]);

  const tenantGroups = useMemo(() => groups, [groups]);
  const tenantMembers = useMemo(() => members, [members]);

  const summary = useMemo(
    () => getMemberSummary(tenantMembers, tenantGroups),
    [tenantGroups, tenantMembers]
  );

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return tenantMembers.filter((member) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          member.member_name,
          member.member_number,
          member.mobile_number,
          member.whatsapp_number,
          member.email,
          member.nominee_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesGroup = !groupFilter || member.chit_group_id === groupFilter;
      const matchesStatus = !statusFilter || member.status === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [groupFilter, searchTerm, statusFilter, tenantMembers]);

  const groupOptions = tenantGroups.map((group) => ({
    value: group.id,
    label: `${group.chit_name} (${group.chit_code})`,
  }));

  const openCreate = () => {
    setFormData({
      ...EMPTY_MEMBER,
      member_number: getNextMemberNumber(tenantMembers),
      chit_group_id: tenantGroups[0]?.id || "",
      join_date: new Date().toISOString().slice(0, 10),
    });
    setFormError("");
    setModalMode("create");
  };

  const openEdit = (member) => {
    setFormData(member);
    setFormError("");
    setModalMode("edit");
  };

  const closeFormModal = () => {
    setModalMode(null);
    setFormData(EMPTY_MEMBER);
    setFormError("");
  };

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const validateMember = () => {
    if (!formData.member_name.trim()) return "Member Name is required.";
    if (!formData.member_number.trim()) return "Member ID / Member Number is required.";
    if (!formData.mobile_number.trim()) return "Mobile Number is required.";
    if (!formData.whatsapp_number.trim()) return "WhatsApp Number is required.";
    if (!formData.address.trim()) return "Address is required.";
    if (!formData.aadhaar_masked.trim()) return "Aadhaar Number is required.";
    if (!formData.nominee_name.trim()) return "Nominee Name is required.";
    if (!formData.nominee_mobile.trim()) return "Nominee Mobile is required.";
    if (!formData.bank_name.trim()) return "Bank Name is required.";
    if (!formData.account_number_masked.trim()) return "Account Number is required.";
    if (!formData.ifsc.trim()) return "IFSC is required.";
    if (!formData.chit_group_id) return "Assigned Chit Group is required.";
    if (!formData.join_date) return "Join Date is required.";
    return "";
  };

  const saveMember = () => {
    const validationError = validateMember();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      ...formData,
      aadhaar_masked: maskAadhaarNumber(formData.aadhaar_masked),
      account_number_masked: maskAccountNumber(formData.account_number_masked),
      tenant_id: activeTenantContext?.tenant_id,
      data_scope: activeTenantContext?.data_scope,
    };

    saveTenantMember(
      modalMode === "edit"
        ? payload
        : {
            id: `member-${Date.now()}`,
            ...payload,
          },
      activeTenantContext
    );
    setMembers(listTenantMembers(activeTenantContext));

    closeFormModal();
  };

  const columns = [
    { key: "member_name", label: "Member Name", width: "180px" },
    { key: "member_number", label: "Member ID", width: "140px" },
    { key: "mobile_number", label: "Mobile", width: "130px" },
    { key: "whatsapp_number", label: "WhatsApp", width: "130px" },
    {
      key: "chit_group_id",
      label: "Assigned Chit Group",
      width: "210px",
      render: (_, row) => getMemberGroupName(row, tenantGroups),
    },
    { key: "join_date", label: "Join Date", width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "110px",
      render: (value) => (
        <Badge
          label={value}
          variant={MEMBER_STATUS_VARIANTS[value] || "default"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    { icon: <Eye size={16} />, label: "View Profile", onClick: setProfileMember, variant: "default" },
    { icon: <Pencil size={16} />, label: "Edit Member", onClick: openEdit, variant: "primary" },
  ];

  const profileTabs = profileMember
    ? getMemberProfileTabs(profileMember, tenantGroups, collections, activeTenantContext)
    : [];

  return (
    <ChitLayout
      title="Member Management"
      subtitle={`${CHIT_PRODUCT_NAME} - ${activeTenantContext?.workspace_label || "Tenant"} members`}
      actions={
        <Button variant="primary" icon={<UserPlus size={16} />} onClick={openCreate}>
          Add Member
        </Button>
      }
    >
      <div className="members-page">
        <div className="members-tenant-banner">
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

        <div className="members-summary-grid">
          <div className="member-summary-card">
            <span>Total Members</span>
            <strong>{summary.total_members}</strong>
          </div>
          <div className="member-summary-card">
            <span>Active Members</span>
            <strong>{summary.active_members}</strong>
          </div>
          <div className="member-summary-card">
            <span>Inactive Members</span>
            <strong>{summary.inactive_members}</strong>
          </div>
          <div className="member-summary-card">
            <span>Assigned Groups</span>
            <strong>{summary.assigned_groups}</strong>
          </div>
          <div className="member-summary-card">
            <span>Available Groups</span>
            <strong>{summary.available_groups}</strong>
          </div>
        </div>

        <div className="members-toolbar">
          <div className="members-search">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search members"
            />
          </div>
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">All chit groups</option>
            {groupOptions.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value={MEMBER_STATUS.ACTIVE}>Active</option>
            <option value={MEMBER_STATUS.INACTIVE}>Inactive</option>
            <option value={MEMBER_STATUS.SUSPENDED}>Suspended</option>
          </select>
        </div>

        <div className="members-table-card">
          <Table columns={columns} data={filteredMembers} actions={actions} />
        </div>
      </div>

      <Modal
        isOpen={Boolean(modalMode)}
        title={modalMode === "edit" ? "Edit Member" : "Add Member"}
        size="large"
        onClose={closeFormModal}
        footer={
          <div className="member-modal-actions">
            <Button variant="default" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveMember}>
              Save Member
            </Button>
          </div>
        }
      >
        <div className="member-form">
          {formError && <div className="member-form-error">{formError}</div>}
          <FormField
            label="Member Name"
            value={formData.member_name}
            onChange={(value) => handleChange("member_name", value)}
            required
          />
          <FormField
            label="Member ID / Member Number"
            value={formData.member_number}
            onChange={(value) => handleChange("member_number", value)}
            required
          />
          <FormField
            label="Mobile Number"
            value={formData.mobile_number}
            onChange={(value) => handleChange("mobile_number", value)}
            required
          />
          <FormField
            label="WhatsApp Number"
            value={formData.whatsapp_number}
            onChange={(value) => handleChange("whatsapp_number", value)}
            required
          />
          <FormField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => handleChange("email", value)}
          />
          <FormField
            label="Address"
            type="textarea"
            value={formData.address}
            onChange={(value) => handleChange("address", value)}
            required
          />
          <FormField
            label="Aadhaar Number"
            value={formData.aadhaar_masked}
            onChange={(value) => handleChange("aadhaar_masked", value)}
            required
          />
          <FormField
            label="PAN"
            value={formData.pan}
            onChange={(value) => handleChange("pan", value)}
          />
          <FormField
            label="Nominee Name"
            value={formData.nominee_name}
            onChange={(value) => handleChange("nominee_name", value)}
            required
          />
          <FormField
            label="Nominee Mobile"
            value={formData.nominee_mobile}
            onChange={(value) => handleChange("nominee_mobile", value)}
            required
          />
          <FormField
            label="Bank Name"
            value={formData.bank_name}
            onChange={(value) => handleChange("bank_name", value)}
            required
          />
          <FormField
            label="Account Number"
            value={formData.account_number_masked}
            onChange={(value) => handleChange("account_number_masked", value)}
            required
          />
          <FormField
            label="IFSC"
            value={formData.ifsc}
            onChange={(value) => handleChange("ifsc", value)}
            required
          />
          <FormField
            label="Assigned Chit Group"
            type="select"
            value={formData.chit_group_id}
            onChange={(value) => handleChange("chit_group_id", value)}
            options={groupOptions}
            required
          />
          <FormField
            label="Join Date"
            type="date"
            value={formData.join_date}
            onChange={(value) => handleChange("join_date", value)}
            required
          />
          <FormField
            label="Status"
            type="select"
            value={formData.status}
            onChange={(value) => handleChange("status", value)}
            options={[
              { value: MEMBER_STATUS.ACTIVE, label: "Active" },
              { value: MEMBER_STATUS.INACTIVE, label: "Inactive" },
              { value: MEMBER_STATUS.SUSPENDED, label: "Suspended" },
            ]}
          />
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(profileMember)}
        title="Member Profile"
        size="large"
        onClose={() => setProfileMember(null)}
        footer={
          <div className="member-modal-actions">
            <Button variant="default" onClick={() => setProfileMember(null)}>
              Close
            </Button>
          </div>
        }
      >
        {profileMember && (
          <div className="member-profile">
            <div className="member-profile-header">
              <div className="member-avatar">
                <Users size={24} />
              </div>
              <div>
                <h3>{profileMember.member_name}</h3>
                <p>{profileMember.member_number}</p>
                <span>{activeTenantContext?.workspace_label || "Tenant"} - {activeTenantContext?.tenant_id}</span>
              </div>
              <Badge
                label={profileMember.status}
                variant={MEMBER_STATUS_VARIANTS[profileMember.status] || "default"}
                size="small"
              />
            </div>
            <div className="member-profile-tabs">
              <Tabs tabs={profileTabs} />
            </div>
          </div>
        )}
      </Modal>
    </ChitLayout>
  );
}

function getMemberProfileTabs(member, groups, collections, activeTenantContext) {
  const assignedGroup = groups.find((group) => group.id === member.chit_group_id);
  const ledger = buildMemberLedger({ member, group: assignedGroup, collections });
  const groupName = getMemberGroupName(member, groups);
  const activityItems = [
    {
      title: "Profile viewed",
      detail: `Viewed in ${activeTenantContext?.workspace_label || "active workspace"}`,
      meta: "Current session",
    },
    {
      title: "Member joined chit",
      detail: groupName,
      meta: member.join_date || "-",
    },
  ];

  return [
    {
      label: "Personal Details",
      content: (
        <ProfileSection>
          <ProfileItem label="Member Name" value={member.member_name} />
          <ProfileItem label="Member ID / Member Number" value={member.member_number} />
          <ProfileItem label="Join Date" value={member.join_date} />
          <ProfileItem label="Status" value={member.status} />
        </ProfileSection>
      ),
    },
    {
      label: "Family Details",
      content: (
        <ProfileSection>
          <ProfileItem label="Nominee Name" value={member.nominee_name} />
          <ProfileItem label="Nominee Mobile" value={member.nominee_mobile} />
          <ProfileItem label="Relationship" value="Nominee" />
          <ProfileItem label="Family Records" value="Foundation ready" />
        </ProfileSection>
      ),
    },
    {
      label: "Address",
      content: (
        <ProfileSection>
          <ProfileItem label="Residential Address" value={member.address} wide />
          <ProfileItem label="Tenant ID" value={member.tenant_id} />
          <ProfileItem label="Data Scope" value={member.data_scope} />
        </ProfileSection>
      ),
    },
    {
      label: "Contact",
      content: (
        <ProfileSection>
          <ProfileItem label="Mobile Number" value={member.mobile_number} />
          <ProfileItem label="WhatsApp Number" value={member.whatsapp_number} />
          <ProfileItem label="Email" value={member.email || "-"} />
          <ProfileItem label="Preferred Contact" value="Mobile / WhatsApp" />
        </ProfileSection>
      ),
    },
    {
      label: "Aadhaar / PAN",
      content: (
        <ProfileSection>
          <ProfileItem label="Aadhaar Number" value={member.aadhaar_masked} />
          <ProfileItem label="PAN" value={member.pan || "-"} />
          <ProfileItem label="KYC Status" value="Basic details captured" />
          <ProfileItem label="Security" value="Sensitive numbers are masked" />
        </ProfileSection>
      ),
    },
    {
      label: "Bank Details",
      content: (
        <ProfileSection>
          <ProfileItem label="Bank Name" value={member.bank_name} />
          <ProfileItem label="Account Number" value={member.account_number_masked} />
          <ProfileItem label="IFSC" value={member.ifsc} />
          <ProfileItem label="Verification Status" value="Pending production workflow" />
        </ProfileSection>
      ),
    },
    {
      label: "Documents",
      content: (
        <EmptyProfilePanel
          title="Document vault foundation"
          message="Aadhaar, PAN, bank proof, photo, and agreement uploads will connect here after storage policies are added."
        />
      ),
    },
    {
      label: "Joined Chits",
      content: (
        <ProfileSection>
          <ProfileItem label="Chit Group" value={groupName} />
          <ProfileItem label="Chit Code" value={assignedGroup?.chit_code || "-"} />
          <ProfileItem label="Chit Value" value={assignedGroup?.chit_value ? `Rs ${Number(assignedGroup.chit_value).toLocaleString("en-IN")}` : "-"} />
          <ProfileItem label="Monthly Amount" value={assignedGroup?.monthly_amount ? `Rs ${Number(assignedGroup.monthly_amount).toLocaleString("en-IN")}` : "-"} />
          <ProfileItem label="Group Status" value={assignedGroup?.status || "-"} />
          <ProfileItem label="Member Join Date" value={member.join_date} />
        </ProfileSection>
      ),
    },
    {
      label: "Payment History",
      content: (
        <ProfileSection>{ledger.transactions.map((item) => <ProfileItem key={item.id} label={`${item.month} · ${item.receipt_no}`} value={`Paid Rs ${Number(item.collection).toLocaleString("en-IN")} · Balance Rs ${Number(item.balance).toLocaleString("en-IN")}`} wide />)}</ProfileSection>
      ),
    },
    {
      label: "Lift History",
      content: (
        <ProfileSection>{ledger.transactions.filter(item => item.lift > 0).map(item => <ProfileItem key={item.id} label={item.month} value={`Rs ${Number(item.lift).toLocaleString("en-IN")}`} wide />)}</ProfileSection>
      ),
    },
    {
      label: "Dividend History",
      content: (
        <ProfileSection>{ledger.transactions.filter(item => item.dividend > 0).map(item => <ProfileItem key={item.id} label={item.month} value={`Rs ${Number(item.dividend).toLocaleString("en-IN")}`} wide />)}</ProfileSection>
      ),
    },
    {
      label: "Receipts",
      content: (
        <ProfileSection>{ledger.transactions.filter(item => item.receipt_no !== "-").map(item => <ProfileItem key={item.id} label={item.receipt_no} value={`${item.month} · Rs ${Number(item.collection).toLocaleString("en-IN")}`} wide />)}</ProfileSection>
      ),
    },
    {
      label: "Notes",
      content: (
        <ProfileSection>
          <ProfileItem label="Internal Notes" value="No notes added yet." wide />
          <ProfileItem label="Tenant Isolation" value={`${member.tenant_id} / ${member.data_scope}`} wide />
        </ProfileSection>
      ),
    },
    {
      label: "Activity Log",
      content: <ActivityLog items={activityItems} />,
    },
  ];
}

function ProfileSection({ children }) {
  return <div className="member-profile-grid">{children}</div>;
}

function ProfileItem({ label, value, wide = false }) {
  return (
    <div className={`member-profile-item ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyProfilePanel({ title, message }) {
  return (
    <div className="member-empty-panel">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function ActivityLog({ items }) {
  return (
    <div className="member-activity-log">
      {items.map((item) => (
        <div className="member-activity-item" key={`${item.title}-${item.meta}`}>
          <div>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
          <span>{item.meta}</span>
        </div>
      ))}
    </div>
  );
}

export default Members;
