import { MessageCircle, Pencil, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { formatCurrency } from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listTenantMembers } from "../../services/chitDataService";
import "./PendingCollections.css";
import { createMessageJob } from "../../services/communicationService";

function PendingCollections() {
  const { activeTenantContext } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const collections = useTenantCollections(activeTenantContext);
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );
  const pendingCollections = collections.filter((collection) => collection.is_partial);
  const pendingTotal = pendingCollections.reduce(
    (sum, collection) => sum + Number(collection.pending_amount || 0),
    0
  );

  const columns = [
    {
      key: "member_id",
      label: "Member",
      width: "150px",
      render: (value) => tenantMembers.find((member) => member.id === value)?.member_name || "-",
    },
    { key: "collection_month", label: "Month", width: "110px", sortable: true },
    {
      key: "installment_amount",
      label: "Installment",
      width: "130px",
      render: (value) => formatCurrency(value),
    },
    { key: "paid_amount", label: "Paid", width: "110px", render: (value) => formatCurrency(value) },
    {
      key: "pending_amount",
      label: "Pending",
      width: "120px",
      render: (value) => formatCurrency(value),
    },
    {
      key: "payment_date",
      label: "Payment Date",
      width: "130px",
      render: (value) => new Date(value).toLocaleDateString("en-IN"),
    },
    {
      key: "is_partial",
      label: "Status",
      width: "110px",
      render: () => <Badge label="Attention" variant="warning" size="small" />,
    },
  ];

  const sendReminder = (row) => {
    const member = tenantMembers.find((item) => item.id === row.member_id);
    const result = createMessageJob({
      dedupeKey: `pending-${row.id}-${row.pending_amount}`,
      type: "PAYMENT_PENDING",
      channel: "MANUAL_SHARE",
      memberId: row.member_id,
      body: `Payment reminder for ${member?.member_name || "member"}: ${formatCurrency(row.pending_amount)} is pending for ${row.collection_month}.`,
    }, activeTenantContext);
    setNotice(result.success ? "Reminder prepared. Official provider delivery is not configured; use the manual share action from Communication Center." : result.message);
  };
  const actions = [
    { icon: <MessageCircle size={15} />, label: "Prepare reminder", onClick: sendReminder, variant: "warning" },
    { icon: <Pencil size={15} />, label: "Record payment", onClick: () => navigate("/chits/collections"), variant: "default" },
  ];

  return (
    <ChitLayout
      title="Pending Collections"
      subtitle="Members with partial or pending payments"
    >
      <div className="pending-collections-page">
        {notice && <div className="pending-empty-state" role="status"><strong>{notice}</strong></div>}
        <div className="pending-summary">
          <div>
            <span>Pending Members</span>
            <strong>{pendingCollections.length}</strong>
          </div>
          <div>
            <span>Pending Amount</span>
            <strong>{formatCurrency(pendingTotal)}</strong>
          </div>
          <div>
            <span>Reminder Status</span>
            <strong>Ready</strong>
          </div>
        </div>

        {pendingCollections.length > 0 ? (
          <div className="pending-table-card">
            <Table columns={columns} data={pendingCollections} actions={actions} />
          </div>
        ) : (
          <div className="pending-empty-state">
            <ReceiptText size={34} />
            <strong>No pending collections</strong>
            <p>All visible payment schedules are clear for this workspace.</p>
          </div>
        )}
      </div>
    </ChitLayout>
  );
}

export default PendingCollections;
