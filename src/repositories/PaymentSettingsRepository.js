import { listScopedRows, upsertScopedRow } from "./scopedStorageRepository.js";

const STORAGE_KEY = "vardhan.chit.paymentSettings.v1";

export const PaymentSettingsRepository = {
  get(activeTenantContext) {
    return listScopedRows(STORAGE_KEY, activeTenantContext)[0] || null;
  },
  save(settings, activeTenantContext) {
    return upsertScopedRow(STORAGE_KEY, { id: "organizer-payment-settings", ...settings }, activeTenantContext, "payment-settings");
  },
};
