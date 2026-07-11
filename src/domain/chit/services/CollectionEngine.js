import { CollectionValidator } from "../validators/CollectionValidator.js";
import { PayableResolutionEngine } from "./PayableResolutionEngine.js";

export const PAYMENT_TYPES = {
  FULL: "Full Payment",
  PARTIAL: "Partial Payment",
  ADVANCE: "Advance Payment",
  PENDING: "Pending Payment",
  LATE: "Late Payment",
  ADJUSTMENT: "Adjustment Entry",
};

export const CollectionEngine = {
  buildDraft({ formData = {}, member = null, group = null, collections = [], receipts = [], scheduleRow = null, ruleSet = null, memberState = null } = {}) {
    const installmentAmount = Number(scheduleRow?.standardPayment || group?.monthly_amount || formData.installment_amount || 0);
    const fineAmount = Number(formData.fine_amount || 0);
    const discountAmount = Number(formData.discount_amount || 0);
    const dividendAdjustment = Number(formData.dividend_adjustment || 0);
    const paidAmount = Number(formData.paid_amount || 0);
    const alreadyPaid = getAlreadyPaidForInstallment(collections, formData);
    const resolution = scheduleRow
      ? PayableResolutionEngine.resolve({
          group,
          ruleSet,
          scheduleRow,
          memberState,
          installmentMonth: formData.installment_month,
          previousPayments: collections.filter((collection) =>
            (collection.member_id || collection.memberId) === formData.member_id &&
            (collection.group_id || collection.chit_group_id || collection.groupId) === formData.chit_group_id &&
            Number(collection.installment_month || collection.installmentNumber || 0) === Number(formData.installment_month || 0)
          ),
          penaltyAmount: fineAmount,
          manualAdjustment: discountAmount || dividendAdjustment ? -discountAmount - dividendAdjustment : 0,
        })
      : null;
    const monthlyPayable = resolution?.scheduleAmount ?? Math.max(
      installmentAmount + fineAmount - discountAmount - dividendAdjustment,
      0
    );
    const payableAmount = resolution?.finalPayable ?? Math.max(monthlyPayable - alreadyPaid, 0);
    const pendingAmount = Math.max(payableAmount - paidAmount, 0);
    const advanceAmount = Math.max(paidAmount - payableAmount, 0);
    const receiptNumber = formData.receipt_number || buildReceiptNumber(receipts, collections);
    const paymentType = resolvePaymentType({
      paidAmount,
      payableAmount,
      pendingAmount,
      advanceAmount,
      fineAmount,
      isAdjustment: Boolean(discountAmount || dividendAdjustment),
    });
    const validation = CollectionValidator.validatePayment({
      formData,
      member,
      group,
      collections,
      receipts,
      payableAmount,
      paidAmount,
      pendingAmount,
      advanceAmount,
      receiptNumber,
    });

    return {
      member,
      group,
      installmentAmount,
      monthlyPayable,
      alreadyPaid,
      payableAmount,
      paidAmount,
      pendingAmount,
      advanceAmount,
      paymentType,
      receiptNumber,
      validation,
      payableResolution: resolution,
      summary: {
        monthlyPayable,
        installment: installmentAmount,
        alreadyPaid,
        fine: fineAmount,
        discount: discountAmount,
        dividendAdjustment,
        payable: payableAmount,
        paid: paidAmount,
        pending: pendingAmount,
        advance: advanceAmount,
      },
    };
  },
};

function resolvePaymentType({ paidAmount, payableAmount, pendingAmount, advanceAmount, fineAmount, isAdjustment }) {
  if (isAdjustment) return PAYMENT_TYPES.ADJUSTMENT;
  if (fineAmount > 0) return PAYMENT_TYPES.LATE;
  if (advanceAmount > 0) return PAYMENT_TYPES.ADVANCE;
  if (paidAmount === 0 && payableAmount > 0) return PAYMENT_TYPES.PENDING;
  if (pendingAmount > 0) return PAYMENT_TYPES.PARTIAL;
  return PAYMENT_TYPES.FULL;
}

function buildReceiptNumber(receipts, collections) {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existingNumbers = new Set([
    ...receipts.map((receipt) => receipt.receipt_number || receipt.receiptNumber),
    ...collections.map((collection) => collection.receipt_number || collection.receiptNumber),
  ].filter(Boolean));
  let sequence = existingNumbers.size + 1;
  let receiptNumber = `MNC-${dateKey}-${String(sequence).padStart(5, "0")}`;

  while (existingNumbers.has(receiptNumber)) {
    sequence += 1;
    receiptNumber = `MNC-${dateKey}-${String(sequence).padStart(5, "0")}`;
  }

  return receiptNumber;
}

function getAlreadyPaidForInstallment(collections, formData) {
  return collections
    .filter((collection) =>
      (collection.member_id || collection.memberId) === formData.member_id &&
      (collection.group_id || collection.chit_group_id || collection.groupId) === formData.chit_group_id &&
      Number(collection.installment_month || 0) === Number(formData.installment_month || 0)
    )
    .reduce((sum, collection) => sum + Number(collection.paid_amount || collection.paidAmount || 0), 0);
}
