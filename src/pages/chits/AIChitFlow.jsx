import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bot, Check, ChevronRight,
  FileText, Image, LayoutGrid,
  Plus, ShieldCheck, Trash2, Upload, Info, DollarSign,
  Calendar, Camera, List, Sliders, HelpCircle, Edit3, X, FileQuestion, ScanText,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ChitLayout from "../../components/chit/ChitLayout";
import {
  generateBusinessUnderstanding,
  applyOwnerCorrections,
  confirmBusinessUnderstanding,
  createChitFromBusinessUnderstanding,
  evaluateCreationReadiness,
  saveBusinessUnderstandingDraft,
} from "../../services/universalBusinessRuleService";
import { listTenantGroups, listTenantGroupsPersistent } from "../../services/chitDataService";
import { getFinanceDashboardSummary } from "../../services/financeService";
import { VALUE_STATE, RULE_STATE } from "../../domain/chit/services/UniversalBusinessRuleEngine";
import { validateDraft, VALIDATION_STATUS } from "../../domain/chit/validation/ValidationService";
import { mapDraftToBusinessDSL } from "../../domain/chit/dsl/BusinessDSLMapper";
import { BUSINESS_DSL_STATUS } from "../../domain/chit/dsl/BusinessDSLModel";
import { simulateBusinessDSL, SIMULATION_STATUS } from "../../domain/chit/simulation/SimulationEngine";
import { FIELD_STATUS } from "../../domain/chit/services/ChitDocumentUnderstandingEngine";
import { AI_ANALYSIS_STAGES, canCreateFromAnalysis, confidenceStatus, flowStorageKey, resolveReviewItem, stepFromPath } from "../../config/aiChitFlow";
import "./AIChitFlow.css";

const EDITABLE_BUSINESS_FIELDS = Object.freeze([
  "chitName", "chitValue", "duration", "memberCount", "grossInstallment",
  "installmentPattern", "installmentMode", "startDate", "foremanCommissionPercent",
  "minimumDiscountPercent", "maximumDiscountPercent", "prizeAmount",
  "auctionPattern", "organizerName", "contactNumber",
  "fractionalTicketInformation", "specialRules", "notes",
]);

const STEP_META = Object.freeze({
  welcome: { title: "Create Chit", subtitle: "Upload a document or continue from an existing workspace" },
  upload: { title: "Upload & Understand", subtitle: "Extract objective facts from a chit document" },
  analyzing: { title: "Understanding document", subtitle: "Extracting facts ? no assumptions" },
  summary: { title: "Business summary", subtitle: "Review extracted facts before creation" },
  details: { title: "Core fields", subtitle: "Confirm or correct extracted values" },
  schedule: { title: "Month schedule", subtitle: "Review installment schedule rows" },
  rules: { title: "Business rules", subtitle: "Confirm detected financial rules" },
  terms: { title: "Terms", subtitle: "Review terms before owner confirmation" },
  review: { title: "Review & create", subtitle: "Owner confirmation gate before ERP records" },
  success: { title: "Chit created", subtitle: "Group created in your workspace" },
});

const OCR_UNAVAILABLE_CODES = new Set([
  "OCR_NOT_CONFIGURED",
  "OCR_PROVIDER_UNAVAILABLE",
  "OCR_TIMEOUT",
  "OCR_RATE_LIMIT",
]);
const MAX_OCR_RETRIES = 3;

function ocrRecoveryCopy(errorCode) {
  if (errorCode === "OCR_RATE_LIMIT") {
    return {
      title: "OCR rate limit reached",
      subtitle: "Gemini quota was exceeded. Wait before retrying, or enter visible text manually.",
      retryHint: "Wait a few minutes, then retry",
    };
  }
  if (errorCode === "OCR_TIMEOUT") {
    return {
      title: "OCR timed out",
      subtitle: "The vision provider did not finish in time. Retry, re-upload, or enter visible text.",
      retryHint: null,
    };
  }
  if (errorCode === "OCR_NOT_CONFIGURED") {
    return {
      title: "OCR is not configured",
      subtitle: "The vision provider is not available in this environment. Enter visible text manually.",
      retryHint: null,
    };
  }
  return {
    title: "OCR is currently unavailable",
    subtitle: "Your document was kept. Retry, re-upload, or continue with visible text.",
    retryHint: null,
  };
}

function AIChitFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTenantContext, profile } = useAuth();
  const key = flowStorageKey(activeTenantContext);
  const step = stepFromPath(location.pathname);
  const [state, setState] = useState(() => readState(key));
  useEffect(() => setState(readState(key)), [key]);
  useEffect(() => {
    if (state.draft || state.created) sessionStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  const update = (patch) => setState((current) => ({ ...current, ...patch }));
  const go = (target) => navigate(`/chits/ai-chit${target ? `/${target}` : ""}`);
  const requiresAnalysis = !["welcome", "upload"].includes(step);
  useEffect(() => {
    if (requiresAnalysis && !state.draft && !state.created)
      navigate("/chits/ai-chit/upload", { replace: true });
  }, [navigate, requiresAnalysis, state.draft, state.created]);

  const meta = STEP_META[step] || STEP_META.welcome;

  return (
    <ChitLayout title={meta.title} subtitle={meta.subtitle} showFloatingAI={false}>
      <div className={`ai-chit-shell ai-step-${step}`}>
        <FlowHeader step={step} onBack={() => navigate(-1)} />
        <main className="ai-chit-main">
          {step === "welcome" && <Welcome go={go} context={activeTenantContext} profile={profile} />}
          {step === "upload" && <UploadScreen state={state} update={update} go={go} context={activeTenantContext} />}
          {(step === "analyzing" || step === "summary" || step === "details" || step === "schedule" || step === "rules" || step === "terms" || step === "review") && (
            <BusinessWorkspace
              draft={state.draft}
              setDraft={(d) => update({ draft: d })}
              setValidation={(v) => update({ validation: v })}
              normalizedJSON={state.normalizedJSON}
              analysisLegacy={state.analysis}
              state={state}
              update={update}
              go={go}
              context={activeTenantContext}
              step={step}
            />
          )}
          {step === "success" && <Success state={state} go={go} context={activeTenantContext} profile={profile} />}
        </main>
      </div>
    </ChitLayout>
  );
}

function FlowHeader({ step, onBack }) {
  return (
    <header className="ai-flow-header">
      {step !== "welcome" && (
        <button type="button" onClick={onBack} aria-label="Go back"><ArrowLeft /></button>
      )}
      <div><ScanText /><span>Smart Chit Capture</span></div>
      <small>{step === "welcome" ? "Create workspace" : "Document understanding"}</small>
    </header>
  );
}

function Welcome({ go, context, profile }) {
  const groups = listTenantGroups(context);
  return (
    <div className="ai-welcome">
      <section className="ai-hero">
        <span className="ai-orb" aria-hidden="true"><ScanText /></span>
        <p>MITRA NIDHI</p>
        <h1>Create a chit from a document</h1>
        <h2>Upload any register, poster, or schedule ? we extract facts, not assumptions.</h2>
        <small>{profile?.full_name ? `Signed in as ${profile.full_name}` : "Tenant-scoped workspace"}</small>
      </section>
      <section className="ai-action-grid">
        <button type="button" className="primary" onClick={() => go("upload")}>
          <Upload /><span><strong>Upload Document</strong><small>JPG, JPEG, PNG, WebP, PDF, or a camera photo</small></span><ChevronRight />
        </button>
        <button type="button" onClick={() => window.location.assign("/chits/smart-capture")}><ScanText /><span><strong>Smart Chit Capture</strong><small>Authenticated OCR with editable review</small></span><ChevronRight /></button>
        <button type="button" onClick={() => window.location.assign("/chits/ai")}><Bot /><span><strong>AI Assistant</strong><small>Ask about your chit business</small></span></button>
        <button type="button" onClick={() => window.location.assign("/chits/groups")}><LayoutGrid /><span><strong>My Chit Groups</strong><small>{groups.length} tenant-scoped groups</small></span></button>
        <button type="button" onClick={() => window.location.assign("/chits/academy")}><FileText /><span><strong>Knowledge Base</strong><small>Guides and verified help</small></span></button>
      </section>
    </div>
  );
}

function UploadScreen({ state, update, go, context }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const manualRef = useRef();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [name, setName] = useState(state.documentName || "");
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("form");
  const [stageIndex, setStageIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const isImage = file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name));
    if (!isImage) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const ocrStatus = (() => {
    if (["uploading", "extracting", "validating"].includes(phase)) {
      return { tone: "active", label: "OCR in progress", detail: "Authenticated request to /api/v1/ocr/extract" };
    }
    if (phase === "unavailable" || errorCode) {
      return {
        tone: "danger",
        label: errorCode || "OCR unavailable",
        detail: error || "Document extraction failed. Retry or enter visible text manually.",
      };
    }
    if (file) return { tone: "ready", label: "Ready to extract", detail: "Upload & Understand will call the workspace OCR proxy" };
    return { tone: "idle", label: "Waiting for document", detail: "Choose a file or capture a photo to begin" };
  })();

  const choose = (selected) => {
    setFile(selected);
    setError("");
    setErrorCode("");
    setRetryCount(0);
    setPhase("form");
  };
  const handleFileChange = (event) => {
    choose(event.target.files[0] || null);
    event.target.value = "";
  };
  const removeFile = () => {
    setFile(null);
    setPreviewUrl("");
    setError("");
    setErrorCode("");
    setRetryCount(0);
    setPhase("form");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };
  const analyze = async ({ isRetry = false } = {}) => {
    if (!file || busy) return;
    if (isRetry && retryCount >= MAX_OCR_RETRIES) {
      setErrorCode("OCR_FAILED");
      setError(`OCR_FAILED: Maximum retries (${MAX_OCR_RETRIES}) reached. Enter the visible text manually or re-upload.`);
      setPhase("unavailable");
      return;
    }
    if (isRetry) setRetryCount((count) => count + 1);
    setBusy(true);
    setError("");
    setErrorCode("");
    setPhase("uploading");
    setStageIndex(0);
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      setPhase("extracting");
      setStageIndex(1);
      const workspaceId = context?.workspace_id || context?.workspaceId;
      const {
        draft, validation, normalizedJSON, legacy,
        extractionStatus, confidence, warnings,
      } = await generateBusinessUnderstanding(file, {
        manualText,
        workspaceId,
      });
      setPhase("validating");
      setStageIndex(3);
      const reviewState = confidence >= 0.88
        ? "ready_for_review"
        : confidence >= 0.70
          ? "low_confidence"
          : "manual_confirmation_required";
      update({
        draft,
        validation,
        normalizedJSON,
        analysis: legacy,
        documentName: name || file.name,
        confirmed: false,
        created: null,
        extractionStatus,
        extractionConfidence: confidence,
        extractionWarnings: warnings,
        reviewState,
      });
      setRetryCount(0);
      go("review");
    } catch (e) {
      const code = e?.code || "OCR_FAILED";
      setErrorCode(code);
      setError(`${code}: ${e?.message || "Document extraction failed."}`);
      setPhase(OCR_UNAVAILABLE_CODES.has(code) ? "unavailable" : "form");
      try {
        console.warn("[OCR][AIChitFlow]", { code, retryable: Boolean(e?.retryable), retryCount: isRetry ? retryCount + 1 : retryCount });
      } catch { /* ignore logging failures */ }
    } finally {
      setBusy(false);
    }
  };

  if (phase === "unavailable") {
    const retriesLeft = Math.max(0, MAX_OCR_RETRIES - retryCount);
    const recovery = ocrRecoveryCopy(errorCode);
    const retrySmall = retriesLeft <= 0
      ? "Retry limit reached"
      : recovery.retryHint
        ? `${recovery.retryHint} \u00B7 ${retriesLeft} left`
        : `${retriesLeft} attempt${retriesLeft === 1 ? "" : "s"} left`;
    return (
      <StepCard eyebrow="Document OCR" title={recovery.title} subtitle={recovery.subtitle}>
        <div className={`ai-ocr-status ${ocrStatus.tone}`} role="status">
          <strong>{ocrStatus.label}</strong>
          <span>{ocrStatus.detail}</span>
        </div>
        <div className="ai-unavailable">
          <div className="ai-unavailable-icon"><AlertTriangle size={28} /></div>
          <p className="ai-unavailable-desc">Document <strong>{file?.name}</strong> was received. No fabricated OCR result was created. {retriesLeft} retry{retriesLeft === 1 ? "" : "s"} remaining.</p>
        </div>
        <div className="ai-unavailable-actions">
          <button type="button" className="ai-unavailable-btn primary" onClick={() => { setPhase("form"); setTimeout(() => manualRef.current?.focus(), 0); }}>
            <span><strong>Enter details manually</strong><small>Paste visible text as evidence</small></span><ArrowRight />
          </button>
          <button type="button" className="ai-unavailable-btn secondary" disabled={busy || retriesLeft <= 0} onClick={() => analyze({ isRetry: true })}>
            <span><strong>Retry OCR</strong><small>{retrySmall}</small></span>
          </button>
          <button type="button" className="ai-unavailable-btn secondary" onClick={() => { setPhase("form"); setTimeout(() => fileRef.current?.click(), 0); }}>
            <span><strong>Re-upload document</strong><small>Choose another file</small></span>
          </button>
        </div>
      </StepCard>
    );
  }

  if (["uploading", "extracting", "validating"].includes(phase)) {
    const stageLabels = ["Classifying document type", "Extracting text and numbers", "Detecting business rules", "Building workspace"];
    return (
      <StepCard eyebrow="Document OCR" title="Understanding your document?" subtitle="Extracting objective facts. No assumptions are made.">
        <div className={`ai-ocr-status ${ocrStatus.tone}`} role="status" aria-live="polite">
          <strong>{ocrStatus.label}</strong>
          <span>{ocrStatus.detail}</span>
        </div>
        <div className="ai-file-accepted"><FileText /><div><strong>{file?.name}</strong><small>Document accepted</small></div><Check /></div>
        <div className="ai-stage-list" aria-live="polite">
          {stageLabels.map((label, i) => (
            <div key={label} className={i < stageIndex ? "done" : i === stageIndex ? "active" : "pending"}>
              <span>
                {i < stageIndex ? <Check /> : i === stageIndex ? <div className="ai-pulse" /> : <div className="ai-dot" />}
              </span>
              <div><strong>{label}</strong></div>
            </div>
          ))}
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard
      eyebrow="Document upload"
      title="Upload your chit document"
      subtitle="We extract only objective facts. No business model is assumed."
    >
      <div className={`ai-ocr-status ${ocrStatus.tone}`} role="status">
        <strong>{ocrStatus.label}</strong>
        <span>{ocrStatus.detail}</span>
      </div>
      <div className="ai-input-types">
        {[[Image, "JPG/JPEG"], [Image, "PNG/WebP"], [FileText, "PDF"], [Camera, "Camera"]].map(([Icon, label]) => (
          <span key={label}><Icon />{label}</span>
        ))}
      </div>
      <button type="button" className={`ai-dropzone ${file ? "has-file" : ""}`} onClick={() => fileRef.current?.click()}>
        {previewUrl ? (
          <>
            <img className="ai-image-preview" src={previewUrl} alt={`Preview of ${file.name}`} />
            <span className="ai-preview-details">
              <strong>{file.name}</strong>
              <small>{Math.ceil(file.size / 1024)} KB ? Click to change document</small>
            </span>
          </>
        ) : file ? (
          <><FileText /><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB ? Click to change document</small></>
        ) : (
          <><Upload /><strong>Choose a document</strong><small>JPG, JPEG, PNG, WebP, or PDF ? 15 MB max</small></>
        )}
      </button>
      <input ref={fileRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} />
      {file && (
        <button className="ai-remove-file" type="button" onClick={removeFile}>
          <Trash2 size={16} /> Remove selected document
        </button>
      )}
      <button className="ai-camera-action" type="button" onClick={() => cameraRef.current?.click()}>
        <Camera /><span><strong>Take Photo</strong><small>Use your device's rear camera when supported</small></span>
      </button>
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
      <div className="ai-form-section">
        <label className="ai-field">
          Document name <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional business-friendly name" />
        </label>
        <label className="ai-field">
          Visible text (optional) <textarea ref={manualRef} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Paste text from the document if it cannot be processed automatically." />
          <small>Manual evidence path used when OCR is unavailable.</small>
        </label>
      </div>
      {error && (
        <div className="ai-extraction-error" role="alert">
          <Notice tone="danger"><AlertTriangle />{error}</Notice>
          <div className="ai-error-actions">
            <button type="button" disabled={busy || retryCount >= MAX_OCR_RETRIES} onClick={() => analyze({ isRetry: true })}>Retry</button>
            <button type="button" onClick={() => manualRef.current?.focus()}>Enter details manually</button>
            <button type="button" onClick={() => fileRef.current?.click()}>Re-upload document</button>
          </div>
        </div>
      )}
      <Notice><ShieldCheck /> Your document stays tenant-scoped. Only objective facts are extracted.</Notice>
      <StickyAction disabled={!file || busy} onClick={() => analyze()}>
        {busy ? "Analyzing document?" : "Upload & Understand"}<ArrowRight />
      </StickyAction>
    </StepCard>
  );
}

