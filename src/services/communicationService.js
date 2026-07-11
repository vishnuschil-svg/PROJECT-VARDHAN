import { CommunicationRepository } from "../repositories/CommunicationRepository.js";

export const MESSAGE_TYPES = ["RECEIPT", "PAYMENT_DUE", "PAYMENT_PENDING", "AUCTION_REMINDER", "LUCKY_DRAW_REMINDER", "WINNER_ANNOUNCEMENT", "PAYOUT_UPDATE", "BIRTHDAY", "FESTIVAL", "GENERAL_ANNOUNCEMENT", "CUSTOM_BROADCAST"];

export function createMessageJob(input, activeTenantContext) {
  const existing = CommunicationRepository.listJobs(activeTenantContext).find((job) => job.dedupeKey === input.dedupeKey);
  if (existing) return { success: false, job: existing, message: "Duplicate send prevented." };
  const job = CommunicationRepository.saveJob({
    ...input,
    status: input.channel === "MANUAL_SHARE" ? "MANUAL_ACTION_REQUIRED" : "READY",
    createdAt: new Date().toISOString(),
  }, activeTenantContext);
  return { success: true, job, manualLink: buildManualLink(job) };
}

export function previewMessage(template, data = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function buildManualLink(job) {
  if (job.channel !== "WHATSAPP" && job.channel !== "MANUAL_SHARE") return "";
  return `https://wa.me/?text=${encodeURIComponent(job.body || "")}`;
}
