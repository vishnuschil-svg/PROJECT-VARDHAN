import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, RefreshCw, Save } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  aiReprocessIngestionJob,
  confirmIngestionJob,
  getIngestionJob,
  saveIngestionDraft,
} from "../../services/ingestionService";
import "./FileIngestion.css";

const EDIT_FIELDS = [
  ["plan.chitName", "Chit name", "text"],
  ["plan.chitValue", "Chit value", "number"],
  ["plan.memberCount", "Member count", "number"],
  ["plan.tenureMonths", "Tenure (months)", "number"],
  ["plan.monthlyInstallment", "Monthly installment", "number"],
  ["plan.organizerName", "Organizer", "text"],
  ["plan.startDate", "Start date", "text"],
  ["installment.pattern", "Installment pattern", "text"],
  ["commission.foremanCommissionPercent", "Foreman commission %", "number"],
  ["collection.gracePeriodDays", "Grace period days", "number"],
  ["collection.penaltyRule", "Penalty rule", "text"],
  ["terms", "Terms", "textarea"],
];

function readPath(draft, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), draft);
}

export default function IngestionReviewPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  const workspaceId = activeTenantContext?.workspace_id || activeTenantContext?.workspaceId;
  const [job, setJob] = useState(null);
  const [edits, setEdits] = useState({});
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const next = await getIngestionJob(jobId, { workspaceId });
    setJob(next);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getIngestionJob(jobId, { workspaceId });
        if (!cancelled) setJob(next);
      } catch (err) {
        if (!cancelled) setError(`${err.code || "OCR_FAILED"}: ${err.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, workspaceId]);

  const draft = job?.draft;
  const pages = draft?.pageTexts?.length ? draft.pageTexts : [draft?.rawText || job?.sourcePreview || ""];
  const missing = draft?.review?.missingMandatoryFields || [];
  const conflicts = draft?.review?.conflictingFields || [];
  const warnings = draft?.review?.warnings || [];

  const fieldValues = useMemo(() => {
    const values = {};
    for (const [path] of EDIT_FIELDS) {
      values[path] = edits[path] !== undefined ? edits[path] : readPath(draft, path) ?? "";
    }
    return values;
  }, [draft, edits]);

  const onSave = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {};
      for (const [path, , type] of EDIT_FIELDS) {
        if (edits[path] === undefined) continue;
        let value = edits[path];
        if (type === "number") {
          value = value === "" || value == null ? null : Number(value);
          if (value === 0) value = null; // never invent zero amounts
        }
        payload[path] = value;
      }
      const next = await saveIngestionDraft(jobId, payload, {
        workspaceId,
        reason: "side_by_side_review",
      });
      setJob(next);
      setEdits({});
      setMessage("Edits saved with audit history. Plan not activated.");
    } catch (err) {
      setError(`${err.code || "OCR_FAILED"}: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onAi = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await aiReprocessIngestionJob(jobId, { workspaceId });
      setJob(next);
      setMessage(next.errorCode
        ? `AI reprocess returned ${next.errorCode}. Local draft preserved.`
        : "AI reprocess finished. Review fields before confirming.");
    } catch (err) {
      setError(`${err.code || "OCR_FAILED"}: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await confirmIngestionJob(jobId, { workspaceId });
      setJob(next);
      setMessage(next.confirmation?.message || "Organizer confirmation recorded.");
    } catch (err) {
      setError(`${err.code || "OCR_FAILED"}: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChitLayout title="Ingestion review" subtitle="Source on the left · canonical draft on the right" showFloatingAI={false}>
      <div className="ingest-review">
        {!job && !error && <p className="ingest-muted">Loading job…</p>}
        {error && <div className="ingest-error" role="alert"><AlertTriangle size={18} /><span>{error}</span></div>}
        {message && <div className="ingest-message">{message}</div>}

        {job && (
          <>
            <div className="ingest-review-meta">
              <span>{job.fileName}</span>
              <span>{job.status}</span>
              <span>{job.parserVersion} / {job.schemaVersion}</span>
              {job.errorCode && <span className="warn">{job.errorCode}</span>}
              <button type="button" onClick={() => navigate("/chits/ingest")}>Back to batch</button>
              <button type="button" disabled={busy} onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="ingest-split">
              <section className="ingest-source">
                <header>
                  <h2>Source</h2>
                  <div className="ingest-pager">
                    <button type="button" disabled={pageIndex <= 0} onClick={() => setPageIndex((i) => i - 1)}>Prev</button>
                    <span>{pageIndex + 1} / {pages.length}</span>
                    <button type="button" disabled={pageIndex >= pages.length - 1} onClick={() => setPageIndex((i) => i + 1)}>Next</button>
                  </div>
                </header>
                <pre>{pages[pageIndex] || "No extracted text for this page."}</pre>
              </section>

              <section className="ingest-draft">
                <header>
                  <h2>Canonical draft</h2>
                  <div className="ingest-actions">
                    <button type="button" disabled={busy} onClick={onSave}><Save size={14} /> Save edits</button>
                    <button type="button" disabled={busy} onClick={onAi}>AI Reprocess</button>
                    <button type="button" className="primary" disabled={busy || missing.length > 0} onClick={onConfirm}>
                      <Check size={14} /> Confirm plan
                    </button>
                  </div>
                </header>

                {(missing.length > 0 || conflicts.length > 0 || warnings.length > 0) && (
                  <div className="ingest-flags">
                    {missing.length > 0 && <p><strong>Missing:</strong> {missing.join(", ")}</p>}
                    {conflicts.length > 0 && <p><strong>Conflicts:</strong> {conflicts.join(", ")}</p>}
                    {warnings.slice(0, 6).map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                )}

                <div className="ingest-fields">
                  {EDIT_FIELDS.map(([path, label, type]) => {
                    const confidence = draft?.fieldConfidence?.[path] || draft?.fieldConfidence?.[path.split(".").pop()];
                    return (
                      <label key={path} className="ingest-field">
                        <span>
                          {label}
                          {confidence?.confidence != null && (
                            <small> · conf {(Number(confidence.confidence) * 100).toFixed(0)}%</small>
                          )}
                        </span>
                        {type === "textarea" ? (
                          <textarea
                            rows={4}
                            value={fieldValues[path] ?? ""}
                            onChange={(e) => setEdits((current) => ({ ...current, [path]: e.target.value }))}
                          />
                        ) : (
                          <input
                            type={type === "number" ? "number" : "text"}
                            value={fieldValues[path] ?? ""}
                            onChange={(e) => setEdits((current) => ({ ...current, [path]: e.target.value }))}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>

                {Array.isArray(job.audit) && job.audit.length > 0 && (
                  <div className="ingest-audit">
                    <h3>Audit history</h3>
                    <ul>
                      {job.audit.map((entry, index) => (
                        <li key={`${entry.field}-${entry.timestamp}-${index}`}>
                          <strong>{entry.field}</strong>
                          <span>{String(entry.originalValue)} → {String(entry.editedValue)}</span>
                          <small>{entry.editor} · {entry.timestamp}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </ChitLayout>
  );
}
