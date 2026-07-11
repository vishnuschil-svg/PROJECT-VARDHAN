import { Eye, MessageCircle, Printer, RotateCcw, Download } from "lucide-react";
import Badge from "../common/Badge";
import Table from "../common/Table";
import { formatReceiptCurrency, formatReceiptDate } from "../../receipts/ReceiptFormatter";

function ReceiptHistory({
  receipts = [],
  onPreview,
  onPrint,
  onDownload,
  onWhatsApp,
  onReprint,
}) {
  if (!receipts.length) {
    return null;
  }

  const columns = [
    { key: "receiptNumber", label: "Receipt #", width: "170px", sortable: true },
    { key: "memberName", label: "Member", width: "170px" },
    { key: "chitName", label: "Chit", width: "190px" },
    { key: "amountPaid", label: "Amount", width: "120px", render: formatReceiptCurrency },
    { key: "paymentDate", label: "Date", width: "130px", render: formatReceiptDate },
    { key: "paymentMode", label: "Mode", width: "120px" },
    {
      key: "reprintCount",
      label: "Reprints",
      width: "100px",
      render: (value) => value || 0,
    },
    {
      key: "status",
      label: "Status",
      width: "110px",
      render: (value) => (
        <Badge
          label={value || "active"}
          variant={value === "cancelled" ? "error" : "success"}
          size="small"
        />
      ),
    },
  ];
  const actions = [
    { icon: <Eye size={15} />, label: "Preview", onClick: onPreview, variant: "default" },
    { icon: <Printer size={15} />, label: "Print", onClick: onPrint, variant: "primary" },
    { icon: <Download size={15} />, label: "Download", onClick: onDownload, variant: "default" },
    { icon: <MessageCircle size={15} />, label: "WhatsApp", onClick: onWhatsApp, variant: "success" },
    { icon: <RotateCcw size={15} />, label: "Reprint", onClick: onReprint, variant: "default" },
  ];

  return <Table columns={columns} data={receipts} actions={actions} />;
}

export default ReceiptHistory;