/**
 * Business Workspace ? reads ONLY from DraftBusinessModel.
 * Never reads directly from OCR or AI output.
 * "Create Chit Group" enabled ONLY when validation == VALID.
 */
export function BusinessWorkspace({ draft, setDraft, setValidation, normalizedJSON, analysisLegacy, state, update, go, context, step }) {
  const [activeSection, setActiveSection] = useState("schedule");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fallback to legacy analysis if draft not available
  const analysis = draft || analysisLegacy;

  if (!analysis) {
    return (
      <StepCard eyebrow="Analysis required" title="No document analyzed yet" subtitle="Upload a document to understand the business.">
        <StickyAction onClick={() => go("upload")}>Upload Document<ArrowRight /></StickyAction>
      </StepCard>
    );
  }

  // Read from DraftBusinessModel if available, otherwise fallback to legacy fields
  const draftMode = Boolean(draft);

  // Helper: get field state from DraftBusinessModel
  const draftFieldState = (key) => draft?.business?.[key]?.state || VALUE_STATE.NOT_FOUND;
  const draftFieldValue = (key) => {
    if (!draft?.business?.[key]) return null;
    const v = draft.business[key].value;
    return (v !== null && v !== undefined && v !== "") ? v : null;
  };
  const draftFieldConfidence = (key) => {
    const conf = draft?.confidence?.business?.[key];
    return conf !== undefined ? Math.round(conf * 100) : 0;
  };

  // Legacy fallback: read from analysis.fields
  const f = analysisLegacy?.fields || {};
  const legacyFieldStatus = (key) => f[key]?.status || FIELD_STATUS.NOT_FOUND;
  const legacyFieldValue = (key) => {
    const item = f[key];
    if (!item) return null;
    if (item.userCorrectedValue !== null && item.userCorrectedValue !== undefined && item.userCorrectedValue !== "") return item.userCorrectedValue;
    if (item.normalizedValue !== null && item.normalizedValue !== undefined && item.normalizedValue !== "") return item.normalizedValue;
    return null;
  };
  const legacyFieldConfidence = (key) => Math.round((f[key]?.confidence || 0) * 100);

  // Unified field accessors ? prefer DraftBusinessModel
  const fieldStatus = (key) => draftMode ? draftFieldState(key) : legacyFieldStatus(key);
  const fieldValue = (key) => draftMode ? draftFieldValue(key) : legacyFieldValue(key);
  const fieldConfidence = (key) => draftMode ? draftFieldConfidence(key) : legacyFieldConfidence(key);

  const bs = analysisLegacy?.businessSummary || {};
  const pattern = analysisLegacy?.detectedPattern || { type: "Unconfirmed", confidence: 0 };
  const rules = analysisLegacy?.businessRules || [];
  const schedule = draftMode ? (draft.schedule || []) : (analysisLegacy?.schedule || []);
  const missing = analysisLegacy?.missingInformation || [];

  const sections = [
    { id: "core", label: "Core Fields", icon: Edit3 },
    { id: "schedule", label: "Month Schedule", icon: Calendar },
    { id: "summary", label: "Business Summary", icon: Info },
    { id: "details", label: "All Fields", icon: List },
    { id: "financialRules", label: "Financial Rules", icon: DollarSign },
    { id: "missing", label: "Missing Info", icon: HelpCircle },
    { id: "pattern", label: "Detected Pattern", icon: Sliders },
  ];

  // Update a single business field
  const updateField = (key, value) => {
    if (draftMode) {
      const result = applyOwnerCorrections(draft, { business: { [key]: value } });
      setDraft(result.draft);
      setValidation(result.validation);
      update({ validation: result.validation });
    } else {
      // Legacy fallback
      if (!analysisLegacy) return;
      const hasValue = value !== null && value !== undefined && value !== "";
      setDraft({
        ...analysisLegacy,
        fields: {
          ...analysisLegacy.fields,
          [key]: {
            ...(analysisLegacy.fields[key] || {}),
            userCorrectedValue: hasValue ? value : null,
            normalizedValue: hasValue ? value : null,
            status: hasValue ? "OWNER_DEFINED" : "NOT_FOUND",
            confidence: hasValue ? 1 : 0,
          }
        }
      });
    }
  };

  // Update schedule cell
  const updateScheduleCell = (index, field, value) => {
    const hasValue = value !== null && value !== undefined && value !== "";
    if (draftMode) {
      const nextSchedule = draft.schedule.map((row, i) =>
        i === index ? { ...row, [field]: hasValue ? Number(value) : null, isOwnerEdited: true } : row
      );
      const result = applyOwnerCorrections(draft, { schedule: nextSchedule });
      setDraft(result.draft);
      setValidation(result.validation);
      update({ validation: result.validation });
    } else {
      // Legacy fallback
      if (!analysisLegacy) return;
      const next = (analysisLegacy.schedule || []).map((row, i) =>
        i === index ? { ...row, [field]: hasValue ? Number(value) : null, isOwnerEdited: true } : row
      );
      setDraft({
        ...analysisLegacy,
        schedule: next,
        userCorrections: [...(analysisLegacy.userCorrections || []), { at: new Date().toISOString(), schedule: { index, field, value: hasValue ? Number(value) : null } }],
      });
    }
  };

  const replaceSchedule = (nextSchedule) => {
    if (!draftMode) return;
    const result = applyOwnerCorrections(draft, { schedule: nextSchedule });
    setDraft(result.draft);
    setValidation(result.validation);
    update({ validation: result.validation });
  };

  const addMissingScheduleRow = () => {
    const usedMonths = new Set(schedule.map((row) => Number(row.monthNumber)).filter(Number.isFinite));
    let monthNumber = 1;
    while (usedMonths.has(monthNumber)) monthNumber += 1;
    replaceSchedule([...schedule, {
      monthNumber,
      standardPayment: null,
      nonLiftedPayment: null,
      liftedPayment: null,
      prizeAmount: null,
      bidAmount: null,
      commissionValue: null,
      deposit: null,
      dividendPerMember: null,
      penalty: null,
      otherDeductions: null,
      netAmount: null,
      confidence: 0,
      evidence: "Owner-added missing row",
    }]);
  };

  const deleteDuplicateScheduleRows = () => {
    const seen = new Set();
    replaceSchedule(schedule.filter((row, index) => {
      const monthNumber = Number(row.monthNumber || index + 1);
      if (seen.has(monthNumber)) return false;
      seen.add(monthNumber);
      return true;
    }));
  };

  // Toggle rule confirmation
  const toggleRule = (ruleKey, confirmed) => {
    if (draftMode) {
      const result = applyOwnerCorrections(draft, { rules: [{ key: ruleKey, confirmed }] });
      setDraft(result.draft);
      setValidation(result.validation);
      update({ validation: result.validation });
    } else {
      // Legacy fallback
      if (!analysisLegacy) return;
      const nextRules = (analysisLegacy.businessRules || []).map((r) =>
        r.key === ruleKey
          ? { ...r, status: confirmed ? "OWNER_CONFIRMED" : "FOUND", ownerConfirmed: confirmed, confidence: confirmed ? 1 : r.confidence }
          : r
      );
      setDraft({
        ...analysisLegacy,
        businessRules: nextRules,
        auditHistory: [...(analysisLegacy.auditHistory || []), { action: "RULE_TOGGLED", details: { ruleKey, confirmed }, at: new Date().toISOString() }],
      });
    }
  };

  const setFieldAsOwnerDefined = (key, value) => {
    if (key === null || key === undefined) return;
    updateField(key, value);
  };

  // Validation-based create gate
  // Always validate the current DraftBusinessModel. Persisted results may be
  // stale and must never become an authorization token for creation.
  const currentValidation = validateDraft(draft);
  const dslMapping = mapDraftToBusinessDSL(draft);
  const simulation = dslMapping.status === BUSINESS_DSL_STATUS.SUCCESS
    ? simulateBusinessDSL(dslMapping.model)
    : { status: SIMULATION_STATUS.FAIL, warnings: [], errors: dslMapping.unsupportedRules };
  const creationReadiness = evaluateCreationReadiness(draft, { ownerApproved: Boolean(state.confirmed) });
  const canCreate = creationReadiness.ready;
  const invalidBusinessFields = new Set(
    [
      ...currentValidation.missingFields.filter((field) => draft?.business?.[field]),
      ...Object.keys(draft?.business || {}).filter((field) =>
        currentValidation.errors.some((errorItem) => errorItem.startsWith(`business.${field}`))
      ),
    ]
  );
  const scheduleErrors = currentValidation.errors.filter((item) => item.startsWith("schedule["));

  const saveDraft = async () => {
    if (!draftMode) {
      setError("A DraftBusinessModel is required. Please re-upload the document.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveBusinessUnderstandingDraft(draft, context);
      update({ savedExtractionId: saved.id, draftSaveStatus: saved.status });
    } catch (e) {
      setError(e.message || "Draft save failed. Retry after checking your connection.");
    } finally {
      setSaving(false);
    }
  };

  const confirmAndCreate = async () => {
    if (!state.confirmed) { setError("Owner confirmation is required."); return; }
    setSaving(true);
    setError("");
    try {
      if (!draftMode) {
        setError("A DraftBusinessModel is required. Please re-upload the document.");
        return;
      }
      const freshValidation = validateDraft(draft);
      if (freshValidation.status !== VALIDATION_STATUS.VALID) {
        setValidation(freshValidation);
        update({ validation: freshValidation });
        setError(`Creation blocked: validation status is ${freshValidation.status}.`);
        return;
      }
      const freshMapping = mapDraftToBusinessDSL(draft);
      if (freshMapping.status !== BUSINESS_DSL_STATUS.SUCCESS) {
        setError("Creation blocked: Business DSL mapping did not succeed.");
        return;
      }
      const freshSimulation = simulateBusinessDSL(freshMapping.model);
      if (freshSimulation.status !== SIMULATION_STATUS.PASS) {
        setError("Creation blocked: simulation did not pass.");
        return;
      }
      const readiness = evaluateCreationReadiness(draft, { ownerApproved: true });
      if (!readiness.ready) {
        setError("Creation blocked: rule engine or immutable ledger is not ready.");
        return;
      }
      const { draft: confirmedDraft } = confirmBusinessUnderstanding(draft);
      const created = await createChitFromBusinessUnderstanding(confirmedDraft, context, { saveTemplate: true });
      update({ draft: confirmedDraft, created });
      go("success");
    } catch (e) {
      setError(e.message || "Chit creation failed. The draft was not committed.");
    } finally {
      setSaving(false);
    }
  };

  // Validation summary for display
  const validationTone = currentValidation.status === VALIDATION_STATUS.VALID
    ? "valid"
    : currentValidation.status === VALIDATION_STATUS.INVALID
      ? "invalid"
      : currentValidation.status === VALIDATION_STATUS.UNSUPPORTED_PATTERN
        ? "unsupported"
        : "needs-review";

  return (
    <div className="bw-shell">
      {state.reviewState && state.reviewState !== "ready_for_review" && (
        <div className={`bw-confidence-review ${state.reviewState}`} role="status">
          <AlertTriangle size={20} />
          <div>
            <strong>
              {state.reviewState === "low_confidence"
                ? "Some extracted fields need review"
                : "Manual confirmation is required"}
            </strong>
            <small>
              Extraction confidence: {Math.round((state.extractionConfidence || 0) * 100)}%.
              Check highlighted or missing values before owner approval.
            </small>
          </div>
        </div>
      )}
      {/* Section navigation ? Schedule is first */}
      <nav className="bw-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`bw-nav-btn ${activeSection === s.id ? "active" : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            <s.icon size={16} />
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="bw-content">
        {/* Validation status banner */}
        <div className={`bw-validation-banner ${validationTone}`} data-validation-status={currentValidation.status}>
            <div className="bw-validation-icon">
              {currentValidation.status === VALIDATION_STATUS.VALID ? <Check size={16} /> : <AlertTriangle size={16} />}
            </div>
            <div className="bw-validation-text">
              <strong>{currentValidation.status}</strong>
              <small>{validationMessage(currentValidation)}</small>
            </div>
          </div>

        {/* 0. CORE FIELDS ? Primary editable section */}
        {activeSection === "core" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><Edit3 size={20} /> Core Business Fields</h2>
            <p className="bw-card-desc">Enter the 5 essential chit details. Validation re-runs automatically as you type. Blank values remain null ? never defaulted to 0.</p>
            <div className="bw-detail-fields">
              {draftMode ? (
                <>
                  {EDITABLE_BUSINESS_FIELDS.map((key) => {
                    const item = draft?.business?.[key];
                    if (!item) return null;
                    const isInvalid = invalidBusinessFields.has(key);
                    const isUncertain = Number(draft?.confidence?.business?.[key] || 0) < 0.88;
                    const isNumber = [
                      "chitValue", "duration", "memberCount", "grossInstallment",
                      "foremanCommissionPercent", "minimumDiscountPercent",
                      "maximumDiscountPercent", "prizeAmount",
                    ].includes(key);
                    return (
                      <label key={key} className={`bw-detail-field ${isInvalid ? "bw-invalid-field" : ""} ${isUncertain ? "bw-uncertain-field" : ""}`}>
                        <span>
                          {humanizeLabel(key)}
                          <span className={`bw-detail-status ${item.state === VALUE_STATE.NOT_FOUND ? "missing" : "has"}`}>
                            {item.state === VALUE_STATE.NOT_FOUND ? "NOT_FOUND" : item.state}
                          </span>
                        </span>
                        {key === "installmentPattern" ? (
                          <select
                            value={item.value || ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            style={{ minHeight: "40px", padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", background: "#fff" }}
                          >
                            <option value="">? Select pattern ?</option>
                            <option value="FIXED_MONTHLY">Fixed Monthly</option>
                            <option value="VARIABLE_MONTHLY">Variable Monthly</option>
                            <option value="LIFTED_NON_LIFTED">Lifted / Non-Lifted</option>
                            <option value="CUSTOM_RULE">Custom Rule</option>
                          </select>
                        ) : key === "installmentMode" ? (
                          <select
                            value={item.value || ""}
                            onChange={(e) => updateField(key, e.target.value)}
                          >
                            <option value="">? Select mode ?</option>
                            <option value="FIXED">Fixed</option>
                            <option value="VARIABLE">Variable</option>
                            <option value="LIFTED_NON_LIFTED">Lifted / Non-Lifted</option>
                            <option value="CUSTOM">Organizer-defined / Custom</option>
                          </select>
                        ) : (
                          <input
                            type={key === "startDate" ? "date" : isNumber ? "number" : "text"}
                            value={item.value !== null && item.value !== undefined && item.value !== "" ? item.value : ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            placeholder={item.state === VALUE_STATE.NOT_FOUND ? "Not mentioned in document" : ""}
                            aria-invalid={isInvalid}
                            min={isNumber ? "1" : undefined}
                          />
                        )}
                        <small>
                          {draft?.evidence?.business?.[key] || "Extracted from document"} ? {Math.round((draft?.confidence?.business?.[key] || 0) * 100)}% confidence
                        </small>
                      </label>
                    );
                  })}
                </>
              ) : (
                <>
                  {["chitName", "chitValue", "duration", "memberCount", "installmentPattern"].map((key) => {
                    const val = fieldValue(key);
                    const st = fieldStatus(key);
                    const conf = fieldConfidence(key);
                    const isNumber = ["chitValue", "duration", "memberCount"].includes(key);
                    return (
                      <label key={key} className="bw-detail-field">
                        <span>
                          {humanizeLabel(key)}
                          <span className={`bw-detail-status ${st === FIELD_STATUS.NOT_FOUND ? "missing" : "has"}`}>
                            {st === FIELD_STATUS.NOT_FOUND ? "NOT_FOUND" : st}
                          </span>
                        </span>
                        <input
                          type={isNumber ? "number" : "text"}
                          value={val !== null && val !== undefined && val !== "" ? val : ""}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={st === FIELD_STATUS.NOT_FOUND ? "Not mentioned in document" : ""}
                          min={isNumber ? "1" : undefined}
                        />
                        <small>{conf}% confidence</small>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
            {/* Quick validation summary for core fields */}
            {currentValidation.errors.filter((e) => e.startsWith("business.")).length > 0 && (
              <div className="bw-validation-errors" style={{ marginTop: "12px" }}>
                <strong style={{ fontSize: "11px", color: "#a91f31", display: "block", marginBottom: "6px" }}>Core field issues:</strong>
                {currentValidation.errors.filter((e) => e.startsWith("business.")).map((err, i) => (
                  <div key={i} className="bw-validation-error-item">
                    <AlertTriangle size={12} />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1. MONTH-WISE SCHEDULE ? Primary Section */}
        {activeSection === "schedule" && (
          <div className="bw-card bw-card-wide">
            <h2 className="bw-card-title"><Calendar size={20} /> Month-wise Operational Schedule</h2>
            <p className="bw-card-desc">Every detected month is editable. Blank cells mean the value was not found in the document. Enter values where you have them.</p>
            <div className="bw-schedule-actions">
              <button type="button" onClick={addMissingScheduleRow}>Add missing row</button>
              <button type="button" onClick={deleteDuplicateScheduleRows}>Delete duplicate row</button>
            </div>
            {schedule.length === 0 && (
              <div className="bw-empty-state">No schedule data extracted from the document.</div>
            )}
            {schedule.length > 0 && (
              <div className="bw-schedule-wrap">
                <table className="bw-schedule-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Member Payable</th>
                      <th>Non-lift Payable</th>
                      <th>Lift Payable</th>
                      <th>Prize Amount</th>
                      <th>Commission</th>
                      <th>Deposit</th>
                      <th>Dividend</th>
                      <th>Penalty</th>
                      <th>Bid Amount</th>
                      <th>Other Ded.</th>
                      <th>Net Amount</th>
                      <th>Confidence</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row, i) => (
                      <tr key={i} className={`${confidenceStatus(row.confidence, row.status).toLowerCase()} ${scheduleErrors.some((item) => item.startsWith(`schedule[${i}]`)) ? "bw-invalid-row" : ""}`}>
                        <td className={`bw-month-cell ${scheduleErrors.some((item) => item.startsWith(`schedule[${i}].monthNumber`)) ? "bw-invalid-field" : ""}`}>{row.monthNumber || i + 1}</td>
                        <td>
                          <input
                            type="number"
                            value={row.standardPayment !== null && row.standardPayment !== undefined ? row.standardPayment : ""}
                            onChange={(e) => updateScheduleCell(i, "standardPayment", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.nonLiftedPayment !== null && row.nonLiftedPayment !== undefined ? row.nonLiftedPayment : ""}
                            onChange={(e) => updateScheduleCell(i, "nonLiftedPayment", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.liftedPayment !== null && row.liftedPayment !== undefined ? row.liftedPayment : ""}
                            onChange={(e) => updateScheduleCell(i, "liftedPayment", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.prizeAmount !== null && row.prizeAmount !== undefined ? row.prizeAmount : ""}
                            onChange={(e) => updateScheduleCell(i, "prizeAmount", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.commissionValue !== null && row.commissionValue !== undefined ? row.commissionValue : ""}
                            onChange={(e) => updateScheduleCell(i, "commissionValue", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.deposit !== null && row.deposit !== undefined ? row.deposit : ""}
                            onChange={(e) => updateScheduleCell(i, "deposit", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.dividendPerMember !== null && row.dividendPerMember !== undefined ? row.dividendPerMember : ""}
                            onChange={(e) => updateScheduleCell(i, "dividendPerMember", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.penalty !== null && row.penalty !== undefined ? row.penalty : ""}
                            onChange={(e) => updateScheduleCell(i, "penalty", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.bidAmount !== null && row.bidAmount !== undefined ? row.bidAmount : ""}
                            onChange={(e) => updateScheduleCell(i, "bidAmount", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.otherDeductions !== null && row.otherDeductions !== undefined ? row.otherDeductions : ""}
                            onChange={(e) => updateScheduleCell(i, "otherDeductions", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={row.netAmount !== null && row.netAmount !== undefined ? row.netAmount : ""}
                            onChange={(e) => updateScheduleCell(i, "netAmount", e.target.value)}
                            placeholder="?"
                          />
                        </td>
                        <td>{Math.round((row.confidence || 0) * 100)}%</td>
                        <td>
                          <input value={row.evidence || ""} onChange={(e) => updateScheduleCell(i, "evidence", e.target.value)} placeholder="Notes" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Business Summary */}
        {activeSection === "summary" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><Info size={20} /> Business Summary</h2>
            <p className="bw-card-desc">Values extracted from document. Blanks mean the field was not mentioned. No value is invented.</p>
            <div className="bw-summary-grid">
              <SummaryField label="Chit Name" value={fieldValue("chitName") || bs.chitName} status={fieldStatus("chitName")} confidence={fieldConfidence("chitName")} />
              <SummaryField label="Chit Value" value={fieldValue("chitValue")} status={fieldStatus("chitValue")} confidence={fieldConfidence("chitValue")} format="money" />
              <SummaryField label="Members" value={fieldValue("memberCount")} status={fieldStatus("memberCount")} confidence={fieldConfidence("memberCount")} />
              <SummaryField label="Duration" value={fieldValue("duration")} status={fieldStatus("duration")} confidence={fieldConfidence("duration")} suffix=" months" />
              <SummaryField label="Monthly Payment" value={fieldValue("monthlyPayment")} status={fieldStatus("monthlyPayment")} confidence={fieldConfidence("monthlyPayment")} format="money" />
              <SummaryField label="Commission" value={fieldValue("commission")} status={fieldStatus("commission")} confidence={fieldConfidence("commission")} suffix="%" />
              <SummaryField label="Deposit" value={fieldValue("deposit")} status={fieldStatus("deposit")} confidence={fieldConfidence("deposit")} format="money" />
              <SummaryField label="Dividend" value={fieldValue("dividend")} status={fieldStatus("dividend")} confidence={fieldConfidence("dividend")} format="money" />
              <SummaryField label="Penalty" value={fieldValue("penalty")} status={fieldStatus("penalty")} confidence={fieldConfidence("penalty")} format="money" />
              <SummaryField label="Start Date" value={fieldValue("startDate")} status={fieldStatus("startDate")} confidence={fieldConfidence("startDate")} />
              <SummaryField label="Schedule rows" value={schedule.length} status={schedule.length > 0 ? FIELD_STATUS.FOUND : FIELD_STATUS.NOT_FOUND} confidence={1} />
              <SummaryField label="Document type" value={analysisLegacy?.documentType || draft?.extractionMetadata?.sourceDocument?.documentType || "Unknown"} status={FIELD_STATUS.FOUND} confidence={1} />
              <SummaryField label="Rules detected" value={rules.filter((r) => r.status !== "NOT_FOUND" && r.status !== "NOT_DETECTED").length} status={FIELD_STATUS.FOUND} confidence={1} />
            </div>
          </div>
        )}

        {/* 3. Business Details */}
        {activeSection === "details" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><Edit3 size={20} /> Business Details</h2>
            <p className="bw-card-desc">Every value comes from the document. Blank = not mentioned. Enter values only when you have them.</p>
            <div className="bw-detail-fields">
              {draftMode
                ? Object.entries(draft.business).map(([key, item]) => (
                    <label key={key} className={`bw-detail-field ${invalidBusinessFields.has(key) ? "bw-invalid-field" : ""} ${Number(draft.confidence?.business?.[key] || 0) < 0.88 ? "bw-uncertain-field" : ""}`}>
                      <span>
                        {humanizeLabel(key)}
                        <span className={`bw-detail-status ${item.state === VALUE_STATE.NOT_FOUND ? "missing" : "has"}`}>
                          {item.state === VALUE_STATE.NOT_FOUND ? "NOT_FOUND" : item.state}
                        </span>
                      </span>
                      <input
                        value={item.value !== null && item.value !== undefined && item.value !== "" ? item.value : ""}
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={item.state === VALUE_STATE.NOT_FOUND ? "Not mentioned in document" : ""}
                        aria-invalid={invalidBusinessFields.has(key)}
                      />
                      <small>
                        {draft.evidence?.business?.[key] || "Extracted from document"} ? {Math.round((draft.confidence?.business?.[key] || 0) * 100)}% confidence
                      </small>
                    </label>
                  ))
                : Object.entries(analysisLegacy?.fields || {}).map(([key, item]) => (
                    <label key={key} className="bw-detail-field">
                      <span>
                        {humanizeLabel(key)}
                        <span className={`bw-detail-status ${item.status === FIELD_STATUS.NOT_FOUND ? "missing" : "has"}`}>
                          {item.status === FIELD_STATUS.NOT_FOUND ? "NOT_FOUND" : item.status}
                        </span>
                      </span>
                      <input
                        value={item.userCorrectedValue !== null && item.userCorrectedValue !== undefined && item.userCorrectedValue !== ""
                          ? item.userCorrectedValue
                          : item.normalizedValue !== null && item.normalizedValue !== undefined && item.normalizedValue !== ""
                            ? item.normalizedValue
                            : ""
                        }
                        onChange={(e) => updateField(key, e.target.value)}
                        placeholder={item.status === FIELD_STATUS.NOT_FOUND ? "Not mentioned in document" : ""}
                      />
                      <small>{item.evidence} ? {Math.round(item.confidence * 100)}% confidence</small>
                    </label>
                  ))
              }
            </div>
          </div>
        )}

        {/* 4. Financial Rules ? Three-state support */}
        {activeSection === "financialRules" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><DollarSign size={20} /> Financial Rules</h2>
            <p className="bw-card-desc">Each financial rule has three states: <strong>Document value (FOUND)</strong>, <strong>Not mentioned (NOT_FOUND)</strong>, or <strong>Owner decides later</strong>. No values are fabricated.</p>
            <div className="bw-financial-rules-list">
              {createFinancialRulesConfig(draft).map((rule) => {
                const fpState = draft?.financialPrimitives?.[rule.fieldKey]?.state || VALUE_STATE.NOT_FOUND;
                const fpValue = draft?.financialPrimitives?.[rule.fieldKey]?.value ?? null;
                const fpConfidence = draft?.confidence?.financialPrimitives?.[rule.fieldKey] ?? 0;
                const isRuleBased = rule.isRule;
                const ruleItem = isRuleBased
                  ? draft?.rules?.detected?.find((r) => r.key === rule.key) || draft?.rules?.notDetected?.find((r) => r.key === rule.key)
                  : null;
                const ruleItemStatus = ruleItem?.state;
                const ruleItemConfirmed = ruleItem?.ownerConfirmed;

                return (
                  <FinancialRuleCard
                    key={rule.key}
                    rule={rule}
                    isRule={isRuleBased}
                    ruleStatus={ruleItemStatus}
                    ruleConfirmed={ruleItemConfirmed}
                    fieldValue={isRuleBased ? null : fpValue}
                    fieldConfidence={isRuleBased ? Math.round((ruleItem?.confidence || 0) * 100) : Math.round(fpConfidence * 100)}
                    fieldStatus={isRuleBased ? (ruleItemStatus || VALUE_STATE.NOT_FOUND) : fpState}
                    onSetValue={(value) => updateField(rule.fieldKey, value)}
                    onClearValue={() => updateField(rule.fieldKey, null)}
                    onToggleRule={(confirmed) => toggleRule(rule.key, confirmed)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Missing Information */}
        {activeSection === "missing" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><HelpCircle size={20} /> Missing Information</h2>
            <p className="bw-card-desc">These fields were not found in the document. They remain blank until you enter them.</p>
            {missing.length === 0 && !draftMode && (
              <div className="bw-empty-state">
                <Check size={24} />
                <p>No missing information detected. All fields have values.</p>
              </div>
            )}
            {draftMode && (
              <>
                {Object.entries(draft.business).filter(([, item]) => item.state === VALUE_STATE.NOT_FOUND).length === 0 && (
                  <div className="bw-empty-state">
                    <Check size={24} />
                    <p>No missing information detected. All fields have values.</p>
                  </div>
                )}
                <div className="bw-missing-list">
                  {Object.entries(draft.business)
                    .filter(([, item]) => item.state === VALUE_STATE.NOT_FOUND)
                    .map(([key, item]) => (
                      <div key={key} className="bw-missing-item">
                        <AlertTriangle size={16} />
                        <span>{humanizeLabel(key)}</span>
                        <input
                          placeholder={`Enter ${humanizeLabel(key)} (blank = not provided)`}
                          value={item.value ?? ""}
                          onChange={(e) => updateField(key, e.target.value)}
                        />
                      </div>
                    ))}
                </div>
              </>
            )}
            {!draftMode && missing.length > 0 && (
              <div className="bw-missing-list">
                {missing.map((key) => (
                  <div key={key} className="bw-missing-item">
                    <AlertTriangle size={16} />
                    <span>{humanizeLabel(key)}</span>
                    <input
                      placeholder={`Enter ${humanizeLabel(key)} (blank = not provided)`}
                      value={analysisLegacy?.fields?.[key]?.userCorrectedValue ?? analysisLegacy?.fields?.[key]?.normalizedValue ?? ""}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. Detected Pattern */}
        {activeSection === "pattern" && (
          <div className="bw-card">
            <h2 className="bw-card-title"><Sliders size={20} /> Detected Business Pattern</h2>
            <div className="bw-pattern-header">
              <span className={`bw-pattern-badge ${pattern.confidence >= 0.7 ? "high" : pattern.confidence >= 0.4 ? "mid" : "low"}`}>
                {pattern.type}
              </span>
              <span className="bw-confidence">{Math.round(pattern.confidence * 100)}% confidence</span>
            </div>
            <p className="bw-pattern-note">This pattern is inferred from the document. No business assumption is hardcoded. You can edit any value below.</p>
            <div className="bw-rule-mini-list">
              {(draft?.rules?.detected || rules.filter((r) => r.status !== "NOT_FOUND" && r.status !== "NOT_DETECTED")).map((r) => (
                <div key={r.key} className={`bw-rule-mini ${r.ownerConfirmed ? "confirmed" : ""}`}>
                  <span className={`bw-rule-dot ${(r.state || r.status || "").toLowerCase().replace("_", "")}`} />
                  <span className="bw-rule-label">{r.label}</span>
                  <span className="bw-rule-conf">{Math.round(r.confidence * 100)}%</span>
                  {r.ownerConfirmed && <Check size={14} className="bw-rule-check" />}
                </div>
              ))}
            </div>
            <h3 style={{ margin: "16px 0 8px", fontSize: "13px" }}>All Business Rules</h3>
            <div className="bw-rules-list">
              {(draft?.rules?.detected || rules).map((rule) => (
                <article key={rule.key} className={`bw-rule-card ${rule.ownerConfirmed ? "confirmed" : ""} ${(rule.state || rule.status || "").toLowerCase()}`}>
                  <header>
                    <span className="bw-rule-badge">{rule.state || rule.status}</span>
                    <span className="bw-rule-conf">{Math.round(rule.confidence * 100)}% confidence</span>
                  </header>
                  <h4>{rule.label}</h4>
                  <p className="bw-rule-evidence">{(Array.isArray(rule.evidence) ? rule.evidence.join("; ") : rule.evidence) || "Detected in document"}</p>
                  <div className="bw-rule-actions">
                    <button
                      className={`bw-rule-btn ${rule.ownerConfirmed ? "active" : ""}`}
                      onClick={() => toggleRule(rule.key, !rule.ownerConfirmed)}
                    >
                      {rule.ownerConfirmed ? <><Check size={14} /> Confirmed</> : "Confirm"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Owner Approval */}
        <div className="bw-card bw-approval-card">
          <h2 className="bw-card-title"><ShieldCheck size={20} /> Owner Approval</h2>
          <p className="bw-card-desc">Review all values before generating the Financial Rule Model. Blank values will remain unset until you provide them.</p>

          <div className="bw-approval-pipeline" aria-label="Creation approval pipeline">
            <div data-pipeline-step="draft" data-status={currentValidation.status}><span>Draft</span><strong>{currentValidation.status}</strong></div>
            <div data-pipeline-step="dsl" data-status={dslMapping.status}><span>Mapped DSL</span><strong>{dslMapping.status}</strong></div>
            <div data-pipeline-step="simulation" data-status={simulation.status}><span>Simulation</span><strong>{simulation.status}</strong></div>
            <div data-pipeline-step="owner" data-status={state.confirmed ? "APPROVED" : "PENDING"}><span>Owner Approval</span><strong>{state.confirmed ? "APPROVED" : "PENDING"}</strong></div>
            <div data-pipeline-step="rules" data-status={creationReadiness.ruleEngineStatus}><span>Rule Engine</span><strong>{creationReadiness.ruleEngineStatus}</strong></div>
            <div data-pipeline-step="ledger" data-status={creationReadiness.ledgerStatus}><span>Ledger</span><strong>{creationReadiness.ledgerStatus}</strong></div>
          </div>

          {dslMapping.status === BUSINESS_DSL_STATUS.SUCCESS && (
            <div className="bw-dsl-preview" data-dsl-status={dslMapping.status}>
              <strong>Mapped Business DSL</strong>
              <small>{Object.keys(dslMapping.model).join(" ? ")}</small>
            </div>
          )}

          <div className={`bw-simulation-preview ${simulation.status.toLowerCase()}`} data-simulation-status={simulation.status}>
            <strong>Simulation {simulation.status}</strong>
            {simulation.status === SIMULATION_STATUS.PASS ? (
              <small>Collections {money(simulation.totals.monthlyCollections)} ? Prize {money(simulation.prizeAmount)} ? Owner profit {money(simulation.ownerProfit)}</small>
            ) : (
              <small>{simulation.errors?.[0] || "Simulation cannot run until DSL mapping succeeds."}</small>
            )}
          </div>

          {/* Validation errors display */}
          {currentValidation?.errors?.length > 0 && (
            <div className="bw-validation-errors">
              <strong style={{ fontSize: "11px", color: "#a91f31", display: "block", marginBottom: "6px" }}>Required fields to complete:</strong>
              {currentValidation.errors.map((err, i) => (
                <div key={i} className="bw-validation-error-item">
                  <AlertTriangle size={12} />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {currentValidation?.warnings?.length > 0 && (
            <div className="bw-validation-warnings" style={{ marginTop: currentValidation?.errors?.length > 0 ? "8px" : 0 }}>
              <strong style={{ fontSize: "11px", color: "#8a5707", display: "block", marginBottom: "6px" }}>Items requiring your decision:</strong>
              {currentValidation.warnings.map((warn, i) => (
                <div key={i} className="bw-validation-warning-item">
                  <HelpCircle size={12} />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {currentValidation?.missingFields?.length > 0 && (
            <div className="bw-validation-missing">
              <strong>Missing Fields</strong>
              <ul>{currentValidation.missingFields.map((field) => <li key={field}>{humanizeLabel(field)}</li>)}</ul>
            </div>
          )}

          {currentValidation?.unsupportedRules?.length > 0 && (
            <div className="bw-validation-unsupported">
              <strong>Unsupported Pattern</strong>
              <ul>{currentValidation.unsupportedRules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </div>
          )}

          <label className="bw-confirm">
            <input type="checkbox" checked={Boolean(state.confirmed)} onChange={(e) => update({ confirmed: e.target.checked })} />
            <span>
              <strong>I have reviewed the business understanding and confirm it is correct.</strong>
              <small>No fabricated values will be created. Blank values remain null in the ERP model.</small>
            </span>
          </label>
          <button
            className="bw-save-draft-btn"
            type="button"
            disabled={saving}
            onClick={saveDraft}
          >
            <FileText size={18} /> {saving ? "Saving?" : "Save Draft"}
          </button>
          {state.draftSaveStatus && (
            <small className="bw-save-status" role="status">
              Draft status: {state.draftSaveStatus}
            </small>
          )}
          {error && <Notice tone="danger"><AlertTriangle />{error}</Notice>}
          <button
            className="bw-create-btn"
            disabled={!canCreate || saving}
            onClick={confirmAndCreate}
            title={!canCreate ? `Creation requires VALID status (current: ${currentValidation.status})` : ""}
          >
            <ShieldCheck size={18} /> {currentValidation.status === VALIDATION_STATUS.VALID ? "Confirm & Create Chit Group" : "Validation Required Before Creation"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Financial Rule Card ? displays one of Commission, Deposit, Dividend, Penalty,
 * Bid Rule, Prize Rule, Lift Rule with three-state support.
 */
function FinancialRuleCard({ rule, fieldValue, fieldConfidence, fieldStatus, isRule, ruleStatus, ruleConfirmed, onSetValue, onClearValue, onToggleRule }) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : "");

  // For rule-based items (Bid, Prize, Lift), derive state from the business rule
  const effectiveStatus = isRule ? (ruleStatus || VALUE_STATE.NOT_FOUND) : fieldStatus;
  const effectiveValue = isRule ? (ruleConfirmed ? "Confirmed" : null) : fieldValue;
  const effectiveConfidence = isRule ? Math.round((fieldConfidence || 0)) : fieldConfidence;

  const stateLabel = effectiveStatus === VALUE_STATE.FOUND ? "FOUND ? Document Value"
    : effectiveStatus === VALUE_STATE.OWNER_DEFINED || ruleConfirmed ? "OWNER_DEFINED"
    : "NOT_FOUND ? Not Mentioned";

  const stateClass = effectiveStatus === VALUE_STATE.FOUND ? "found"
    : effectiveStatus === VALUE_STATE.OWNER_DEFINED || ruleConfirmed ? "owner-defined"
    : "not-found";

  const handleSave = () => {
    if (isRule) {
      onToggleRule?.(true);
    } else {
      const val = inputValue.trim();
      if (val !== "") onSetValue(val);
      else onClearValue();
    }
    setEditing(false);
  };

  const handleClear = () => {
    if (isRule) {
      onToggleRule?.(false);
    } else {
      setInputValue("");
      onClearValue();
    }
    setEditing(false);
  };

  const handleDecideLater = () => {
    if (isRule) {
      onToggleRule?.(false);
    } else {
      onClearValue();
    }
    setEditing(false);
  };

  return (
    <article className={`bw-financial-rule-card ${stateClass}`}>
      <header>
        <span className="bw-financial-rule-icon">{rule.icon}</span>
        <div className="bw-financial-rule-title">
          <h4>{rule.label}</h4>
          <span className={`bw-financial-rule-state ${stateClass}`}>
            {stateLabel}
          </span>
        </div>
        <span className="bw-financial-rule-confidence">
          {effectiveConfidence}%
        </span>
      </header>

      {editing ? (
        <div className="bw-financial-rule-edit">
          {!isRule && (
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={rule.placeholder}
              autoFocus
            />
          )}
          {isRule && (
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Toggle this rule as confirmed or not mentioned.
            </p>
          )}
          <div className="bw-financial-rule-edit-actions">
            <button className="bw-fr-btn primary" onClick={handleSave}>
              <Check size={14} /> {isRule ? "Confirm Rule" : "Set Value"}
            </button>
            <button className="bw-fr-btn" onClick={handleClear}>
              <X size={14} /> Clear
            </button>
            <button className="bw-fr-btn" onClick={handleDecideLater}>
              <FileQuestion size={14} /> Decide Later
            </button>
          </div>
        </div>
      ) : (
        <div className="bw-financial-rule-display">
          {effectiveValue !== null && effectiveValue !== undefined ? (
            <span className="bw-financial-rule-value">
              {isRule ? effectiveValue : rule.format === "money" ? money(effectiveValue) : rule.format === "percent" ? `${effectiveValue}%` : effectiveValue}
            </span>
          ) : (
            <span className="bw-financial-rule-empty">
              {effectiveStatus === VALUE_STATE.NOT_FOUND ? "Not mentioned in document" : "No value set"}
            </span>
          )}
          <button className="bw-fr-edit-btn" onClick={() => { setEditing(true); setInputValue(effectiveValue !== null && effectiveValue !== undefined ? String(effectiveValue) : ""); }}>
            <Edit3 size={14} /> {isRule ? "Review" : "Edit"}
          </button>
        </div>
      )}
    </article>
  );
}

/**
 * Creates the config for the Financial Rules section.
 * Commission, Deposit, Dividend, Penalty, Bid Rule, Prize Rule, Lift Rule.
 */
function createFinancialRulesConfig(draft) {
  const rules = draft?.rules?.detected || [];
  const schedule = Array.isArray(draft?.schedule) ? draft.schedule : [];

  const ruleConfigs = [
    { key: "hasCommission", label: "Commission", fieldKey: "commission", icon: <DollarSign size={18} />, format: "percent", placeholder: "Enter commission %", desc: "Foreman / organizer commission" },
    { key: "hasDeposit", label: "Deposit / Security", fieldKey: "deposit", icon: <ShieldCheck size={18} />, format: "money", placeholder: "Enter deposit amount", desc: "Security deposit amount" },
    { key: "hasDividend", label: "Dividend / Profit Share", fieldKey: "dividend", icon: <DollarSign size={18} />, format: "money", placeholder: "Enter dividend amount", desc: "Dividend per member or total" },
    { key: "hasPenalty", label: "Penalty / Late Fee", fieldKey: "penalty", icon: <AlertTriangle size={18} />, format: "money", placeholder: "Enter penalty amount", desc: "Late payment penalty" },
    { key: "hasBidding", label: "Bid Rule", fieldKey: "bidRule", icon: <Sliders size={18} />, format: "text", placeholder: "Bid amount present", desc: "Auction / bidding mechanism", isRule: true },
    { key: "prizePayout", label: "Prize Rule", fieldKey: "prizeRule", icon: <DollarSign size={18} />, format: "text", placeholder: "Prize amount present", desc: "Prize / payout amounts", isRule: true },
    { key: "liftMechanism", label: "Lift Rule", fieldKey: "liftRule", icon: <Calendar size={18} />, format: "text", placeholder: "Lift after month", desc: "After-lift payment change", isRule: true },
  ];

  return ruleConfigs.map((cfg) => {
    const rule = rules.find((r) => r.key === cfg.key);
    return {
      ...cfg,
      rule,
      scheduleEvidence: cfg.isRule
        ? schedule.some((r) => r[cfg.fieldKey] !== null && r[cfg.fieldKey] !== undefined)
        : null,
    };
  });
}

function SummaryField({ label, value, status, confidence, format, suffix }) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const displayValue = hasValue
    ? format === "money"
      ? money(value)
      : `${value}${suffix || ""}`
    : "?";

  const statusLabel = status === VALUE_STATE.NOT_FOUND || status === FIELD_STATUS.NOT_FOUND ? "NOT_FOUND"
    : status === VALUE_STATE.OWNER_DEFINED || status === FIELD_STATUS.OWNER_DEFINED ? "OWNER_DEFINED"
    : "FOUND";

  return (
    <div className="bw-metric">
      <span>{label}</span>
      <strong style={{ color: hasValue ? "inherit" : "#94a3b8" }}>{displayValue}</strong>
      <small>
        <span className={`bw-field-status-tag ${status === VALUE_STATE.NOT_FOUND || status === FIELD_STATUS.NOT_FOUND ? "not-found" : "found"}`}>
          {statusLabel}
        </span>
        {" \u00B7 "}{confidence}% confidence
      </small>
    </div>
  );
}

function Success({ state, go, context, profile }) {
  const [groups, setGroups] = useState(() => state.created?.group ? [state.created.group] : []);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    listTenantGroupsPersistent(context)
      .then((records) => { if (active) setGroups(records); })
      .catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [context]);
  const finance = getFinanceDashboardSummary(context);
  const total = finance.metrics.find((x) => x.key === "totalCollection")?.displayValue || null;
  return (
    <div className="ai-success">
      <section>
        <span><Check /></span>
        <p>GOOD MORNING{profile?.full_name ? `, ${profile.full_name.split(" ")[0].toUpperCase()}` : ""}</p>
        <h1>Your business workspace<br />is ready.</h1>
        <small>{state.created?.group?.chit_name || "Business records created successfully."}</small>
      </section>
      <div className="ai-business-overview">
        <Metric label="Total chit groups" value={groups.length} />
        {total && <Metric label="Total collection" value={total} />}
      </div>
      {loadError && <Notice tone="danger"><AlertTriangle />{loadError}</Notice>}
      <div className="ai-quick-actions">
        <button onClick={() => go("upload")}><Upload />Create another</button>
        <button onClick={() => window.location.assign("/chits/collections")}><Plus />Record collection</button>
        <button onClick={() => window.location.assign("/chits/ai")}><Bot />AI Assistant</button>
      </div>
      <section className="ai-recent">
        <h3>Recent chit groups</h3>
        {groups.slice(0, 3).map((group) => (
          <button onClick={() => window.location.assign("/chits/groups")} key={group.id}>
            <span><strong>{group.chit_name}</strong><small>{group.total_members} members ? {money(group.chit_value)}</small></span>
            <ArrowRight />
          </button>
        ))}
      </section>
    </div>
  );
}

function StepCard({ eyebrow, title, subtitle, children, wide = false }) {
  return (
    <section className={`ai-step-card ${wide ? "wide" : ""}`}>
      <header>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function StickyAction({ children, ...props }) {
  return <button className="ai-sticky-action" {...props}>{children}</button>;
}

function Notice({ children, tone = "info" }) {
  return <div className={`ai-notice ${tone}`}>{children}</div>;
}

function Metric({ label, value }) {
  if (value === null || value === undefined) return null;
  return <div className="ai-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function money(value) {
  if (value === null || value === undefined || value === "") return "?";
  const num = Number(value);
  if (isNaN(num)) return "?";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

function validationMessage(validation) {
  if (validation.status === VALIDATION_STATUS.VALID) return "All validation checks passed. Creation is available after owner approval.";
  if (validation.status === VALIDATION_STATUS.INVALID) return `${validation.errors.length} validation error(s) must be corrected.`;
  if (validation.status === VALIDATION_STATUS.UNSUPPORTED_PATTERN) return `${validation.unsupportedRules.length} unsupported rule(s) must be resolved.`;
  return `${validation.missingFields.length} required DSL primitive(s) need owner confirmation.`;
}

function humanizeLabel(key) {
  const map = {
    chitName: "Chit Name",
    chitValue: "Chit Value",
    memberCount: "Member Count",
    duration: "Duration (Months)",
    monthlyPayment: "Monthly Payment / Installment",
    grossInstallment: "Gross Installment",
    installmentMode: "Installment Mode",
    foremanCommissionPercent: "Foreman Commission (%)",
    minimumDiscountPercent: "Minimum Discount (%)",
    maximumDiscountPercent: "Maximum Discount (%)",
    prizeAmount: "Prize Amount",
    auctionPattern: "Auction / Lucky Draw Pattern",
    organizerName: "Organizer Name",
    contactNumber: "Contact Number",
    fractionalTicketInformation: "Fractional Ticket Information",
    specialRules: "Special Rules",
    notes: "Notes",
    commission: "Commission Rate",
    deposit: "Deposit / Security",
    penalty: "Penalty / Late Fee",
    dividend: "Dividend / Profit Share",
    startDate: "Start Date",
    endDate: "End Date",
  };
  return map[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function readState(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || "{}") || {}; } catch { return {}; }
}

export default AIChitFlow;
