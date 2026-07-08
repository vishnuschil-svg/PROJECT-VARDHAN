import { Download, Eye, FileText, MessageCircle, Printer } from "lucide-react";
import { useMemo } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { formatCurrency } from "../../config/chitPhaseOneData";
import { useAuth } from "../../hooks/useAuth";
import { buildCollectionReceipts, useTenantCollections } from "../../services/chitCollectionsStore";
import { listTenantMembers } from "../../services/chitDataService";
import "./Receipts.css";

function Receipts() {
  const { activeTenantContext } = useAuth();
  const collections = useTenantCollections(activeTenantContext);
  const tenantMembers = useMemo(
    () => listTenantMembers(activeTenantContext),
    [activeTenantContext]
  );
  const receipts = useMemo(
    () => buildCollectionReceipts(collections),
    [collections]
  );

  const columns = [
    { key: "receipt_number", label: "Receipt #", width: "130px", sortable: true },
    {
      key: "member_id",
      label: "Member",
      width: "150px",
      render: (value) => tenantMembers.find((member) => member.id === value)?.member_name || "-",
    },
    { key: "amount", label: "Amount", width: "120px", render: (value) => formatCurrency(value) },
    {
      key: "payment_date",
      label: "Date",
      width: "130px",
      render: (value) => new Date(value).toLocaleDateString("en-IN"),
    },
    { key: "payment_method", label: "Method", width: "130px" },
    {
      key: "can_print_pdf",
      label: "PDF",
      width: "80px",
      render: (value) => (
        <Badge label={value ? "Ready" : "No"} variant={value ? "success" : "error"} size="small" />
      ),
    },
  ];

  const actions = [
    { icon: <Eye size={15} />, label: "View", onClick: () => {}, variant: "default" },
    { icon: <Printer size={15} />, label: "Print", onClick: () => {}, variant: "primary" },
    { icon: <MessageCircle size={15} />, label: "WhatsApp", onClick: () => {}, variant: "success" },
    { icon: <Download size={15} />, label: "Download", onClick: () => {}, variant: "default" },
  ];

  return (
    <ChitLayout
      title="Receipts"
      subtitle="Payment receipts and documents"
      actions={
        <Button variant="primary" icon={<FileText size={16} />}>
          Generate Receipt
        </Button>
      }
    >
      <div className="receipts-page">
        <div className="receipts-summary">
          <div>
            <span>Total Receipts</span>
            <strong>{receipts.length}</strong>
          </div>
          <div>
            <span>Receipt Value</span>
            <strong>{formatCurrency(receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0))}</strong>
          </div>
          <div>
            <span>PDF Ready</span>
            <strong>{receipts.filter((receipt) => receipt.can_print_pdf).length}</strong>
          </div>
        </div>
        <div className="receipts-table-card">
          <Table columns={columns} data={receipts} actions={actions} />
        </div>
      </div>
    </ChitLayout>
  );
}

export default Receipts;
