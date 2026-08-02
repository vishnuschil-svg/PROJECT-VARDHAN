import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import { useAuth } from "../../hooks/useAuth";
import {
  listTenantCollectionsPersistent,
  listTenantGroupsPersistent,
  updateTenantGroupPersistent,
} from "../../services/chitDataService";
import { confirmChitCompletion, previewChitCompletion } from "../../services/chitCompletionService";
import { listMonthClosings } from "../../services/monthClosingService";
import { listPayoutsPersistent, listWinnersPersistent } from "../../services/winnerLifecyclePersistence";
import { CHIT_GROUP_STATUS } from "../../config/chitPhaseOneData";
import { formatINR } from "../../utils/chitDisplayFormat";
import "./MonthClosing.css";

export default function ChitCompletionPage() {
  const { activeTenantContext } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTenantGroupsPersistent(activeTenantContext)
      .then((rows) => {
        if (cancelled) return;
        setGroups(rows);
        if (!groupId && rows[0]?.id) setGroupId(rows[0].id);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [activeTenantContext]);

  const group = useMemo(() => groups.find((item) => item.id === groupId) || null, [groups, groupId]);

  const runPreview = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const [monthClosings, payouts, winners, collections] = await Promise.all([
        listMonthClosings(activeTenantContext).catch(() => []),
        listPayoutsPersistent(activeTenantContext).catch(() => []),
        listWinnersPersistent(activeTenantContext).catch(() => []),
        listTenantCollectionsPersistent(activeTenantContext).catch(() => []),
      ]);
      const result = previewChitCompletion({
        group,
        monthClosings,
        payouts,
        winners,
        collections: collections.filter((row) => String(row.group_id || row.chit_group_id) === String(groupId)),
      });
      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!group) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const [monthClosings, payouts, winners, collections] = await Promise.all([
        listMonthClosings(activeTenantContext).catch(() => []),
        listPayoutsPersistent(activeTenantContext).catch(() => []),
        listWinnersPersistent(activeTenantContext).catch(() => []),
        listTenantCollectionsPersistent(activeTenantContext).catch(() => []),
      ]);
      const result = await confirmChitCompletion(
        {
          group,
          monthClosings,
          payouts,
          winners,
          collections,
          organizerConfirmed: true,
        },
        activeTenantContext
      );
      if (!result.success) {
        setError(result.message || "Completion blocked.");
        setPreview(result.preview);
        return;
      }
      await updateTenantGroupPersistent(
        { ...group, status: CHIT_GROUP_STATUS.CLOSED },
        activeTenantContext
      );
      setMessage("Chit marked completed. History is read-only; group no longer consumes an active trial slot.");
      setGroups(await listTenantGroupsPersistent(activeTenantContext));
      setPreview(result.preview);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChitLayout title="Chit completion" subtitle="Final reconcile, then organizer confirmation" showFloatingAI={false}>
      <div className="chit-complete-shell">
        <section className="chit-complete-panel">
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
          <div className="month-close-actions">
            <Button variant="secondary" onClick={runPreview} disabled={!groupId || busy}>Preview completion</Button>
            <Button variant="primary" onClick={onConfirm} disabled={!preview?.canComplete || busy}>Confirm completion</Button>
          </div>
        </section>

        {error && <div className="month-close-error" role="alert">{error}</div>}
        {message && <div className="month-close-ok">{message}</div>}

        {preview && (
          <section className={`month-close-preview ${preview.canComplete ? "ready" : "blocked"}`}>
            <header>
              <h2>Completion checklist</h2>
              <strong>{preview.canComplete ? "Ready" : "Blocked"}</strong>
            </header>
            <ul>
              <li>Closed months: {preview.closedMonths} / {preview.totalMonths}</li>
              <li>Pending collections: {formatINR(preview.pendingCollections)}</li>
              <li>Pending payout: {formatINR(preview.pendingPayout)}</li>
              <li>Confirmed winners: {preview.confirmedWinners}</li>
              <li>Dividends posted: {formatINR(preview.dividendTotal)}</li>
            </ul>
            {preview.issues?.map((issue) => <p key={issue}>{issue}</p>)}
          </section>
        )}
      </div>
    </ChitLayout>
  );
}
