export const AI_CHIT_STEPS = Object.freeze([
  { id: "welcome", path: "/chits/ai-chit" },
  { id: "upload", path: "/chits/ai-chit/upload" },
  { id: "analyzing", path: "/chits/ai-chit/analyzing" },
  { id: "summary", path: "/chits/ai-chit/summary" },
  { id: "details", path: "/chits/ai-chit/details" },
  { id: "schedule", path: "/chits/ai-chit/schedule" },
  { id: "rules", path: "/chits/ai-chit/rules" },
  { id: "terms", path: "/chits/ai-chit/terms" },
  { id: "review", path: "/chits/ai-chit/review" },
  { id: "success", path: "/chits/ai-chit/success" },
]);

export const AI_ANALYSIS_STAGES = Object.freeze([
  "Understanding document type", "Extracting text and numbers", "Identifying tables and structure",
  "Detecting chit pattern", "Finding business rules", "Calculating relationships",
  "Checking terms and conditions", "Preparing summary",
]);

export function stepFromPath(pathname) {
  return AI_CHIT_STEPS.find((step) => step.path === pathname)?.id || "welcome";
}

export function flowStorageKey(context = {}) {
  const workspaceId = context.workspace_id || context.workspaceId || "none";
  return `vardhan.ai-chit-flow.v2.${context.tenant_id || "none"}.${context.data_scope || "none"}.${workspaceId}`;
}

export function draftIdFromSearch(search = "") {
  return new URLSearchParams(String(search || "")).get("draft") || "";
}

export function isPersistedDraftId(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

export function aiChitPath(step = "", draftId = "") {
  const base = `/chits/ai-chit${step ? `/${step}` : ""}`;
  return draftId ? `${base}?draft=${encodeURIComponent(draftId)}` : base;
}

export function confidenceStatus(confidence = 0, status = "") {
  if (status === "Missing" || Number(confidence) < 0.4) return "Missing";
  if (status === "Verified" || Number(confidence) >= 0.8) return "High";
  return "Probable";
}

export function canCreateFromAnalysis(analysis, confirmed) {
  return Boolean(confirmed && analysis && !(analysis.missingInformation || []).length);
}

export function resolveReviewItem(item, decision) {
  return { ...item, status: decision, confirmed: decision === "Confirmed", custom: decision === "Custom" };
}

export function buildOwnerConfirmedFixedSchedule({ duration, grossInstallment, installmentPattern } = {}) {
  const months = Number(duration);
  const amount = Number(grossInstallment);
  if (installmentPattern !== "FIXED_MONTHLY") {
    throw new Error("Select Fixed Monthly before rebuilding the schedule.");
  }
  if (!Number.isInteger(months) || months <= 0 || months > 1200) {
    throw new Error("Enter a valid duration before rebuilding the schedule.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid monthly installment before rebuilding the schedule.");
  }
  return Array.from({ length: months }, (_, index) => ({
    monthNumber: index + 1,
    standardPayment: amount,
    nonLiftedPayment: null,
    liftedPayment: null,
    prizeAmount: null,
    bidAmount: null,
    commissionValue: null,
    deposit: null,
    dividendPerMember: null,
    penalty: null,
    otherDeductions: null,
    netAmount: null,
    confidence: 1,
    evidence: "Owner-confirmed fixed monthly duration and installment",
    isOwnerEdited: true,
  }));
}
