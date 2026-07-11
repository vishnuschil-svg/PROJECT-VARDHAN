import { PaymentSettingsRepository } from "../repositories/PaymentSettingsRepository.js";

export const PAYMENT_MODES = ["CASH", "BANK_TRANSFER", "UPI", "QR", "CHEQUE", "WALLET", "CARD", "OTHER"];

export function getPaymentSettings(activeTenantContext) {
  return PaymentSettingsRepository.get(activeTenantContext) || {
    enabledModes: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"],
    defaultMode: "CASH",
    bankAccounts: [],
    upiIds: [],
    qrMetadata: {},
    chequeSettings: {},
    cardSettings: {},
    customModes: [],
  };
}

export function savePaymentSettings(settings, activeTenantContext) {
  return PaymentSettingsRepository.save(settings, activeTenantContext);
}

export function validatePaymentMode(mode, activeTenantContext) {
  const settings = getPaymentSettings(activeTenantContext);
  const normalized = normalizePaymentMode(mode);
  return {
    isValid: settings.enabledModes.includes(normalized),
    mode: normalized,
    message: settings.enabledModes.includes(normalized) ? "Payment mode enabled." : `${normalized} is not enabled by organizer.`,
  };
}

export function normalizePaymentMode(mode) {
  return String(mode || "").toUpperCase().replace(/\s+/g, "_");
}
