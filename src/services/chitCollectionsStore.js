import { useEffect, useMemo, useState } from "react";
import { getTenantScope } from "../repositories/chits";
import { ChitDataService } from "./chitDataService";

const STORE_EVENT = "vardhan:chit-collections-changed";

export function getCollectionScopeKey(activeTenantContext) {
  return getTenantScope(activeTenantContext).scope_key;
}

export function listCollections(activeTenantContext) {
  const scopeKey = getCollectionScopeKey(activeTenantContext);

  if (!scopeKey) {
    return [];
  }

  return ChitDataService.collections.list({
    activeTenantContext,
    pageSize: Number.MAX_SAFE_INTEGER,
  }).data;
}

export function saveCollection(collection, activeTenantContext) {
  const normalizedCollection = ChitDataService.collections.upsert(collection, { activeTenantContext });
  notifyCollectionsChanged();

  return normalizedCollection;
}

export function buildCollectionReceipts(collections = []) {
  return collections.map((collection) => ({
    id: `receipt-${collection.id}`,
    collection_id: collection.id,
    tenant_id: collection.tenant_id,
    data_scope: collection.data_scope,
    group_id: collection.group_id || collection.chit_group_id,
    member_id: collection.member_id,
    receipt_number: collection.receipt_number,
    amount: Number(collection.paid_amount || 0),
    payment_date: collection.payment_date,
    payment_method: collection.payment_method,
    notes: collection.notes || "",
    can_print_pdf: true,
    can_print_whatsapp: true,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
  }));
}

export function useTenantCollections(activeTenantContext) {
  const scopeKey = getCollectionScopeKey(activeTenantContext);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);

    window.addEventListener(STORE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(STORE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return useMemo(
    () => listCollections(activeTenantContext),
    [activeTenantContext, scopeKey, version]
  );
}

function notifyCollectionsChanged() {
  window.dispatchEvent(new CustomEvent(STORE_EVENT));
}
