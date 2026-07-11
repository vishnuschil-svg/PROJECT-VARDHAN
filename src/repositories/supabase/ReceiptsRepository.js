import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const ReceiptsRepository = new SupabaseRepository({
  tableName: "chit_receipts",
  searchableFields: [
    "receipt_number",
    "collection_id",
    "member_id",
    "group_id",
    "payment_method",
    "notes",
  ],
  normalizeInput: (receipt) => ({
    ...receipt,
    receipt_number: receipt.receipt_number || receipt.receiptNumber,
    collection_id: receipt.collection_id || receipt.collectionId,
    member_id: receipt.member_id || receipt.memberId,
    group_id: receipt.group_id || receipt.groupId,
    amount: Number(receipt.amount || receipt.amountPaid || 0),
    payment_method: receipt.payment_method || receipt.paymentMode,
  }),
});
