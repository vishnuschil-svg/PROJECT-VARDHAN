import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileUp, Loader2, Upload } from "lucide-react";
import ChitLayout from "../../components/chit/ChitLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  INGESTION_ACCEPT,
  createIngestionJob,
  getIngestionBatch,
} from "../../services/ingestionService";
import "./FileIngestion.css";

function newBatchId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `batch-${Date.now()}`;
}

export default function FileIngestionPage() {
  const navigate = useNavigate();
  const { activeTenantContext } = useAuth();
  const workspaceId = activeTenantContext?.workspace_id || activeTenantContext?.workspaceId;
  const inputRef = useRef(null);
  const [batchId, setBatchId] = useState(() => sessionStorage.getItem("vardhan.ingest.batch") || newBatchId());
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [languageHint, setLanguageHint] = useState("UNKNOWN");

  useEffect(() => {
    sessionStorage.setItem("vardhan.ingest.batch", batchId);
  }, [batchId]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const batch = await getIngestionBatch(batchId, { workspaceId });
        if (!cancelled) setJobs(batch.jobs || []);
      } catch {
        /* batch may be empty */
      }
      timer = setTimeout(poll, 4000);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [batchId, workspaceId]);

  const counts = useMemo(() => {
    const map = {};
    for (const job of jobs) map[job.status] = (map[job.status] || 0) + 1;
    return map;
  }, [jobs]);

  const onFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const job = await createIngestionJob(file, {
          workspaceId,
          languageHint,
          batchId,
        });
        setJobs((current) => {
          const without = current.filter((item) => item.id !== job.id);
          return [job, ...without];
        });
        if (job.status === "NEEDS_REVIEW" || job.status === "VALIDATED") {
          navigate(`/chits/ingest/${job.id}/review`);
          return;
        }
      }
    } catch (err) {
      setError(`${err.code || "OCR_FAILED"}: ${err.message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <ChitLayout title="File ingestion" subtitle="Universal chit document import — local-first, review before activation" showFloatingAI={false}>
      <div className="ingest-shell">
        <section className="ingest-hero">
          <div>
            <p className="ingest-kicker">VARDHAN Universal Ingestion</p>
            <h1>Import chit files without guessing numbers</h1>
            <p>
              Accepts XLSX, CSV, PDF, scanned PDF, images, DOCX, and legacy DOC.
              Local extraction runs first. Gemini is optional escalation only.
              Nothing activates until you confirm.
            </p>
          </div>
          <label className="ingest-lang">
            Language hint
            <select value={languageHint} onChange={(e) => setLanguageHint(e.target.value)}>
              <option value="UNKNOWN">Unknown / mixed</option>
              <option value="ENGLISH">English</option>
              <option value="TELUGU">Telugu</option>
              <option value="BILINGUAL">Bilingual</option>
            </select>
          </label>
        </section>

        <section className="ingest-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={INGESTION_ACCEPT}
            onChange={(e) => onFiles(e.target.files)}
          />
          <button type="button" className="ingest-upload-btn" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
            {busy ? "Processing…" : "Choose files"}
          </button>
          <p>Or drop files here. You can leave this page — jobs continue on the server.</p>
          <small>Batch {batchId}</small>
        </section>

        {error && (
          <div className="ingest-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section className="ingest-progress">
          <header>
            <h2>Batch progress</h2>
            <button type="button" onClick={() => setBatchId(newBatchId())}>New batch</button>
          </header>
          <div className="ingest-counts">
            {Object.keys(counts).length === 0 && <span>No jobs yet.</span>}
            {Object.entries(counts).map(([status, count]) => (
              <span key={status}><strong>{count}</strong> {status}</span>
            ))}
          </div>
          <ul className="ingest-jobs">
            {jobs.map((job) => (
              <li key={job.id}>
                <FileUp size={16} />
                <div>
                  <strong>{job.fileName}</strong>
                  <small>{job.status}{job.errorCode ? ` · ${job.errorCode}` : ""}</small>
                </div>
                <button type="button" onClick={() => navigate(`/chits/ingest/${job.id}/review`)}>
                  Review
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ChitLayout>
  );
}
