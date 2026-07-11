import { useState } from "react";
import { X } from "lucide-react";
import ImportDropZone from "./ImportDropZone";
import ImportPreviewTable from "./ImportPreviewTable";
import ImportValidationPanel from "./ImportValidationPanel";
import ImportSummary from "./ImportSummary";
import {
  IMPORT_TYPES,
  analyzeImportFile,
  commitImportSession,
  remapImportSession,
} from "../../services/importService";

const STEPS = [
  "Upload file",
  "Auto detect columns",
  "Map fields",
  "Validate data",
  "Preview",
  "Import",
];

function ImportWizard({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState(IMPORT_TYPES.MEMBERS);
  const [session, setSession] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  const analyzeFile = async () => {
    if (!file) {
      setError("Select a file before continuing.");
      return;
    }

    setIsBusy(true);
    setError("");

    try {
      const nextSession = await analyzeImportFile({ file, importType });
      setSession(nextSession);
      setStep(2);
    } catch (nextError) {
      setError(nextError.message || "Unable to analyze import file.");
    } finally {
      setIsBusy(false);
    }
  };

  const applyMapping = () => {
    if (session?.id) {
      setSession(remapImportSession({ sessionId: session.id, mappedFields: session.mappedFields }));
    }
    setStep(4);
  };

  const finishImport = () => {
    if (session?.id) {
      setSession(commitImportSession(session.id));
    }
    setStep(6);
  };

  return (
    <div className="smart-import-overlay" role="dialog" aria-modal="true" aria-label="Smart data import">
      <div className="smart-import-wizard">
        <header className="smart-import-header">
          <div>
            <span>Smart Data Import</span>
            <h3>Migrate paper, Excel, CSV, JSON, and future OCR records</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close import wizard">
            <X size={18} />
          </button>
        </header>

        <nav className="smart-import-steps" aria-label="Import workflow">
          {STEPS.map((label, index) => (
            <span className={step >= index + 1 ? "active" : ""} key={label}>
              {index + 1}. {label}
            </span>
          ))}
        </nav>

        <div className="smart-import-controls">
          <label>
            Import Type
            <select value={importType} onChange={(event) => setImportType(event.target.value)}>
              {Object.values(IMPORT_TYPES).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        {step === 1 && (
          <ImportDropZone
            selectedFileName={file?.name}
            onFileSelect={(nextFile) => {
              setFile(nextFile);
              setSession(null);
              setError("");
            }}
          />
        )}

        {step >= 2 && session && (
          <>
            <ImportSummary summary={session.summary} />
            <ImportValidationPanel validation={session.validation} />
            <ImportPreviewTable preview={session.preview} />
          </>
        )}

        {error && <p className="smart-import-error">{error}</p>}

        <footer className="smart-import-footer">
          <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            Back
          </button>
          {step === 1 && (
            <button type="button" onClick={analyzeFile} disabled={isBusy}>
              {isBusy ? "Analyzing..." : "Analyze file"}
            </button>
          )}
          {step === 2 && <button type="button" onClick={() => setStep(3)}>Review mapping</button>}
          {step === 3 && <button type="button" onClick={applyMapping}>Validate data</button>}
          {step === 4 && <button type="button" onClick={() => setStep(5)}>Preview import</button>}
          {step === 5 && <button type="button" onClick={finishImport}>Import valid rows</button>}
          {step === 6 && <button type="button" onClick={onClose}>Done</button>}
        </footer>
      </div>
    </div>
  );
}

export default ImportWizard;
