import { AISmartCapture } from "../../ai/AISmartCapture.js";
import { AIChitPlanDesigner } from "../../ai/AIChitPlanDesigner.js";
import { AIChitDraftRepository } from "../../repositories/AIChitDraftRepository.js";

export async function captureChitPattern({ file, manualText }) {
  return AISmartCapture.capture({ file, manualText });
}

export function confirmCapturedChitDraft({ capture, corrections = {}, activeTenantContext }) {
  const draft = buildCapturedDraft({ capture, corrections });

  return AIChitDraftRepository.saveDraft(draft, activeTenantContext);
}

export function createChitGroupFromCapturedData({ capture, corrections = {}, activeTenantContext }) {
  const draft = buildCapturedDraft({ capture, corrections });

  return AIChitDraftRepository.createChitGroupFromDraft(draft, activeTenantContext);
}

function buildCapturedDraft({ capture, corrections = {} }) {
  const fields = {
    ...Object.fromEntries(Object.entries(capture.fields || {}).map(([key, field]) => [key, field.value])),
    ...corrections,
  };
  const input = {
    chitName: fields.chitName || "Captured Chit Draft",
    chitValue: parseAmount(fields.chitValue),
    members: parseAmount(fields.memberCount),
    duration: parseAmount(fields.duration),
    commission: parseAmount(fields.commission || 5),
    auctionType: "Captured Pattern",
  };
  const plan = AIChitPlanDesigner.design(input);

  return {
    ...input,
    monthlyInstallment: parseAmount(fields.monthlyPayment) || plan.schedule?.[0]?.installment || 0,
    schedule: plan.schedule || [],
    totals: plan.totals || {},
    validation: plan.validation,
    captureMode: capture.mode,
  };
}

function parseAmount(value) {
  if (Array.isArray(value)) return value.length;
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}
