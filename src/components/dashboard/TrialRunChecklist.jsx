import { ArrowRight, ClipboardCheck, Download, PlayCircle, RotateCcw, SearchCheck } from "lucide-react";

function TrialRunChecklist({
  model,
  isOpen,
  onClose,
  onStepOpen,
  onStart,
  onResume,
  onReset,
  onReconcile,
  onExport,
}) {
  if (!isOpen || !model) {
    return null;
  }

  return (
    <section className="trial-run-checklist" aria-label="Trial run checklist">
      <div className="trial-run-header">
        <div>
          <span className="royal-dashboard-eyebrow">Guided Real Trial Run</span>
          <h3>{model.title}</h3>
          <p>{model.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close trial checklist">
          Close
        </button>
      </div>

      <div className="trial-run-actions" aria-label="Trial run actions">
        <button type="button" onClick={onStart}>
          <PlayCircle size={16} />
          Start Trial
        </button>
        <button type="button" onClick={onResume}>
          <ClipboardCheck size={16} />
          Resume Trial
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset Trial Data
        </button>
        <button type="button" onClick={onReconcile}>
          <SearchCheck size={16} />
          Run Reconciliation
        </button>
        <button type="button" onClick={() => scrollToFailures()}>
          View Failures
        </button>
        <button type="button" onClick={onExport}>
          <Download size={16} />
          Export Trial Report
        </button>
      </div>

      <div className="trial-run-sample">
        <div className="trial-run-sample-title">
          <PlayCircle size={18} />
          <strong>Sample Trial Chit Data</strong>
        </div>
        <dl>
          <div><dt>Chit Name</dt><dd>{model.sample.chitName}</dd></div>
          <div><dt>Chit Value</dt><dd>{model.sample.chitValue}</dd></div>
          <div><dt>Members</dt><dd>{model.sample.members}</dd></div>
          <div><dt>Monthly Payment</dt><dd>{model.sample.monthlyPayment}</dd></div>
          <div><dt>Duration</dt><dd>{model.sample.duration}</dd></div>
          <div><dt>Start Month</dt><dd>{model.sample.startMonth}</dd></div>
        </dl>
      </div>

      <div className="trial-run-progress">
        <div>
          <span>Trial progress</span>
          <strong>{model.progress.percent}%</strong>
        </div>
        <div className="trial-run-progress-track">
          <i style={{ width: `${model.progress.percent}%` }} />
        </div>
        <p>{model.progress.completed} of {model.progress.total} steps completed.</p>
      </div>

      <div className={`trial-run-reconciliation trial-run-reconciliation-${String(model.reconciliation.status).toLowerCase()}`}>
        <div>
          <span>Reconciliation</span>
          <strong>{model.reconciliation.status}</strong>
        </div>
        <p>
          {model.reconciliation.passed} passed, {model.reconciliation.warnings} warnings,
          {" "}{model.reconciliation.failed} failed.
        </p>
        <div className="trial-run-reconciliation-grid">
          {model.reconciliation.checks.map((check) => (
            <article key={check.id}>
              <span>{check.status}</span>
              <strong>{check.title}</strong>
              <p>{check.message}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="trial-run-steps">
        {model.steps.map((step) => (
          <article className={`trial-run-step trial-run-${toStatusClass(step.status)}`} key={step.id}>
            <div className="trial-run-step-number">
              <ClipboardCheck size={16} />
              <span>{step.id}</span>
            </div>
            <div className="trial-run-step-copy">
              <div>
                <h4>{step.title}</h4>
                <span>{step.status}</span>
              </div>
              <p>{step.helper}</p>
            </div>
            <button type="button" onClick={() => onStepOpen(step.route)}>
              {step.actionLabel}
              <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>

      <div className="trial-run-failures" id="trial-run-failures">
        <h4>Failures and Blockers</h4>
        {model.failures.length ? (
          <ul>
            {model.failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        ) : (
          <p>No failed checks are currently reported. Browser verification is still required before production readiness.</p>
        )}
      </div>
    </section>
  );
}

function scrollToFailures() {
  if (typeof document !== "undefined") {
    document.getElementById("trial-run-failures")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toStatusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

export default TrialRunChecklist;
