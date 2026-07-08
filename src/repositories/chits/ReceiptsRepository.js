import { LocalStorageRepository } from "./LocalStorageRepository";

export const ReceiptsRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.receipts.v1",
  entityName: "receipt",
  searchableFields: [
    "receipt_number",
    "collection_id",
    "member_id",
    "group_id",
    "payment_method",
    "notes",
  ],
  normalize: (receipt) => ({
    ...receipt,
    amount: Number(receipt.amount || 0),
    can_print_pdf: Boolean(receipt.can_print_pdf),
    can_print_whatsapp: Boolean(receipt.can_print_whatsapp),
  }),
  sort: (a, b) => new Date(b.created_at || b.payment_date || 0) - new Date(a.created_at || a.payment_date || 0),
});
