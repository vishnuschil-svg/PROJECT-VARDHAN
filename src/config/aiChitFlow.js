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
  return `vardhan.ai-chit-flow.v1.${context.tenant_id || "none"}.${context.data_scope || "none"}`;
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
