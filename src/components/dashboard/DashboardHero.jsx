import { ArrowRight, FileSpreadsheet, FileText, ImageUp, Landmark, PlayCircle, ReceiptText, ShieldCheck, UploadCloud } from "lucide-react";

function DashboardHero({
  productName,
  companyName,
  workspaceLabel,
  onOpenWorkspace,
  onAddCollection,
  onSmartImport,
  onSmartCapture,
  onReceiptAction,
  onStartTrialRun,
}) {
  return (
    <section className="royal-dashboard-hero" aria-label={`${productName} overview`}>
      <div className="royal-dashboard-hero-content">
        <div className="royal-dashboard-brand-mark">
          <Landmark size={26} />
          <span>MITRA</span>
        </div>
        <p className="royal-dashboard-eyebrow">MITRA NIDHI CHITI PRO</p>
        <h2>{productName}</h2>
        <p className="royal-dashboard-hero-text">
          Premium owner view for collections, members, pending risk, profit,
          and operational momentum across {companyName}.
        </p>

        <div className="royal-dashboard-hero-actions">
          <button type="button" className="royal-dashboard-primary-action" onClick={onOpenWorkspace}>
            Open workspace
            <ArrowRight size={18} />
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={onStartTrialRun}>
            <PlayCircle size={18} />
            Start Trial Run
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={onAddCollection}>
            <ReceiptText size={18} />
            Add collection
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={onReceiptAction}>
            <ReceiptText size={18} />
            Receipt
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={onSmartImport}>
            <UploadCloud size={18} />
            Smart Import
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={() => onSmartCapture?.("image")}>
            <ImageUp size={18} />
            Import Chit Photo
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={() => onSmartCapture?.("pdf")}>
            <FileText size={18} />
            Import PDF
          </button>
          <button type="button" className="royal-dashboard-secondary-action" onClick={() => onSmartCapture?.("excel")}>
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
        </div>
      </div>

      <div className="royal-dashboard-hero-panel" aria-label="Workspace trust status">
        <div className="royal-dashboard-hero-panel-top">
          <ShieldCheck size={22} />
          <span>Enterprise Ready</span>
        </div>
        <strong>{workspaceLabel}</strong>
        <p>Repository and service driven dashboard data with route-safe actions.</p>
      </div>
    </section>
  );
}

export default DashboardHero;
