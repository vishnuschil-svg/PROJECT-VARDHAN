import { InstallmentNumber } from "../valueObjects/InstallmentNumber.js";
import { createValidation } from "./ChitValidator.js";

const VALID_PAYMENT_MODES = ["cash", "bank", "upi", "cheque", "online", "card", "wallet", "bank transfer"];

export const CollectionValidator = {
  validateCollection({ collection = {}, group = {}, collections = [], receipts = [] } = {}) {
    return this.validatePayment({
      formData: {
        member_id: collection.member_id || collection.memberId,
        chit_group_id: collection.group_id || collection.chit_group_id || collection.groupId,
        installment_month: collection.installment_month || collection.installmentNumber,
        payment_method: collection.payment_method || collection.paymentMode,
        paid_amount: collection.paid_amount || collection.paidAmount,
        fine_amount: collection.fine_amount || collection.fineAmount,
        discount_amount: collection.discount_amount || collection.discountAmount,
        receipt_number: collection.receipt_number || collection.receiptNumber,
      },
      member: { id: collection.member_id || collection.memberId, status: "active" },
      group,
      collections,
      receipts,
      payableAmount: Number(collection.installment_amount || collection.installmentAmount || group.monthly_amount || 0),
      paidAmount: Number(collection.paid_amount || collection.paidAmount || 0),
      receiptNumber: collection.receipt_number || collection.receiptNumber,
    });
  },

  validatePayment({
    formData = {},
    member,
    group,
    collections = [],
    receipts = [],
    payableAmount = 0,
    paidAmount = 0,
    advanceAmount = 0,
    receiptNumber = "",
  } = {}) {
    const errors = [];
    const warnings = [];
    const installment = new InstallmentNumber(formData.installment_month);
    const installmentMonth = installment.toNumber();
    const paymentMode = String(formData.payment_method || "").toLowerCase();
    const sameInstallment = collections.filter((collection) =>
      (collection.member_id || collection.memberId) === formData.member_id &&
      (collection.group_id || collection.chit_group_id || collection.groupId) === formData.chit_group_id &&
      Number(collection.installment_month || collection.installmentNumber || 0) === installmentMonth
    );
    const existingInstallments = collections
      .filter((collection) =>
        (collection.member_id || collection.memberId) === formData.member_id &&
        (collection.group_id || collection.chit_group_id || collection.groupId) === formData.chit_group_id
      )
      .map((collection) => Number(collection.installment_month || collection.installmentNumber || 0))
      .filter(Boolean);
    const nextInstallment = existingInstallments.length ? Math.max(...existingInstallments) + 1 : 1;
    const existingPending = sameInstallment.reduce(
      (sum, collection) => sum + Number(collection.pending_amount || collection.pendingAmount || 0),
      0
    );

    if (!member?.id) errors.push("Missing member.");
    if (!group?.id) errors.push("Missing group.");
    if (member?.id && String(member.status || "active").toLowerCase() !== "active") {
      errors.push("Inactive member cannot make a collection.");
    }
    if (group?.id && String(group.status || "").toLowerCase() !== "active") {
      errors.push("Inactive group cannot accept collection.");
    }
    if (!installment.isValid(group?.total_months || group?.totalMonths || 0)) {
      errors.push("Wrong installment month.");
    }
    if (installmentMonth > nextInstallment) errors.push("Future installment is not allowed before sequence.");
    if (sameInstallment.length && existingPending <= 0) {
      errors.push("Duplicate payment detected for this member and installment.");
    }
    if (receiptNumber && receipts.some((receipt) => (receipt.receipt_number || receipt.receiptNumber) === receiptNumber)) {
      errors.push("Duplicate receipt detected.");
    }
    if (isMonthClosed(collections, formData.chit_group_id, installmentMonth)) {
      errors.push("Cannot collect after month close.");
    }
    if (!VALID_PAYMENT_MODES.includes(paymentMode)) errors.push("Invalid payment mode.");
    if (
      paidAmount < 0 ||
      Number(formData.fine_amount || 0) < 0 ||
      Number(formData.discount_amount || 0) < 0 ||
      Number(formData.dividend_adjustment || 0) < 0
    ) {
      errors.push("Negative amount is not allowed.");
    }
    if (paidAmount === 0) errors.push("Zero amount is not allowed.");
    if (advanceAmount > 0) warnings.push("Over payment will be tracked as advance.");
    if (payableAmount > paidAmount) warnings.push("Partial or pending payment will update pending collections.");

    return createValidation(errors, warnings);
  },
};

function isMonthClosed(collections, groupId, installmentMonth) {
  return collections.some((collection) =>
    (collection.group_id || collection.chit_group_id || collection.groupId) === groupId &&
    Number(collection.installment_month || collection.installmentNumber || 0) === Number(installmentMonth || 0) &&
    String(collection.month_status || collection.monthStatus || "").toLowerCase() === "closed"
  );
}
