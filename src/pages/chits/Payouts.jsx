import { Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import Badge from "../../components/common/Badge";
import { formatCurrency } from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import {
  listTenantGroupsPersistent,
  listTenantMembersPersistent,
} from "../../services/chitDataService";
import { listPayoutPlans } from "../../services/payoutService";
import { listWinnerResults } from "../../services/winnerService";
import "./Payouts.css";

function Payouts() {
  const { activeTenantContext } = useAuth();
  const [selected, setSelected] = useState(null);
  const [tenantGroups, setTenantGroups] = useState([]);
  const [tenantMembers, setTenantMembers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [groups, members, plans, winnerRows] = await Promise.all([
          listTenantGroupsPersistent(activeTenantContext),
          listTenantMembersPersistent(activeTenantContext),
          listPayoutPlans(activeTenantContext),
          listWinnerResults(activeTenantContext),
        ]);
        if (cancelled) return;
        setTenantGroups(groups);
        setTenantMembers(members);
        setPayouts(plans);
        setWinners(winnerRows);
      } catch {
        if (cancelled) return;
        setTenantGroups([]);
        setTenantMembers([]);
        setPayouts([]);
        setWinners([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTenantContext]);

  const rows = useMemo(
    () =>
      payouts.map((plan) => {
        const member = tenantMembers.find(
          (item) => item.id === (plan.member_id || plan.memberId)
        );
        const group = tenantGroups.find((item) => item.id === (plan.group_id || plan.groupId));
        const winner = winners.find((item) => item.id === (plan.winner_id || plan.winnerId));
        const total = Number(plan.payout_amount || plan.totalPayout || 0);
        const paid = Number(plan.paid_amount || plan.paidAmount || 0);
        return {
          id: plan.id,
          member_id: member?.member_name || plan.member_id || "-",
          payout_month: plan.payout_month || winner?.monthNumber || "-",
          chit_amount: Number(group?.chit_value || 0),
          foreman_commission: Math.max(Number(group?.chit_value || 0) - total, 0),
          total_payout_amount: total,
          paid_amount: paid,
          reference_no: plan.reference_no || "-",
          status: String(plan.status || "PENDING").toLowerCase(),
          raw: plan,
        };
      }),
    [payouts, tenantGroups, tenantMembers, winners]
  );

  const columns = [
    { key: "member_id", label: "Member", width: "120px" },
    { key: "payout_month", label: "Month", width: "100px" },
    { key: "chit_amount", label: "Chit Amount", width: "130px", render: formatCurrency },
    { key: "foreman_commission", label: "Commission", width: "120px", render: formatCurrency },
    { key: "total_payout_amount", label: "Total Payout", width: "130px", render: formatCurrency },
    { key: "paid_amount", label: "Paid", width: "110px", render: formatCurrency },
    { key: "reference_no", label: "Reference", width: "160px" },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge
          label={val}
          variant={val === "paid" ? "success" : val.includes("partial") || val === "pending" ? "warning" : "error"}
          size="small"
        />
      ),
    },
  ];

  const actions = [
    { icon: <Eye size={15} />, label: "View payout evidence", onClick: setSelected, variant: "default" },
  ];

  return (
    <ChitLayout title="Payouts" subtitle="Track chit amount payouts to winners">
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={rows} actions={actions} />
      </div>
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Payout evidence">
        {selected && (
          <div>
            <p>
              <strong>Member:</strong> {selected.member_id}
            </p>
            <p>
              <strong>Month:</strong> {selected.payout_month}
            </p>
            <p>
              <strong>Payout:</strong> {formatCurrency(selected.total_payout_amount)}
            </p>
            <p>
              <strong>Paid:</strong> {formatCurrency(selected.paid_amount)}
            </p>
            <p>
              <strong>Reference:</strong> {selected.reference_no}
            </p>
            <p>
              <strong>Status:</strong> {selected.status}
            </p>
            <p>
              Durable payout plan linked to the confirmed winner. Duplicate payments are blocked by
              payment reference / idempotency keys.
            </p>
          </div>
        )}
      </Modal>
    </ChitLayout>
  );
}

export default Payouts;
