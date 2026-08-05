import { FileText, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import HelpButton from "../../components/common/HelpButton";
import ReceiptActions from "../../components/receipts/ReceiptActions";
import ReceiptHistory from "../../components/receipts/ReceiptHistory";
import ReceiptPreview from "../../components/receipts/ReceiptPreview";
import { formatCurrency } from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import {
  generateReceipt,
  getReceiptActions,
  getReceiptPageModel,
  trackReceiptReprint,
} from "../../services/receiptService";
import "./Receipts.css";

function Receipts() {
  const { activeTenantContext, profile } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [version, setVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const pageModel = useMemo(
    () => {
      void version;
      return getReceiptPageModel(activeTenantContext);
    },
    [activeTenantContext, version]
  );

  const generateNextReceipt = () => {
    setIsGenerating(true);
    setError("");

    try {
      const result = generateReceipt({
        activeTenantContext,
        createdBy: profile?.full_name || "VARDHAN Collector",
      });

      if (!result.validation.isValid) {
        setError(result.validation.errors[0]);
        return;
      }

      setSelectedReceipt(result.receipt);
      setSuccess("Receipt generated and saved.");
      setVersion((current) => current + 1);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Unable to generate receipt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openPrint = (receipt) => {
    const tracked = trackReceiptReprint(receipt, activeTenantContext);
    if (!tracked.success) {
      setError(tracked.message);
      return;
    }

    const actions = getReceiptActions(receipt);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(actions.printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setVersion((current) => current + 1);
  };

  const downloadReceipt = (receipt) => {
    const actions = getReceiptActions(receipt);
    downloadTextFile(actions.pdf.fileName, actions.pdf.html, actions.pdf.mimeType);
  };

  const shareWhatsApp = (receipt) => {
    const actions = getReceiptActions(receipt);
    window.open(actions.whatsappLink, "_blank", "noopener,noreferrer");
  };

  const markReprint = (receipt) => {
    const tracked = trackReceiptReprint(receipt, activeTenantContext);
    if (!tracked.success) {
      setError(tracked.message);
      return;
    }

    setSuccess("Receipt reprint tracked.");
    setVersion((current) => current + 1);
    window.setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <ChitLayout
      title="Receipts"
      subtitle="Production receipt preview, print, download and WhatsApp sharing"
      actions={
        <><Button variant="primary" icon={<FileText size={16} />} onClick={generateNextReceipt} loading={isGenerating}>Generate Receipt</Button><HelpButton feature="RECEIPTS" variant="secondary"/></>
      }
    >
      <div className="receipts-page">
        {success && <div className="receipt-toast success" role="status" aria-live="polite">{success}</div>}
        {error && (
          <div className="receipt-toast error" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss receipt error" onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="receipts-summary">
          {pageModel.summary.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{typeof item.value === "number" && item.label.includes("Value") ? formatCurrency(item.value) : item.value}</strong>
            </div>
          ))}
        </div>

        <div className="receipts-table-card">
          {pageModel.receipts.length ? (
            <ReceiptHistory
              receipts={pageModel.receipts}
              onPreview={setSelectedReceipt}
              onPrint={openPrint}
              onDownload={downloadReceipt}
              onWhatsApp={shareWhatsApp}
              onReprint={markReprint}
            />
          ) : (
            <div className="receipt-empty-state">
              <ReceiptText size={36} />
              <h3>{pageModel.emptyState.title}</h3>
              <p>{pageModel.emptyState.message}</p>
              <Button variant="primary" icon={<FileText size={16} />} onClick={generateNextReceipt} loading={isGenerating}>
                Generate From Collection
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedReceipt)}
        title="Receipt Preview"
        size="large"
        onClose={() => setSelectedReceipt(null)}
        footer={
          <ReceiptActions
            receipt={selectedReceipt}
            activeTenantContext={activeTenantContext}
            onError={setError}
            onReprint={() => setVersion((current) => current + 1)}
          />
        }
      >
        <ReceiptPreview receipt={selectedReceipt} />
      </Modal>
    </ChitLayout>
  );
}

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default Receipts;
