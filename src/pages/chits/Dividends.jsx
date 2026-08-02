import { Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import { formatCurrency } from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { listDividends } from "../../services/dividendService";
import { listTenantMembers } from "../../services/chitDataService";
import "./Dividends.css";

function Dividends() {
  const { activeTenantContext } = useAuth();
  const [selected, setSelected] = useState(null);
  const [dividends, setDividends] = useState([]);
  const [error, setError] = useState("");
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listDividends(activeTenantContext);
        if (cancelled) return;
        const memberName = Object.fromEntries(
          tenantMembers.map((member) => [member.id, member.member_name || member.name || member.id])
        );
        setDividends(
          (rows || []).map((row) => ({
            id: row.id,
            member_id: memberName[row.memberId || row.member_id] || row.memberId || row.member_id,
            dividend_month: row.dividendMonth ?? row.dividend_month,
            dividend_amount: row.amount ?? row.dividend_amount,
            calculation_basis: row.metadata?.rounding?.method || "posted_allocation",
            dividend_date: row.dividendDate || row.dividend_date,
            status: String(row.status || "posted").toLowerCase(),
          }))
        );
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message || "Dividends could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTenantContext, tenantMembers]);

  const columns = [
    { key: "member_id", label: "Member", width: "120px" },
    { key: "dividend_month", label: "Month", width: "100px" },
    { key: "dividend_amount", label: "Dividend", width: "130px", render: formatCurrency },
    { key: "calculation_basis", label: "Basis", width: "130px", render: (val) => String(val || "").replace(/_/g, " ") },
    { key: "dividend_date", label: "Date", width: "120px", render: (val) => (val ? new Date(val).toLocaleDateString("en-IN") : "—") },
    { key: "status", label: "Status", width: "100px", render: (val) => <Badge label={val} variant={val === "paid" || val === "posted" ? "success" : val === "calculated" ? "primary" : "warning"} size="small" /> },
  ];

  const actions = [{ icon: <Eye size={15} />, label: "View calculation", onClick: setSelected, variant: "default" }];

  return (
    <ChitLayout
      title="Dividends"
      subtitle="Dividend calculation and distribution"
    >
      {error ? <p style={{ color: "var(--danger, #b42318)", marginBottom: 12 }}>{error}</p> : null}
      <div style={{ background: "var(--bg-primary)", borderRadius: 12, overflow: "hidden" }}>
        <Table columns={columns} data={dividends} actions={actions} />
      </div>
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Dividend calculation evidence">
        {selected && (
          <div>
            <p><strong>Member:</strong> {selected.member_id}</p>
            <p><strong>Month:</strong> {selected.dividend_month}</p>
            <p><strong>Dividend:</strong> {formatCurrency(selected.dividend_amount)}</p>
            <p><strong>Source:</strong> Durable dividend allocation</p>
            <p>Posted dividends are tenant-scoped and persist through Supabase in production.</p>
          </div>
        )}
      </Modal>
    </ChitLayout>
  );
}

export default Dividends;
