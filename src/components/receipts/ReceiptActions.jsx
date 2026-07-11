import { Download, Image, MessageCircle, Printer, RotateCcw } from "lucide-react";
import { getReceiptActions, trackReceiptReprint } from "../../services/receiptService";

function ReceiptActions({ receipt, template, activeTenantContext, onError, onReprint }) {
  if (!receipt) {
    return null;
  }

  const openPrint = () => {
    const tracked = trackReceiptReprint(receipt, activeTenantContext);
    if (!tracked.success) {
      onError?.(tracked.message);
      return;
    }
    const actions = getReceiptActions(receipt, template);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(actions.printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    onReprint?.(tracked.receipt);
  };

  const downloadPDFReadyLayout = () => {
    const actions = getReceiptActions(receipt, template);
    downloadTextFile(actions.pdf.fileName, actions.pdf.html, actions.pdf.mimeType);
  };

  const downloadImageLayout = () => {
    const actions = getReceiptActions(receipt, template);
    const link = document.createElement("a");
    link.href = actions.image.imageUrl;
    link.download = actions.image.fileName;
    link.click();
  };

  const shareWhatsApp = () => {
    const actions = getReceiptActions(receipt, template);
    window.open(actions.whatsappLink, "_blank", "noopener,noreferrer");
  };

  const trackOnlyReprint = () => {
    const tracked = trackReceiptReprint(receipt, activeTenantContext);
    if (!tracked.success) {
      onError?.(tracked.message);
      return;
    }
    onReprint?.(tracked.receipt);
  };

  return (
    <div className="production-receipt-actions">
      <button type="button" onClick={openPrint}>
        <Printer size={16} />
        Print
      </button>
      <button type="button" onClick={downloadPDFReadyLayout}>
        <Download size={16} />
        PDF-ready
      </button>
      <button type="button" onClick={downloadImageLayout}>
        <Image size={16} />
        Image
      </button>
      <button type="button" onClick={shareWhatsApp}>
        <MessageCircle size={16} />
        WhatsApp
      </button>
      <button type="button" onClick={trackOnlyReprint}>
        <RotateCcw size={16} />
        Reprint
      </button>
    </div>
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

export default ReceiptActions;
