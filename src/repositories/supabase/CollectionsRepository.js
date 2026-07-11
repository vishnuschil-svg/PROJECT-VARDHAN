import { SupabaseRepository } from "../../lib/supabase/SupabaseRepository.js";

export const CollectionsRepository = new SupabaseRepository({
  tableName: "chit_collections",
  searchableFields: [
    "receipt_number",
    "member_id",
    "group_id",
    "collection_month",
    "payment_method",
    "collected_by",
    "notes",
  ],
  defaultSort: { column: "payment_date", ascending: false },
  normalizeInput: (collection) => ({
    ...collection,
    group_id: collection.group_id || collection.chit_group_id || collection.groupId,
    installment_amount: Number(collection.installment_amount || collection.installmentAmount || 0),
    paid_amount: Number(collection.paid_amount || collection.paidAmount || 0),
    pending_amount: Number(collection.pending_amount || collection.pendingAmount || 0),
    payment_method: collection.payment_method || collection.paymentMode,
  }),
});
