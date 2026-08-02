import { Eye, FileText, MessageCircle, Plus, Printer, ReceiptText, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChitLayout from "../../components/chit/ChitLayout";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import HelpButton from "../../components/common/HelpButton";
import { getMemberGroupName } from "../../config/chitMemberData";
import { formatCurrency } from "../../config/chitPhaseOneData";
import {
  buildWhatsAppReceiptMessage,
  createReceiptImageFile,
  createReceiptImageUrl,
  createReceiptPdfFile,
  createReceiptPayload,
  normalizeWhatsAppNumber,
} from "../../config/chitReceiptImage";
import { CHIT_PRODUCT_NAME } from "../../config/erpModules";
import { useAuth } from "../../hooks/useAuth";
import { useTenantCollections } from "../../services/chitCollectionsStore";
import {
  listTenantGroupsPersistent,
  listTenantMembersPersistent,
  listTenantReceiptsPersistent,
} from "../../services/chitDataService";
import {
  buildCollectionDraft,
  getCollectionPageModel,
  recordCollectionPayment,
} from "../../services/collectionService";
import "./Collections.css";

const EMPTY_COLLECTION = {
  member_id: "",
  chit_group_id: "",
  collection_month: new Date().toISOString().slice(0, 7),
  installment_month: "1",
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_COLLECTION);
  const [memberSearch, setMemberSearch] = useState("");
  const [errorDialog, setErrorDialog] = useState(null);
  const [successToast, setSuccessToast] = useState("");
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [tenantGroups, setTenantGroups] = useState([]);
  const [tenantMembers, setTenantMembers] = useState([]);
  const [tenantReceipts, setTenantReceipts] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const [groups, members, receipts] = await Promise.all([
          listTenantGroupsPersistent(activeTenantContext),
          listTenantMembersPersistent(activeTenantContext),
          listTenantReceiptsPersistent(activeTenantContext),
        ]);
        if (cancelled) return;
        setTenantGroups(groups);
        setTenantMembers(members);
        setTenantReceipts(receipts);
        setLoadError("");
      } catch (error) {
        if (cancelled) return;
        setTenantGroups([]);
        setTenantMembers([]);
        setTenantReceipts([]);
        setLoadError(error.message || "Unable to load collection reference data.");
      }
    }

    loadReferenceData();
    return () => {
      cancelled = true;
    };
  }, [activeTenantContext, collections.length]);

  const pageModel = useMemo(
    () =>
      getCollectionPageModel({
        activeTenantContext,
        groups: tenantGroups,
        members: tenantMembers,
        collections,
      }),
    [activeTenantContext, collections, tenantGroups, tenantMembers]
  );
  const draft = useMemo(
    () =>
      buildCollectionDraft({
        formData,
        members: tenantMembers,
        groups: tenantGroups,
        activeTenantContext,
        collections,
        receipts: tenantReceipts,
      }),
    [activeTenantContext, formData, tenantGroups, tenantMembers, collections, tenantReceipts]
  );
  const filteredMembers = useMemo(
    () => filterMembers(tenantMembers, memberSearch),
    [tenantMembers, memberSearch]
  );

  const memberOptions = filteredMembers.map((member) => ({
    value: member.id,
    label: `${member.member_name} (${member.member_number})`,
  }));
  const groupOptions = tenantGroups.map((group) => ({
    value: group.id,
    label: `${group.chit_name} (${formatCurrency(group.monthly_amount)}/month)`,
  }));

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
    setMemberSearch("");
    setErrorDialog(null);
    setIsModalOpen(true);
  };

  const updateForm = (field, value) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "member_id") {
        const member = tenantMembers.find((item) => item.id === value);
        const group = tenantGroups.find((item) => item.id === member?.chit_group_id);
        next.chit_group_id = group?.id || next.chit_group_id;
        next.paid_amount = group?.monthly_amount || next.paid_amount;
      }

      if (field === "chit_group_id") {
        const group = tenantGroups.find((item) => item.id === value);
        next.paid_amount = group?.monthly_amount || next.paid_amount;
      }

      return next;
    });
  };

  const requestSave = () => {
    if (!draft.validation.isValid) {
      setErrorDialog({
        title: "Collection validation failed",
        message: draft.validation.errors[0],
        details: draft.validation.errors,
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);

    try {
      const result = await recordCollectionPayment({
        formData,
        members: tenantMembers,
        groups: tenantGroups,
        activeTenantContext,
        companyName: company?.company_name || "VARDHAN Own Chit Business",
        collections,
        receipts: tenantReceipts,
      });

      if (!result.success) {
        setErrorDialog({
          title: "Collection not saved",
          message: result.message,
          details: result.draft?.validation?.errors || [],
        });
        return;
      }

      setReceiptPreview(result.receiptPreview);
      setIsModalOpen(false);
      setSuccessToast(result.message);
      window.setTimeout(() => setSuccessToast(""), 3200);
    } catch (error) {
      setErrorDialog({
        title: "Collection not saved",
        message: error.message || "Unexpected collection error.",
        details: [error.message || "Unexpected collection error."],
      });
    } finally {
      setIsSaving(false);
      setIsConfirmOpen(false);
    }
  };

  const openReceiptPreview = (collection) => {
    const member = tenantMembers.find((item) => item.id === collection.member_id);
    const groupId = collection.chit_group_id || collection.group_id;
    const group = tenantGroups.find((item) => item.id === groupId);
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
      await navigator.share({ title: `Receipt ${receipt.receipt_number}`, text: message, files: [file] });
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
      await navigator.share({ title: `Receipt ${receipt.receipt_number}`, text: message, files: [file] });
      return;
    }

    downloadReceiptPdf();
    const phone = normalizeWhatsAppNumber(receipt.whatsapp_number);
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`${message}\n\nPDF receipt has been generated.`)}`
      : `https://wa.me/?text=${encodeURIComponent(`${message}\n\nPDF receipt has been generated.`)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const downloadReceiptImage = async () => {
    if (!receiptPreview?.receipt) return;

    const file = await createReceiptImageFile(receiptPreview.receipt);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
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

  const printReceipt = async () => {
    if (!receiptPreview?.receipt) return;

    const file = await createReceiptImageFile(receiptPreview.receipt);
    const imageUrl = URL.createObjectURL(file);
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
          <img src="${imageUrl}" alt="${receiptPreview.receipt.receipt_number}" />
          <script>window.onload = () => { window.print(); };</script>
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
    { key: "installment_month", label: "Inst.", width: "80px" },
    { key: "payment_type", label: "Type", width: "150px" },
    { key: "collection_month", label: "Month", width: "100px" },
    { key: "installment_amount", label: "Installment", width: "120px", render: formatCurrency },
    { key: "paid_amount", label: "Paid", width: "110px", render: formatCurrency },
    { key: "pending_amount", label: "Balance", width: "110px", render: formatCurrency },
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
      render: (val) => <Badge label={val ? "Yes" : "No"} variant={val ? "warning" : "success"} size="small" />,
    },
  ];

  const actions = [
    { icon: <Eye size={16} />, label: "Preview Receipt", onClick: openReceiptPreview, variant: "default" },
    { icon: <ReceiptText size={16} />, label: "Receipt", onClick: openReceiptPreview, variant: "primary" },
  ];

  return (
    <ChitLayout
      title="Collections"
      subtitle={`${CHIT_PRODUCT_NAME} production installment collection workflow`}
      actions={
        <><Button variant="primary" icon={<Plus size={16} />} onClick={openRecordModal}>Record Collection</Button><HelpButton feature="COLLECTIONS" variant="secondary"/></>
      }
    >
      <div className="collections-page">
        {successToast && <div className="collection-toast">{successToast}</div>}
        {loadError && <div className="collection-toast collection-toast-error">{loadError}</div>}

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
          {pageModel.summary.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="collections-table-card">
          {collections.length ? (
            <Table columns={columns} data={collections} actions={actions} />
          ) : (
            <div className="collection-empty-state">
              <ReceiptText size={34} />
              <h3>{pageModel.emptyState.title}</h3>
              <p>{pageModel.emptyState.message}</p>
              <Button variant="primary" icon={<Plus size={16} />} onClick={openRecordModal}>
                Record First Collection
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Record Collection Payment"
        size="large"
        onClose={() => setIsModalOpen(false)}
        footer={
          <div className="collection-modal-actions">
            <Button variant="default" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={requestSave} loading={isSaving}>
              Validate & Continue
            </Button>
          </div>
        }
      >
        <form className="collection-form" onSubmit={(event) => { event.preventDefault(); requestSave(); }}>
          <div className="collection-search-field">
            <label htmlFor="collection-member-search">
              <Search size={16} />
              Fast Member Search
            </label>
            <input
              id="collection-member-search"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search by name, member no, mobile"
              autoFocus
            />
          </div>
          <FormField label="Member" type="select" value={formData.member_id} onChange={(value) => updateForm("member_id", value)} options={memberOptions} required />
          <FormField label="Chit Group" type="select" value={formData.chit_group_id} onChange={(value) => updateForm("chit_group_id", value)} options={groupOptions} required />
          <FormField label="Installment Month" type="number" value={formData.installment_month} onChange={(value) => updateForm("installment_month", value)} required />
          <FormField label="Collection Month" type="month" value={formData.collection_month} onChange={(value) => updateForm("collection_month", value)} required />
          <FormField label="Paid Amount" type="number" value={formData.paid_amount} onChange={(value) => updateForm("paid_amount", value)} required />
          <FormField label="Fine" type="number" value={formData.fine_amount} onChange={(value) => updateForm("fine_amount", value)} />
          <FormField label="Discount" type="number" value={formData.discount_amount} onChange={(value) => updateForm("discount_amount", value)} />
          <FormField label="Dividend Adjustment" type="number" value={formData.dividend_adjustment} onChange={(value) => updateForm("dividend_adjustment", value)} />
          <FormField label="Payment Date" type="date" value={formData.payment_date} onChange={(value) => updateForm("payment_date", value)} required />
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
          <FormField label="Collected By" value={formData.collected_by} onChange={(value) => updateForm("collected_by", value)} required />
          <FormField label="Notes" type="textarea" value={formData.notes} onChange={(value) => updateForm("notes", value)} />

          <PaymentSummary draft={draft} />
        </form>
      </Modal>

      <Modal
        isOpen={isConfirmOpen}
        title="Confirm Collection"
        onClose={() => setIsConfirmOpen(false)}
        footer={
          <div className="collection-modal-actions">
            <Button variant="default" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Review
            </Button>
            <Button variant="primary" onClick={confirmSave} loading={isSaving}>
              Confirm & Generate Receipt
            </Button>
          </div>
        }
      >
        <PaymentSummary draft={draft} compact />
        {draft.validation.warnings.length > 0 && (
          <div className="collection-warning-list">
            {draft.validation.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(errorDialog)}
        title={errorDialog?.title || "Collection Error"}
        onClose={() => setErrorDialog(null)}
        footer={
          <Button variant="danger" icon={<X size={16} />} onClick={() => setErrorDialog(null)}>
            Close
          </Button>
        }
      >
        <div className="collection-error-dialog">
          <p>{errorDialog?.message}</p>
          {(errorDialog?.details || []).map((detail) => <span key={detail}>{detail}</span>)}
        </div>
      </Modal>

      <ReceiptSuccessModal
        receiptPreview={receiptPreview}
        onClose={() => setReceiptPreview(null)}
        onPrint={printReceipt}
        onDownloadPdf={downloadReceiptPdf}
        onWhatsAppImage={sendWhatsAppReceipt}
        onWhatsAppPdf={sendWhatsAppPdf}
      />
    </ChitLayout>
  );
}

function PaymentSummary({ draft, compact = false }) {
  return (
    <div className={`collection-payment-summary ${compact ? "compact" : ""}`}>
      <div>
        <span>Payment Type</span>
        <strong>{draft.paymentType}</strong>
      </div>
      <div>
        <span>Monthly Payable</span>
        <strong>{formatCurrency(draft.summary.monthlyPayable)}</strong>
      </div>
      <div>
        <span>Already Paid</span>
        <strong>{formatCurrency(draft.summary.alreadyPaid)}</strong>
      </div>
      <div>
        <span>Pending</span>
        <strong>{formatCurrency(draft.summary.pending)}</strong>
      </div>
      <div>
        <span>Advance</span>
        <strong>{formatCurrency(draft.summary.advance)}</strong>
      </div>
      <div>
        <span>Penalty</span>
        <strong>{formatCurrency(draft.summary.fine)}</strong>
      </div>
      <div>
        <span>Receipt</span>
        <strong>{draft.receiptNumber}</strong>
      </div>
      {draft.payableResolution?.explanation && (
        <div className="collection-explain-row">
          <span>Explain</span>
          <strong>{draft.payableResolution.explanation}</strong>
        </div>
      )}
    </div>
  );
}

function ReceiptSuccessModal({
  receiptPreview,
  onClose,
  onPrint,
  onDownloadPdf,
  onWhatsAppImage,
  onWhatsAppPdf,
}) {
  return (
    <Modal
      isOpen={Boolean(receiptPreview)}
      title="Payment Successful"
      size="large"
      onClose={onClose}
      footer={
        <div className="payment-success-actions">
          <Button variant="default" icon={<Printer size={16} />} onClick={onPrint}>Print Receipt</Button>
          <Button variant="default" icon={<FileText size={16} />} onClick={onDownloadPdf}>Download PDF</Button>
          <Button variant="success" icon={<MessageCircle size={16} />} onClick={onWhatsAppImage}>WhatsApp Image</Button>
          <Button variant="success" icon={<FileText size={16} />} onClick={onWhatsAppPdf}>WhatsApp PDF</Button>
          <Button variant="danger" icon={<X size={16} />} onClick={onClose}>Close</Button>
        </div>
      }
    >
      {receiptPreview && (
        <div className="receipt-preview-screen">
          <div className="payment-success-panel">
            <div className="payment-success-icon">OK</div>
            <span>Payment Successful</span>
            <h3>Receipt No: {receiptPreview.receipt.receipt_number}</h3>
            <p>{receiptPreview.receipt.member_name} paid {formatCurrency(receiptPreview.receipt.paid_amount)} for {receiptPreview.receipt.month}.</p>
            <p>Balance: {formatCurrency(receiptPreview.receipt.balance_amount)}</p>
            <p>WhatsApp: {receiptPreview.receipt.whatsapp_number || "Not available"}</p>
          </div>
          <div className="receipt-image-frame">
            <img src={receiptPreview.imageUrl} alt={`Receipt ${receiptPreview.receipt.receipt_number}`} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function filterMembers(members, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return members;

  return members.filter((member) =>
    [
      member.member_name,
      member.member_number,
      member.mobile_number,
      member.whatsapp_number,
      member.email,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery))
  );
}

export default Collections;
