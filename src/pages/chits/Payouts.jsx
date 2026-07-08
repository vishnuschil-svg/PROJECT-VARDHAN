import { CheckCircle, CreditCard, Eye, Plus } from "lucide-react";
import { useMemo } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { buildMemberLedger } from "../../config/chitMemberLedger";
import {
  formatCurrency,
} from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import "./Payouts.css";

function Payouts() {
  const { activeTenantContext } = useAuth();
  const collections = useTenantCollections(activeTenantContext);
  const tenantGroups = useMemo(
    () => listTenantGroups(activeTenantContext),
    [activeTenantContext]
  );
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );
  const payouts = useMemo(
    () =>
      tenantMembers.flatMap((member) => {
        const group = tenantGroups.find((item) => item.id === member.chit_group_id);
        const ledger = buildMemberLedger({ member, group, collections });

        if (!group || Number(ledger.lift_amount || 0) <= 0) {
          return [];
        }

        const liftTransaction = ledger.transactions.find((transaction) => Number(transaction.lift || 0) > 0);
        const chitAmount = Number(group.chit_value || 0);
        const payoutAmount = Number(ledger.lift_amount || 0);

        return [{
          id: `payout-${member.id}-${group.id}`,
          member_id: member.member_name,
          payout_month: liftTransaction?.month || "-",
          chit_amount: chitAmount,
          foreman_commission: Math.max(chitAmount - payoutAmount, 0),
          total_payout_amount: payoutAmount,
          status: "paid",
        }];
      }),
    [collections, tenantGroups, tenantMembers]
  );

  const columns = [
    { key: "member_id", label: "Member", width: "120px" },
    { key: "payout_month", label: "Month", width: "100px" },
    { key: "chit_amount", label: "Chit Amount", width: "130px", render: formatCurrency },
    { key: "foreman_commission", label: "Commission", width: "120px", render: formatCurrency },
    { key: "total_payout_amount", label: "Total Payout", width: "130px", render: formatCurrency },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "paid" ? "success" : val === "pending" ? "warning" : "error"} size="small" /> },
  ];

  const actions = [
    { icon: <Eye size={15} />, label: "View", onClick: () => {}, variant: "default" },
    { icon: <CheckCircle size={15} />, label: "Approve", onClick: () => {}, variant: "success" },
    { icon: <CreditCard size={15} />, label: "Mark Paid", onClick: () => {}, variant: "primary" },
  ];

  return (
    <ChitLayout
      title="Payouts"
      subtitle="Track chit amount payouts to winners"
      actions={<Button variant="primary" icon={<Plus size={16} />}>New Payout</Button>}
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={payouts} actions={actions} />
      </div>
    </ChitLayout>
  );
}

export default Payouts;
