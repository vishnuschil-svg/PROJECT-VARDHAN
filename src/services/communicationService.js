import { CommunicationRepository } from "../repositories/CommunicationRepository.js";
import { COMMUNICATION_PROVIDERS } from "../communication/providers.js";

export const MESSAGE_TYPES = ["WELCOME","OTP","RECEIPT", "PAYMENT_DUE", "PAYMENT_PENDING", "AUCTION_REMINDER", "LUCKY_DRAW_REMINDER", "WINNER_ANNOUNCEMENT", "PAYOUT_UPDATE","SUPPORT_UPDATE", "BIRTHDAY", "FESTIVAL", "GENERAL_ANNOUNCEMENT", "CUSTOM_BROADCAST"];
export const TEMPLATE_VARIABLES=["business","member","chit","amount","receipt","date","branch","contact","paymentLink","language"];

export function createMessageJob(input, activeTenantContext) {
  const existing = CommunicationRepository.listJobs(activeTenantContext).find((job) => job.dedupeKey === input.dedupeKey);
  if (existing) return { success: false, job: existing, message: "Duplicate send prevented." };
  const provider=COMMUNICATION_PROVIDERS[input.channel];
  const job = CommunicationRepository.saveJob({
    ...input,
    status: input.channel === "MANUAL_SHARE" ? "MANUAL_ACTION_REQUIRED" : provider?.isConfigured() ? "READY" : "PROVIDER_NOT_CONFIGURED",
    providerName:provider?.name||"Manual share",
    createdAt: new Date().toISOString(),
  }, activeTenantContext);
  return { success: true, job, manualLink: buildManualLink(job) };
}

export async function deliverMessageJob(job,activeTenantContext){const provider=COMMUNICATION_PROVIDERS[job.channel];if(!provider?.isConfigured())throw new Error(`${provider?.name||job.channel} is not configured. No message was sent.`);const result=await provider.send(job);return CommunicationRepository.saveJob({...job,status:"DELIVERED",providerResult:result,deliveredAt:new Date().toISOString()},activeTenantContext)}

export function previewMessage(template, data = {}) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}
export function validateTemplate(template){const variables=[...String(template||"").matchAll(/\{\{(\w+)\}\}/g)].map(match=>match[1]);const unsupported=variables.filter(key=>!TEMPLATE_VARIABLES.includes(key));return{valid:unsupported.length===0,variables,unsupported}}

function buildManualLink(job) {
  if (job.channel !== "WHATSAPP" && job.channel !== "MANUAL_SHARE") return "";
  return `https://wa.me/?text=${encodeURIComponent(job.body || "")}`;
}
