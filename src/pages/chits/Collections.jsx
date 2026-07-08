import { Eye, FileText, MessageCircle, Plus, Printer, ReceiptText, X } from "lucide-react";
import { useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import {
  PHASE_TWO_CHIT_MEMBERS,
  getMemberGroupName,
  getTenantMembers,
} from "../../config/chitMemberData";
import {
  PHASE_ONE_CHIT_GROUPS,
  formatCurrency,
  getTenantChitGroups,
} from "../../config/chitPhaseOneData";
import {
  buildReceiptNumber,
  buildWhatsAppReceiptMessage,
  createReceiptImageFile,
  createReceiptImageUrl,
  createReceiptPdfFile,
  createReceiptPayload,
  normalizeWhatsAppNumber,
} from "../../config/chitReceiptImage";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { saveCollection as saveSharedCollection, useTenantCollections } from "../../services/chitCollectionsStore";
import "./Collections.css";

const EMPTY_COLLECTION = {
  member_id: "",
  chit_group_id: "",
  collection_month: new Date().toISOString().slice(0, 7),
  paid_amount: "",
  fine_amount: "0",
  discount_amount: "0",
  dividend_adjustment: "0",
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: "Cash",
  collected_by: "VARDHAN Collector",
  notes: "",
};

function Collections() {
  const { activeTenantContext, company, profile } = useAuth();
  const collections = useTenantCollections(activeTenantContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_COLLECTION);
  const [formError, setFormError] = useState("");
  const [receiptPreview, setReceiptPreview] = useState(null);

  const tenantGroups = useMemo(
    () => getTenantChitGroups(PHASE_ONE_CHIT_GROUPS, activeTenantContext),
    [activeTenantContext]
  );

  const tenantMembers = useMemo(
    () => getTenantMembers(PHASE_TWO_CHIT_MEMBERS, activeTenantContext),
    [activeTenantContext]
  );

  const memberOptions = tenantMembers.map((member) => ({
    value: member.id,
    label: `${member.member_name} (${member.member_number})`,
  }));

  const groupOptions = tenantGroups.map((group) => ({
    value: group.id,
    label: `${group.chit_name} (${formatCurrency(group.monthly_amount)}/month)`,
  }));

  const selectedMember = tenantMembers.find((member) => member.id === formData.member_id);
  const selectedGroup =
    tenantGroups.find((group) => group.id === formData.chit_group_id) ||
    tenantGroups.find((group) => group.id === selectedMember?.chit_group_id);

  const openRecordModal = () => {
    const firstMember = tenantMembers[0];
    const firstGroup =
      tenantGroups.find((group) => group.id === firstMember?.chit_group_id) || tenantGroups[0];

    setFormData({
      ...EMPTY_COLLECTION,
      member_id: firstMember?.id || "",
      chit_group_id: firstGroup?.id || "",
      paid_amount: firstGroup?.monthly_amount || "",
      collected_by: profile?.full_name || "VARDHAN Collector",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const updateForm = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "member_id") {
        const member = tenantMembers.find((item) => item.id === value);
        const group = tenantGroups.find((item) => item.id === member?.chit_group_id);
        next.chit_group_id = group?.id || "";
        next.paid_amount = group?.monthly_amount || next.paid_amount;
      }

      if (field === "chit_group_id") {
        const group = tenantGroups.find((item) => item.id === value);
        next.paid_amount = group?.monthly_amount || next.paid_amount;
      }

      return next;
    });
  };

  const saveCollection = () => {
    if (!formData.member_id) {
      setFormError("Member is required.");
      return;
    }

    if (!formData.chit_group_id) {
      setFormError("Chit Group is required.");
      return;
    }

    if (!Number(formData.paid_amount)) {
      setFormError("Paid Amount is required.");
      return;
    }

    const member = tenantMembers.find((item) => item.id === formData.member_id);
    const group = tenantGroups.find((item) => item.id === formData.chit_group_id);
    const paidAmount = Number(formData.paid_amount);
    const fineAmount = Number(formData.fine_amount || 0);
    const discountAmount = Number(formData.discount_amount || 0);
    const dividendAdjustment = Number(formData.dividend_adjustment || 0);
    const installmentAmount = Number(group?.monthly_amount || paidAmount);
    const payableAmount = Math.max(
      installmentAmount + fineAmount - discountAmount - dividendAdjustment,
      0
    );
    const collection = saveSharedCollection({
      id: `collection-${Date.now()}`,
      member_id: formData.member_id,
      group_id: formData.chit_group_id,
      chit_group_id: formData.chit_group_id,
      collection_month: formData.collection_month,
      installment_amount: installmentAmount,
      fine_amount: fineAmount,
      discount_amount: discountAmount,
      dividend_adjustment: dividendAdjustment,
      paid_amount: paidAmount,
      pending_amount: Math.max(payableAmount - paidAmount, 0),
      payment_date: formData.payment_date,
      payment_method: formData.payment_method,
      collected_by: formData.collected_by,
      receipt_number: buildReceiptNumber(collections.length),
      is_partial: paidAmount < installmentAmount,
      notes: formData.notes,
      created_at: new Date().toISOString(),
    }, activeTenantContext);
    const receipt = createReceiptPayload({
      collection,
      member,
      group,
      activeTenantContext,
      companyName: company?.company_name || "VARDHAN Own Chit Business",
    });

    setReceiptPreview({
      receipt,
      imageUrl: createReceiptImageUrl(receipt),
    });
    setIsModalOpen(false);
  };

  const openReceiptPreview = (collection) => {
    const member = tenantMembers.find((item) => item.id === collection.member_id);
    const group = tenantGroups.find((item) => item.id === collection.chit_group_id || collection.group_id);
    const receipt = createReceiptPayload({
      collection,
      member,
      group,
      activeTenantContext,
      companyName: company?.company_name || "VARDHAN Own Chit Business",
    });

    setReceiptPreview({
      receipt,
      imageUrl: createReceiptImageUrl(receipt),
    });
  };

  const sendWhatsAppReceipt = async () => {
    if (!receiptPreview?.receipt) return;

    const receipt = receiptPreview.receipt;
    const message = buildWhatsAppReceiptMessage(receipt);
    const file = await createReceiptImageFile(receipt);

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Receipt ${receipt.receipt_number}`,
        text: message,
        files: [file],
      });
      return;
    }

    downloadReceiptImage();
    const phone = normalizeWhatsAppNumber(receipt.whatsapp_number);
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const sendWhatsAppPdf = async () => {
    if (!receiptPreview?.receipt) return;

    const receipt = receiptPreview.receipt;
    const message = buildWhatsAppReceiptMessage(receipt);
    const file = createReceiptPdfFile(receipt);

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Receipt ${receipt.receipt_number}`,
        text: message,
        files: [file],
      });
      return;
    }

    downloadReceiptPdf();
    const phone = normalizeWhatsAppNumber(receipt.whatsapp_number);
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`${message}\n\nPDF receipt has been generated.`)}`
      : `https://wa.me/?text=${encodeURIComponent(`${message}\n\nPDF receipt has been generated.`)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const downloadReceiptImage = () => {
    if (!receiptPreview?.receipt) return;

    const link = document.createElement("a");
    link.href = receiptPreview.imageUrl;
    link.download = `${receiptPreview.receipt.receipt_number}.svg`;
    link.click();
  };

  const downloadReceiptPdf = () => {
    if (!receiptPreview?.receipt) return;

    const file = createReceiptPdfFile(receiptPreview.receipt);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    if (!receiptPreview?.imageUrl) return;

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${receiptPreview.receipt.receipt_number}</title>
          <style>
            body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: #eef3fb; }
            img { max-width: 96vw; max-height: 96vh; }
          </style>
        </head>
        <body>
          <img src="${receiptPreview.imageUrl}" alt="${receiptPreview.receipt.receipt_number}" />
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const columns = [
    {
      key: "member_id",
      label: "Member",
      width: "180px",
      render: (_, row) => tenantMembers.find((member) => member.id === row.member_id)?.member_name || "-",
    },
    {
      key: "chit_group_id",
      label: "Chit Group",
      width: "210px",
      render: (_, row) => getMemberGroupName({ chit_group_id: row.chit_group_id }, tenantGroups),
    },
    { key: "collection_month", label: "Month", width: "100px" },
    {
      key: "installment_amount",
      label: "Installment",
      width: "120px",
      render: (val) => formatCurrency(val),
    },
    {
      key: "fine_amount",
      label: "Fine",
      width: "100px",
      render: (val) => formatCurrency(val),
    },
    {
      key: "discount_amount",
      label: "Discount",
      width: "110px",
      render: (val) => formatCurrency(val),
    },
    {
      key: "dividend_adjustment",
      label: "Dividend Adj.",
      width: "130px",
      render: (val) => formatCurrency(val),
    },
    {
      key: "paid_amount",
      label: "Paid",
      width: "110px",
      render: (val) => formatCurrency(val),
    },
    {
      key: "pending_amount",
      label: "Balance",
      width: "110px",
      render: (val) => formatCurrency(val),
    },
    { key: "payment_method", label: "Mode", width: "120px" },
    {
      key: "payment_date",
      label: "Date",
      width: "120px",
      render: (val) => new Date(val).toLocaleDateString("en-IN"),
    },
    {
      key: "is_partial",
      label: "Partial?",
      width: "90px",
      render: (val) => (
        <Badge label={val ? "Yes" : "No"} variant={val ? "warning" : "success"} size="small" />
      ),
    },
  ];

  const actions = [
    { icon: <Eye size={16} />, label: "Preview Receipt", onClick: openReceiptPreview, variant: "default" },
    { icon: <ReceiptText size={16} />, label: "Receipt", onClick: openReceiptPreview, variant: "primary" },
  ];

  return (
    <ChitLayout
      title="Collections"
      subtitle={`${CHIT_PRODUCT_NAME} member payments and WhatsApp image receipts`}
      actions={
        <Button variant="primary" icon={<Plus size={16} />} onClick={openRecordModal}>
          Record Collection
        </Button>
      }
    >
      <div className="collections-page">
        <div className="collections-tenant-banner">
          <div>
            <span>Active tenant</span>
            <strong>{activeTenantContext?.tenant_id || "No tenant selected"}</strong>
          </div>
          <Badge
            label={activeTenantContext?.data_scope || "no_scope"}
            variant={activeTenantContext?.data_scope === "demo_sandbox" ? "warning" : "success"}
            size="small"
          />
        </div>

        <div className="collections-summary-grid">
          <div>
            <span>Collections Saved</span>
            <strong>{collections.length}</strong>
          </div>
          <div>
            <span>Total Paid</span>
            <strong>
              {formatCurrency(collections.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0))}
            </strong>
          </div>
          <div>
            <span>Total Balance</span>
            <strong>
              {formatCurrency(collections.reduce((sum, item) => sum + Number(item.pending_amount || 0), 0))}
            </strong>
          </div>
        </div>

        <div className="collections-table-card">
          <Table columns={columns} data={collections} actions={actions} />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Record Collection Payment"
        size="large"
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="collection-modal-actions">
            <Button variant="default" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveCollection}>
              Save & Preview Receipt
            </Button>
          </div>
        }
      >
        <div className="collection-form">
          {formError && <div className="collection-form-error">{formError}</div>}
          <FormField
            label="Member"
            type="select"
            value={formData.member_id}
            onChange={(value) => updateForm("member_id", value)}
            options={memberOptions}
            required
          />
          <FormField
            label="Chit Group"
            type="select"
            value={formData.chit_group_id}
            onChange={(value) => updateForm("chit_group_id", value)}
            options={groupOptions}
            required
          />
          <FormField
            label="Month"
            type="month"
            value={formData.collection_month}
            onChange={(value) => updateForm("collection_month", value)}
            required
          />
          <FormField
            label="Paid Amount"
            type="number"
            value={formData.paid_amount}
            onChange={(value) => updateForm("paid_amount", value)}
            required
          />
          <FormField
            label="Fine"
            type="number"
            value={formData.fine_amount}
            onChange={(value) => updateForm("fine_amount", value)}
          />
          <FormField
            label="Discount"
            type="number"
            value={formData.discount_amount}
            onChange={(value) => updateForm("discount_amount", value)}
          />
          <FormField
            label="Dividend Adjustment"
            type="number"
            value={formData.dividend_adjustment}
            onChange={(value) => updateForm("dividend_adjustment", value)}
          />
          <FormField
            label="Payment Date"
            type="date"
            value={formData.payment_date}
            onChange={(value) => updateForm("payment_date", value)}
            required
          />
          <FormField
            label="Payment Mode"
            type="select"
            value={formData.payment_method}
            onChange={(value) => updateForm("payment_method", value)}
            options={[
              { value: "Cash", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "Cheque", label: "Cheque" },
            ]}
            required
          />
          <FormField
            label="Collected By"
            value={formData.collected_by}
            onChange={(value) => updateForm("collected_by", value)}
            required
          />
          <FormField
            label="Notes"
            type="textarea"
            value={formData.notes}
            onChange={(value) => updateForm("notes", value)}
          />
          <div className="collection-member-preview">
            <span>WhatsApp will be sent to</span>
            <strong>{selectedMember?.whatsapp_number || selectedMember?.mobile_number || "No number selected"}</strong>
            <p>{selectedGroup ? `${selectedGroup.chit_name} - ${formatCurrency(selectedGroup.monthly_amount)}` : "Select member and chit group"}</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(receiptPreview)}
        title="Payment Successful"
        size="large"
        onClose={() => setReceiptPreview(null)}
        footer={
          <div className="payment-success-actions">
            <Button variant="default" icon={<Printer size={16} />} onClick={printReceipt}>
              Print Receipt
            </Button>
            <Button variant="default" icon={<FileText size={16} />} onClick={downloadReceiptPdf}>
              Download PDF
            </Button>
            <Button variant="success" icon={<MessageCircle size={16} />} onClick={sendWhatsAppReceipt}>
              WhatsApp Image
            </Button>
            <Button variant="success" icon={<FileText size={16} />} onClick={sendWhatsAppPdf}>
              WhatsApp PDF
            </Button>
            <Button variant="danger" icon={<X size={16} />} onClick={() => setReceiptPreview(null)}>
              Close
            </Button>
          </div>
        }
      >
        {receiptPreview && (
          <div className="receipt-preview-screen">
            <div className="payment-success-panel">
              <div className="payment-success-icon">✓</div>
              <span>Payment Successful</span>
              <h3>Receipt No: {receiptPreview.receipt.receipt_number}</h3>
              <p>
                {receiptPreview.receipt.member_name} paid{" "}
                {formatCurrency(receiptPreview.receipt.paid_amount)} for {receiptPreview.receipt.month}.
              </p>
              <p>
                Balance: {formatCurrency(receiptPreview.receipt.balance_amount)}
              </p>
              <p>
                WhatsApp: {receiptPreview.receipt.whatsapp_number || "Not available"}
              </p>
            </div>
            <div className="receipt-image-frame">
              <img src={receiptPreview.imageUrl} alt={`Receipt ${receiptPreview.receipt.receipt_number}`} />
            </div>
          </div>
        )}
      </Modal>
    </ChitLayout>
  );
}

export default Collections;
