import { useEffect, useMemo, useRef, useState } from "react";
import { FileImage, FileSpreadsheet, FileText, Save, ScanText, UploadCloud, WandSparkles } from "lucide-react";
import {
  captureChitPattern,
  confirmCapturedChitDraft,
  createChitGroupFromCapturedData,
} from "../../services/ai/aiSmartCaptureService";

const SOURCE_OPTIONS = {
  image: {
    label: "Import Chit Photo",
    helper: "Upload JPG, PNG, or WEBP chit pattern photo.",
    accept: ".png,.jpg,.jpeg,.webp",
    icon: FileImage,
  },
  pdf: {
    label: "Import PDF",
    helper: "Upload a PDF chit pattern or agreement.",
    accept: ".pdf",
    icon: FileText,
  },
  excel: {
    label: "Import Excel",
    helper: "Upload an Excel/CSV planning sheet. Local mode reads manual text until a parser is connected.",
    accept: ".xlsx,.xls,.csv",
    icon: FileSpreadsheet,
  },
};

function SmartChitCapture({ activeTenantContext, intent = "image" }) {
  const [sourceType, setSourceType] = useState(intent);
  const [file, setFile] = useState(null);
  const [manualText, setManualText] = useState("");
  const [capture, setCapture] = useState(null);
  const [corrections, setCorrections] = useState({});
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const source = SOURCE_OPTIONS[sourceType] || SOURCE_OPTIONS.image;
  const SourceIcon = source.icon;
  const providerMode = capture?.mode || "LOCAL_MANUAL_FALLBACK";
  const isManualFallback = providerMode === "LOCAL_MANUAL_FALLBACK";
  const fieldRows = useMemo(() => Object.entries(corrections), [corrections]);

  useEffect(() => {
    setSourceType(intent || "image");
  }, [intent]);

  const chooseFile = (nextFile) => {
    setFile(nextFile || null);
    setCapture(null);
    setCorrections({});
    setMessage(nextFile ? `${nextFile.name} ready for extraction.` : "");
  };

  const runCapture = async () => {
    if (!file && !manualText.trim()) {
      setMessage("Upload a file or paste chit pattern text for manual extraction mode.");
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      const result = await captureChitPattern({ file, manualText });
      setCapture(result);
      setCorrections(Object.fromEntries(Object.entries(result.fields).map(([key, field]) => [key, field.value])));
      setMessage(result.message || "Captured fields are ready for review.");
    } catch (error) {
      setMessage(error.message || "Unable to capture chit pattern.");
    } finally {
      setIsBusy(false);
    }
  };

  const confirmDraft = () => {
    try {
      const draft = confirmCapturedChitDraft({ capture, corrections, activeTenantContext });
      setMessage(`Captured chit draft saved: ${draft.chitName}`);
    } catch (error) {
      setMessage(error.message || "Unable to save captured chit draft.");
    }
  };

  const createGroup = () => {
    try {
      const group = createChitGroupFromCapturedData({ capture, corrections, activeTenantContext });
      setMessage(`Chit group created: ${group.chit_name}`);
    } catch (error) {
      setMessage(error.message || "Unable to create chit group from captured data.");
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
          <h3>Image, PDF and Excel capture</h3>
        </div>
        <button type="button" onClick={runCapture} disabled={isBusy}>
          <ScanText size={16} />
          {isBusy ? "Reading..." : "Extract"}
        </button>
      </div>

      <div className="vardhan-ai-provider-banner">
        <WandSparkles size={16} />
        Manual extraction mode (AI provider not connected yet).
      </div>

      <div className="smart-capture-source-tabs" role="tablist" aria-label="Capture source">
        {Object.entries(SOURCE_OPTIONS).map(([key, option]) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={sourceType === key}
              className={sourceType === key ? "active" : ""}
              onClick={() => {
                setSourceType(key);
                chooseFile(null);
              }}
              key={key}
            >
              <Icon size={16} />
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`vardhan-ai-upload ${isDragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <SourceIcon size={26} />
        <strong>{file?.name || source.label}</strong>
        <span>{file ? "Drop another file or click to replace." : source.helper}</span>
        <UploadCloud size={18} />
      </button>
      <input
        ref={inputRef}
        className="smart-capture-hidden-input"
        type="file"
        accept={source.accept}
        onChange={(event) => chooseFile(event.target.files?.[0] || null)}
      />

      <textarea
        value={manualText}
        onChange={(event) => setManualText(event.target.value)}
        placeholder="Optional: paste visible chit pattern text here for local/manual extraction"
      />

      {capture && (
        <div className="vardhan-capture-fields">
          {fieldRows.map(([key, value]) => {
            const confidence = Number(capture.fields?.[key]?.confidence || 0);
            const confidenceLabel = `${Math.round(confidence * 100)}% confidence`;
            return (
              <label className={capture.lowConfidenceFields.includes(key) ? "low-confidence" : ""} key={key}>
                <span>
                  {formatFieldName(key)}
                  <em>{confidenceLabel}</em>
                </span>
                <input
                  value={Array.isArray(value) ? value.join(", ") : value}
                  onChange={(event) => setCorrections((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            );
          })}
        </div>
      )}

      {capture?.validation && (
        <div className={`smart-capture-validation ${capture.validation.isValid ? "valid" : "invalid"}`}>
          <strong>{capture.validation.isValid ? "Totals validated" : "Review required"}</strong>
          {[...(capture.validation.errors || []), ...(capture.validation.warnings || [])].map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      )}

      {message && <p className="vardhan-ai-message">{message}</p>}

      {capture && (
        <div className="smart-capture-actions">
          <button type="button" className="vardhan-ai-wide-action" onClick={confirmDraft}>
            <Save size={16} />
            Save Chit Draft
          </button>
          <button type="button" className="vardhan-ai-wide-action primary" onClick={createGroup}>
            <WandSparkles size={16} />
            Create Chit Group
          </button>
        </div>
      )}

      {isManualFallback && (
        <p className="smart-capture-footnote">
          Upload works now, but automatic OCR/AI extraction waits for a future provider connection.
        </p>
      )}
    </section>
  );
}

function formatFieldName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export default SmartChitCapture;
