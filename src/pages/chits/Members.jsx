import { CreditCard, Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { mockMembers } from "../../config/chitMockData";
import "./Members.css";

function Members() {
  const columns = [
    { key: "name", label: "Name", width: "160px" },
    { key: "email", label: "Email", width: "200px" },
    { key: "phone", label: "Phone", width: "130px" },
    { key: "member_number", label: "Member #", width: "110px" },
    {
      key: "status",
      label: "Status",
      width: "110px",
      render: (value) => (
        <Badge
          label={value}
          variant={value === "active" ? "success" : "error"}
          size="small"
        />
      ),
    },
    {
      key: "bank_account",
      label: "Account",
      width: "150px",
      render: (value) => (value ? `****${String(value).slice(-4)}` : "-"),
    },
  ];

  const actions = [
    { icon: <Eye size={16} />, label: "View", onClick: () => {}, variant: "default" },
    { icon: <Pencil size={16} />, label: "Edit", onClick: () => {}, variant: "default" },
    { icon: <CreditCard size={16} />, label: "Collections", onClick: () => {}, variant: "primary" },
    { icon: <Trash2 size={16} />, label: "Remove", onClick: () => {}, variant: "danger" },
  ];

  return (
    <ChitLayout
      title="Members"
      subtitle="All members across chit groups"
      actions={
        <Button variant="primary" icon={<UserPlus size={16} />}>
          Add Member
        </Button>
      }
    >
      <div className="members-table-card">
        <Table columns={columns} data={mockMembers} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Members;
