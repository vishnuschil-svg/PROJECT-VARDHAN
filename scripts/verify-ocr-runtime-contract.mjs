import fs from "node:fs";

const checks = [
  ["vite.config.js", /["']\/api["']\s*:\s*\{[\s\S]*target:\s*backendTarget/, "Vite /api proxy"],
  ["backend/main.py", /include_router\(build_ocr_router\(workspace_context\), prefix="\/api"\)/, "FastAPI /api OCR prefix"],
  ["backend/main.py", /_load_env_file\(_BACKEND_DIR \/ "\.env"\)/, "backend/.env auto-load"],
  ["backend/main.py", /"ocrProvider": provider_ready/, "safe readiness health field"],
  ["src/ai/providers/ExternalOCRProviderAdapter.js", /DEFAULT_API_BASE = "\/api"/, "frontend API base"],
  ["src/ai/providers/ExternalOCRProviderAdapter.js", /backendMessage = typeof result\?\.detail === "string"/, "exact backend error propagation"],
  ["src/ai/providers/ExternalOCRProviderAdapter.js", /Authorization: `Bearer \$\{accessToken\}`/, "current Supabase bearer token forwarding"],
  ["src/ai/providers/ExternalOCRProviderAdapter.js", /"X-Workspace-Id": workspaceId/, "active workspace header forwarding"],
  ["src/services/ai/smartChitReviewService.js", /generate = generateBusinessUnderstanding/, "production Smart Chit extraction pipeline"],
  ["src/services/ai/smartChitReviewService.js", /dependencies\.saveDraftImpl \|\| saveBusinessUnderstandingDraft/, "tenant-scoped draft persistence"],
  ["src/components/ai/SmartChitCapture.jsx", /Create Chit \/ Record/, "editable review confirmation action"],
  ["src/components/ai/SmartChitCapture.jsx", /loadSmartChitDraft/, "saved draft reload path"],
  ["src/repositories/supabase/AIChitExtractionRepository.js", /delete_pending_ai_chit_draft/, "scoped pending-draft cleanup path"],
];

let failed = false;
for (const [file, pattern, label] of checks) {
  const content = fs.readFileSync(file, "utf8");
  const ok = pattern.test(content);
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  failed ||= !ok;
}
if (failed) process.exit(1);
