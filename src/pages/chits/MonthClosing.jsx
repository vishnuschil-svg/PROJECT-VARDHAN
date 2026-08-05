import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import { useAuth } from "../../hooks/useAuth";
import {
  listTenantCollectionsPersistent,
  listTenantGroupsPersistent,
} from "../../services/chitDataService";
import {
  confirmMonthClosing,
  listMonthClosings,
  previewMonthClosing,
  reopenMonth,
} from "../../services/monthClosingService";
import { listWinnersPersistent } from "../../services/winnerLifecyclePersistence";
import { formatINR } from "../../utils/chitDisplayFormat";
import "./MonthClosing.css";

export default function MonthClosingPage() {
  const { activeTenantContext } = useAuth();
  const [groups, setGroups] = useState([]);
  const [collections, setCollections] = useState([]);
  const [winners, setWinners] = useState([]);
  const [closings, setClosings] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [monthNumber, setMonthNumber] = useState("1");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextGroups, nextCollections, nextWinners, nextClosings] = await Promise.all([
          listTenantGroupsPersistent(activeTenantContext),
          listTenantCollectionsPersistent(activeTenantContext).catch(() => []),
          listWinnersPersistent(activeTenantContext).catch(() => []),
          listMonthClosings(activeTenantContext).catch(() => []),
        ]);
        if (cancelled) return;
        setGroups(nextGroups);
        setCollections(nextCollections);
        setWinners(nextWinners || []);
        setClosings(nextClosings || []);
        setGroupId((current) => current || nextGroups[0]?.id || "");
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTenantContext]);

  const readiness = useMemo(() => {
    if (!preview) return null;
    if (preview.canClose) return { tone: "ready", label: "Ready" };
    if (preview.issues?.some((issue) => /reconciliation|winner|pending payout/i.test(issue))) {
      return { tone: "blocked", label: "Blocked" };
    }
    return { tone: "warning", label: "Warning" };
  }, [preview]);

  const runPreview = () => {
    setError("");
    setMessage("");
    const result = previewMonthClosing({
      source: { collections, auctions: [] },
      groupId,
      monthNumber: Number(monthNumber),
      winners,
      enforcePending: true,
    });
    setPreview(result);
  };

  const onConfirm = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await confirmMonthClosing(
        {
          source: { collections, auctions: [] },
          groupId,
          monthNumber: Number(monthNumber),
          winners,
          enforcePending: true,
          organizerConfirmed: true,
        },
        activeTenantContext
      );
      if (!result.success) {
        setError(result.message || "Month closing failed.");
        setPreview(result.preview);
        return;
      }
      setMessage("Month closed. Close record is immutable without controlled reopen.");
      setPreview(result.preview);
      setClosings(await listMonthClosings(activeTenantContext).catch(() => closings));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onReopen = async () => {
    if (!reopenReason.trim()) {
      setError("Reopen reason is mandatory.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const snapshot = closings.find(
        (row) =>
          String(row.groupId || row.group_id) === String(groupId) &&
          Number(row.monthNumber || row.month_number) === Number(monthNumber)
      );
      const result = await reopenMonth(
        snapshot || { groupId, monthNumber: Number(monthNumber) },
        { reason: reopenReason.trim(), organizerConfirmed: true },
        activeTenantContext
      );
      if (result?.success === false) {
        setError(result.message || "Reopen failed.");
        return;
      }
      setMessage("Month reopened with audit reason.");
      setClosings(await listMonthClosings(activeTenantContext).catch(() => closings));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChitLayout title="Month closing" subtitle="Reconcile before close — Ready / Warning / Blocked" showFloatingAI={false}>
      <div className="month-close-shell">
        <section className="month-close-form">
          <FormField
            label="Chit group"
            type="select"
            value={groupId}
            onChange={setGroupId}
            options={groups.map((item) => ({
              value: item.id,
              label: `${item.chit_name || "Unnamed Chit"} (${item.chit_code || "—"})`,
            }))}
          />
          <FormField label="Month number" type="number" value={monthNumber} onChange={setMonthNumber} />
          <div className="month-close-actions">
            <Button variant="secondary" onClick={runPreview} disabled={!groupId || busy}>Preview readiness</Button>
            <Button variant="primary" onClick={onConfirm} disabled={!preview?.canClose || busy}>Confirm close</Button>
          </div>
        </section>

        {error && <div className="month-close-error" role="alert">{error}</div>}
        {message && <div className="month-close-ok">{message}</div>}

        {preview && (
          <section className={`month-close-preview ${readiness?.tone || ""}`}>
            <header>
              <h2>Readiness checklist</h2>
              <strong>{readiness?.label}</strong>
            </header>
            <ul>
              <li>Collections: {formatINR(preview.summary?.collectionTotal)}</li>
              <li>Pending: {formatINR(preview.summary?.pending)}</li>
              <li>Winners this month: {preview.summary?.winnerCount ?? "—"}</li>
              <li>Payout pending: {formatINR(preview.summary?.payoutPending)}</li>
              <li>Reconciliation: {preview.reconciliation?.status || "—"}</li>
            </ul>
            {preview.issues?.length > 0 && (
              <div className="month-close-issues">
                {preview.issues.map((issue) => <p key={issue}>{issue}</p>)}
              </div>
            )}
          </section>
        )}

        <section className="month-close-reopen">
          <h2>Controlled reopen</h2>
          <FormField label="Reopen reason" value={reopenReason} onChange={setReopenReason} placeholder="Mandatory reason" />
          <Button variant="secondary" onClick={onReopen} disabled={busy}>Reopen month</Button>
        </section>

        <section className="month-close-history">
          <h2>Close history</h2>
          {closings.length === 0 && <p>No close records yet.</p>}
          <ul>
            {closings.map((row) => (
              <li key={row.id || `${row.group_id}-${row.month_number}-${row.status}`}>
                Group {row.groupId || row.group_id} · Month {row.monthNumber || row.month_number} · {row.status}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ChitLayout>
  );
}
