import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, LoaderCircle,
  RefreshCw, Save, ScanText, Trash2, UploadCloud, WandSparkles, X,
} from "lucide-react";
import {
  REVIEW_FIELD_DEFINITIONS,
  SMART_CHIT_ACCEPT,
  applyReviewValue,
  createSmartChitRecord,
  deleteSmartChitDraft,
  extractSmartChitDocument,
  loadSmartChitDraft,
  saveSmartChitDraft,
  smartChitErrorMessage,
  validateSmartChitFile,
} from "../../services/ai/smartChitReviewService.js";

function SmartChitCapture({
  activeTenantContext,
  extractDocument = extractSmartChitDocument,
  saveDraft = saveSmartChitDraft,
  createRecord = createSmartChitRecord,
  loadDraft = loadSmartChitDraft,
  deleteDraft = deleteSmartChitDraft,
  onSessionExpired = defaultSessionExpired,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [review, setReview] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle");
  const [savedDraft, setSavedDraft] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const workspaceId = activeTenantContext?.workspace_id || activeTenantContext?.workspaceId;
  const busy = ["loading", "uploading", "extracting", "saving", "creating"].includes(phase);

  useEffect(() => {
    if (!file?.type?.startsWith("image/") || !(file instanceof Blob)) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const draftId = readDraftIdFromLocation();
    if (!draftId || !workspaceId) return undefined;
    let active = true;
    setPhase("loading");
    loadDraft(draftId, activeTenantContext)
      .then((loaded) => {
        if (!active || !loaded) return;
        setFile(loaded.file);
        setResult({ draft: loaded.draft, validation: loaded.validation });
        setReview(loaded.review);
        setSavedDraft(loaded.saved);
        setMessage("Saved draft reloaded from the selected workspace.");
        setPhase("review");
      })
      .catch((loadError) => { if (active) handleError(loadError); });
    return () => { active = false; };
  }, [activeTenantContext, loadDraft, workspaceId]);

  const chooseFile = (nextFile) => {
    if (busy) return;
    const validation = validateSmartChitFile(nextFile);
    if (!validation.valid) {
      setFile(null);
      setResult(null);
      setReview(null);
      setError(validation.message);
      setMessage("");
      setPhase("failed");
      return;
    }
    setFile(nextFile);
    setResult(null);
    setReview(null);
    setSavedDraft(null);
    setError("");
    setMessage(`${nextFile.name} is ready for authenticated extraction.`);
    setPhase("ready");
  };

  const runCapture = async () => {
    if (!file) {
      setError("Choose a PNG, JPEG, WebP, or PDF document first.");
      return;
    }
    if (!workspaceId) {
      setError("Select a valid business workspace before using Smart Chit Capture.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setMessage("");
    setPhase("uploading");
    try {
      await Promise.resolve();
      setPhase("extracting");
      const extracted = await extractDocument({ file, activeTenantContext, signal: controller.signal });
      setResult(extracted);
      setReview(extracted.review);
      setPhase("review");
      setMessage("Gemini extraction is ready. Review every field before saving.");
    } catch (captureError) {
      if (controller.signal.aborted) {
        setPhase("ready");
        setMessage("Extraction cancelled. You can replace the file or retry.");
        return;
      }
      handleError(captureError);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleError = (captureError) => {
    setPhase("failed");
    setError(smartChitErrorMessage(captureError));
    if (captureError?.code === "SESSION_EXPIRED" || captureError?.status === 401) {
      onSessionExpired?.();
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase(file ? "ready" : "idle");
  };

  const clear = () => {
    if (busy) cancel();
    setFile(null);
    setResult(null);
    setReview(null);
    setSavedDraft(null);
    setMessage("");
    setError("");
    setPhase("idle");
    writeDraftIdToLocation(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const persist = async (mode) => {
    if (!result?.draft || !review) return;
    setPhase(mode === "draft" ? "saving" : "creating");
    setError("");
    setMessage("");
    try {
      const input = { draft: result.draft, review, file, activeTenantContext };
      const outcome = mode === "draft" ? await saveDraft(input) : await createRecord(input);
      setResult((current) => ({ ...current, draft: outcome.draft, validation: outcome.validation }));
      setPhase("complete");
      if (mode === "draft") {
        setSavedDraft(outcome.saved);
        writeDraftIdToLocation(outcome.saved?.id || null);
      }
      setMessage(mode === "draft"
        ? "Draft saved through the tenant-scoped extraction repository."
        : `Chit record created${outcome.created?.group?.chit_name ? `: ${outcome.created.group.chit_name}` : ""}.`);
    } catch (saveError) {
      handleError(saveError);
    }
  };

  const deletePersistedDraft = async () => {
    if (!savedDraft?.id) return;
    setPhase("saving");
    setError("");
    try {
      await deleteDraft(savedDraft.id, activeTenantContext);
      setSavedDraft(null);
      setResult(null);
      setReview(null);
      setFile(null);
      setPhase("idle");
      setMessage("Temporary Smart Chit draft deleted from the workspace.");
      writeDraftIdToLocation(null);
    } catch (deleteError) {
      handleError(deleteError);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  };

  return (
    <section className="vardhan-ai-panel smart-capture-panel" aria-label="Smart Chit Capture">
      <div className="vardhan-ai-panel-header">
        <div>
          <span>Smart Chit Capture</span>
          <h3>Authenticated Gemini document capture</h3>
        </div>
        <button type="button" onClick={runCapture} disabled={!file || file.persisted || busy || !workspaceId}>
          {busy ? <LoaderCircle className="smart-capture-spinner" size={16} /> : <ScanText size={16} />}
          {phase === "uploading" ? "Uploading…" : phase === "extracting" ? "Extracting…" : "Run OCR"}
        </button>
      </div>

      <div className="vardhan-ai-provider-banner">
        <WandSparkles size={16} />
        Gemini OCR via the authenticated VARDHAN backend · PNG, JPEG, WebP and PDF · 15 MB max
      </div>

      {!workspaceId && (
        <div className="smart-capture-alert danger" role="alert">
          <AlertTriangle size={18} /> Select a valid business workspace before uploading a document.
        </div>
      )}

      <button
        type="button"
        className={`vardhan-ai-upload ${isDragging ? "dragging" : ""}`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); if (!busy) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        disabled={busy || !workspaceId}
      >
        {file?.type === "application/pdf" ? <FileText size={28} /> : <ImageIcon size={28} />}
        <strong>{file?.name || "Drop a chit image or PDF here"}</strong>
        <span>{file ? `${formatBytes(file.size)} · Click or drop to replace` : "or select a file from this device"}</span>
        <UploadCloud size={18} />
      </button>
      <input
        ref={inputRef}
        className="smart-capture-hidden-input"
        type="file"
        accept={SMART_CHIT_ACCEPT}
        onChange={(event) => { chooseFile(event.target.files?.[0] || null); event.target.value = ""; }}
      />

      {file && (
        <div className="smart-capture-file-actions">
          {busy && <button type="button" onClick={cancel}><X size={16} /> Cancel upload</button>}
          {!busy && <button type="button" onClick={() => inputRef.current?.click()}><RefreshCw size={16} /> Replace</button>}
          {!busy && <button type="button" onClick={clear}><Trash2 size={16} /> Remove</button>}
        </div>
      )}

      {busy && (
        <div className="smart-capture-progress" role="status" aria-live="polite">
          <span />
          {phase === "loading" ? "Loading saved workspace draft…" : phase === "uploading" ? "Uploading securely to the selected workspace…" : phase === "extracting" ? "Gemini is extracting document evidence…" : "Saving reviewed data…"}
        </div>
      )}

      {review && (
        <div className="smart-capture-review">
          <div className="smart-capture-document-preview">
            {previewUrl ? <img src={previewUrl} alt={`Uploaded document ${file.name}`} /> : (
              <div><FileText size={44} /><strong>{file.name}</strong><span>PDF preview is available after opening the original file.</span></div>
            )}
          </div>

          <div className="smart-capture-review-fields">
            <div className="smart-capture-review-heading">
              <div><strong>Editable extraction</strong><span>{Math.round(review.overallConfidence * 100)}% overall confidence</span></div>
              <span className="smart-capture-provider">{review.provider}</span>
            </div>
            {REVIEW_FIELD_DEFINITIONS.map((definition) => {
              const field = review.fields[definition.key];
              return (
                <label className={`smart-capture-field ${field.state}`} key={definition.key}>
                  <span>
                    {definition.label}
                    <em>{field.state === "missing" ? "Missing" : field.state === "user-corrected" ? "Corrected" : `${Math.round(field.confidence * 100)}%`}</em>
                  </span>
                  <input
                    type={definition.type}
                    value={field.value}
                    placeholder={field.state === "missing" ? "Not extracted" : ""}
                    onChange={(event) => setReview((current) => applyReviewValue(current, definition.key, event.target.value))}
                    disabled={busy}
                  />
                  {field.corrected && <small>Extracted: {String(field.extractedValue || "Missing")}</small>}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {review && (
        <details className="smart-capture-raw">
          <summary>Raw OCR text and warnings</summary>
          <pre>{review.rawText || "No raw text returned."}</pre>
          {review.warnings.map((warning) => <p key={warning}><AlertTriangle size={14} /> {warning}</p>)}
        </details>
      )}

      {result?.validation && (
        <div className={`smart-capture-validation ${result.validation.status === "VALID" ? "valid" : "invalid"}`}>
          <strong>{result.validation.status === "VALID" ? "Domain validation passed" : "Review required before creation"}</strong>
          {[...(result.validation.errors || []), ...(result.validation.warnings || [])].slice(0, 6).map((item) => <p key={item}>{item}</p>)}
        </div>
      )}

      {error && <div className="smart-capture-alert danger" role="alert"><AlertTriangle size={18} /> {error}</div>}
      {message && <div className="smart-capture-alert success" role="status"><CheckCircle2 size={18} /> {message}</div>}

      {review && (
        <div className="smart-capture-actions">
          <button type="button" onClick={() => persist("draft")} disabled={busy}>
            <Save size={16} /> Save Draft
          </button>
          <button type="button" className="primary" onClick={() => persist("record")} disabled={busy}>
            <WandSparkles size={16} /> Create Chit / Record
          </button>
          {savedDraft?.id ? (
            <button type="button" onClick={deletePersistedDraft} disabled={busy}><Trash2 size={16} /> Delete Draft</button>
          ) : (
            <button type="button" onClick={clear} disabled={busy}><X size={16} /> Cancel</button>
          )}
          <button type="button" onClick={runCapture} disabled={busy || file?.persisted}><RefreshCw size={16} /> Retry OCR</button>
        </div>
      )}
    </section>
  );
}

function defaultSessionExpired() {
  if (typeof window !== "undefined") window.location.assign("/login?reason=session-expired");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readDraftIdFromLocation() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("draft");
}

function writeDraftIdToLocation(draftId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (draftId) url.searchParams.set("draft", draftId);
  else url.searchParams.delete("draft");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default SmartChitCapture;
