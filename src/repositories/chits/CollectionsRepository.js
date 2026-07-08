import { LocalStorageRepository } from "./LocalStorageRepository";

export const CollectionsRepository = new LocalStorageRepository({
  storageKey: "vardhan.chit.sharedCollections.v1",
  entityName: "collection",
  searchableFields: [
    "receipt_number",
    "member_id",
    "group_id",
    "chit_group_id",
    "collection_month",
    "payment_method",
    "collected_by",
    "notes",
  ],
  normalize: (collection) => ({
    ...collection,
    group_id: collection.group_id || collection.chit_group_id,
    chit_group_id: collection.chit_group_id || collection.group_id,
    installment_amount: Number(collection.installment_amount || 0),
    fine_amount: Number(collection.fine_amount || 0),
    discount_amount: Number(collection.discount_amount || 0),
    dividend_adjustment: Number(collection.dividend_adjustment || 0),
    paid_amount: Number(collection.paid_amount || 0),
    pending_amount: Number(collection.pending_amount || 0),
    is_partial: Boolean(collection.is_partial),
  }),
  sort: (a, b) => new Date(b.created_at || b.payment_date || 0) - new Date(a.created_at || a.payment_date || 0),
});
