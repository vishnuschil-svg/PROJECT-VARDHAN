import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import { buildMemberLedger } from "../../config/chitMemberLedger";
import {
  formatCurrency,
} from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import { listTenantGroups, listTenantMembers } from "../../services/chitDataService";
import "./Dividends.css";

function Dividends() {
  const { activeTenantContext } = useAuth();
  const [selected, setSelected] = useState(null);
  const collections = useTenantCollections(activeTenantContext);
  const tenantGroups = useMemo(
    () => listTenantGroups(activeTenantContext),
    [activeTenantContext]
  );
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );
  const dividends = useMemo(
    () =>
      tenantMembers.flatMap((member) => {
        const group = tenantGroups.find((item) => item.id === member.chit_group_id);
        const ledger = buildMemberLedger({ member, group, collections });

        return ledger.transactions
          .filter((transaction) => Number(transaction.dividend || 0) > 0)
          .map((transaction) => ({
            id: `dividend-${member.id}-${transaction.id}`,
            member_id: member.member_name,
            dividend_month: transaction.month,
            dividend_amount: transaction.dividend,
            calculation_basis: "ledger_adjustment",
            dividend_date: transaction.date,
            status: "calculated",
          }));
      }),
    [collections, tenantGroups, tenantMembers]
  );

  const columns = [
    { key: "member_id", label: "Member", width: "120px" },
    { key: "dividend_month", label: "Month", width: "100px" },
    { key: "dividend_amount", label: "Dividend", width: "130px", render: formatCurrency },
    { key: "calculation_basis", label: "Basis", width: "130px", render: (val) => val.replace(/_/g, " ") },
    { key: "dividend_date", label: "Date", width: "120px", render: (val) => new Date(val).toLocaleDateString("en-IN") },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "paid" ? "success" : val === "calculated" ? "primary" : "warning"} size="small" /> },
  ];

  const actions = [{ icon: <Eye size={15} />, label: "View calculation", onClick: setSelected, variant: "default" }];

  return (
    <ChitLayout
      title="Dividends"
      subtitle="Dividend calculation and distribution"
    >
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={dividends} actions={actions} />
      </div>
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Dividend calculation evidence">
        {selected && <div><p><strong>Member:</strong> {selected.member_id}</p><p><strong>Month:</strong> {selected.dividend_month}</p><p><strong>Dividend:</strong> {formatCurrency(selected.dividend_amount)}</p><p><strong>Source:</strong> Central member ledger adjustment</p><p>This derived value is read-only. Approval belongs to the underlying auction/rule workflow and is not simulated here.</p></div>}
      </Modal>
    </ChitLayout>
  );
}

export default Dividends;
