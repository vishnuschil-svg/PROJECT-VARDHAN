import { AIChitPlanDesigner } from "../../ai/AIChitPlanDesigner.js";
import { AIChitDraftRepository } from "../../repositories/AIChitDraftRepository.js";

export function designAIChitPlan(input) {
  return AIChitPlanDesigner.design(input);
}

export function saveAIChitPlanDraft({ input, plan, activeTenantContext }) {
  const draft = buildDraft(input, plan);
  return AIChitDraftRepository.saveDraft(draft, activeTenantContext);
}

export function createChitGroupFromAIPlan({ input, plan, activeTenantContext }) {
  const draft = buildDraft(input, plan);
  return AIChitDraftRepository.createChitGroupFromDraft(draft, activeTenantContext);
}

function buildDraft(input = {}, plan = {}) {
  return {
    chitName: input.chitName,
    chitValue: Number(input.chitValue || plan.input?.chitValue || 0),
    members: Number(input.members || plan.input?.members || 0),
    duration: Number(input.duration || plan.input?.duration || 0),
    commission: Number(input.commission || plan.input?.commission || 0),
    auctionType: input.auctionType || plan.input?.auctionType || "Auction",
    monthlyInstallment: plan.schedule?.[0]?.installment || 0,
    schedule: plan.schedule || [],
    totals: plan.totals || {},
    validation: plan.validation || { isValid: false, errors: ["Plan not generated."], warnings: [] },
  };
}
