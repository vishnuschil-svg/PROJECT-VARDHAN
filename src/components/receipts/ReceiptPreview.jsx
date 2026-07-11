import { previewReceipt } from "../../services/receiptService";

function ReceiptPreview({ receipt, template }) {
  if (!receipt) {
    return <p className="receipt-preview-empty">Select or generate a receipt to preview.</p>;
  }

  return (
    <div
      className="production-receipt-preview"
      dangerouslySetInnerHTML={{ __html: previewReceipt(receipt, template) }}
    />
  );
}

export default ReceiptPreview;
