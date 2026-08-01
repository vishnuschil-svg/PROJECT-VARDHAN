import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyReviewValue,
  deleteSmartChitDraft,
  extractSmartChitDocument,
  loadSmartChitDraft,
  mapOCRResponseToReview,
  saveSmartChitDraft,
  smartChitErrorMessage,
  validateSmartChitFile,
} from "../../services/ai/smartChitReviewService.js";
import { createEmptyDraft } from "../../domain/chit/models/DraftBusinessModel.js";
import { confirmBusinessUnderstanding, evaluateCreationReadiness } from "../../services/universalBusinessRuleService.js";

const response = {
  status: "SUCCESS",
  documentId: "8a77baea-f084-4470-a5f9-4cb678301c85",
  provider: "gemini",
  rawText: "Receipt R-104, member Anika, chit value 100000",
  documentType: "CHIT_RECEIPT",
  extraction: {
    receiptNumber: "R-104",
    chitName: "Anika Gold Chit",
    members: [{ name: "Anika", phone: "9876543210" }],
    chitValue: 100000,
    monthlyInstallment: 10000,
    durationMonths: 10,
    memberCount: 10,
    startDate: "2026-08-01",
  },
  confidence: {
    overallScore: 0.91,
    fieldScores: { receiptNumber: 0.95, chitValue: 0.93, monthlyInstallment: 0.55 },
    requiresHumanReview: true,
  },
  missingFields: ["status"],
  warnings: ["Status was not present."],
};

test("real OCR response maps extracted, missing, and low-confidence review values without defaults", () => {
  const review = mapOCRResponseToReview(response);
  assert.equal(review.provider, "gemini");
  assert.equal(review.fields.receiptNumber.value, "R-104");
  assert.equal(review.fields.memberName.value, "Anika");
  assert.equal(review.fields.chitValue.value, 100000);
  assert.equal(review.fields.installmentAmount.state, "low-confidence");
  assert.equal(review.fields.status.value, "");
  assert.equal(review.fields.status.state, "missing");
  assert.equal(review.rawText, response.rawText);
});

test("editable correction preserves the extracted value and marks only the changed field", () => {
  const original = mapOCRResponseToReview(response);
  const corrected = applyReviewValue(original, "memberName", "Anika Rao");
  assert.equal(corrected.fields.memberName.value, "Anika Rao");
  assert.equal(corrected.fields.memberName.extractedValue, "Anika");
  assert.equal(corrected.fields.memberName.state, "user-corrected");
  assert.equal(corrected.fields.memberName.corrected, true);
  assert.equal(corrected.fields.chitValue.corrected, false);
});

test("upload validation accepts production formats and rejects invalid or oversized files", () => {
  assert.equal(validateSmartChitFile(new File(["png"], "receipt.png", { type: "image/png" })).valid, true);
  assert.equal(validateSmartChitFile(new File(["pdf"], "receipt.pdf", { type: "application/pdf" })).valid, true);
  assert.equal(validateSmartChitFile(new File(["x"], "receipt.svg", { type: "image/svg+xml" })).code, "UNSUPPORTED_FILE");
  assert.equal(validateSmartChitFile({ name: "huge.png", type: "image/png", size: 16 * 1024 * 1024 }).code, "FILE_TOO_LARGE");
});

test("session, workspace, provider and malformed-response errors remain safe and actionable", () => {
  assert.match(smartChitErrorMessage({ code: "SESSION_EXPIRED" }), /sign in/i);
  assert.match(smartChitErrorMessage({ code: "WORKSPACE_ACCESS_DENIED" }), /workspace/i);
  assert.match(smartChitErrorMessage({ code: "OCR_PROVIDER_UNAVAILABLE" }), /temporarily unavailable/i);
  assert.match(smartChitErrorMessage({ code: "OCR_SCHEMA_INVALID" }), /malformed/i);
  assert.doesNotMatch(smartChitErrorMessage({ message: "database password secret" }), /password|secret/i);
});

test("successful extraction requires and forwards the active workspace", async () => {
  let receivedWorkspace = null;
  const file = new File(["png"], "receipt.png", { type: "image/png" });
  const result = await extractSmartChitDocument({ file, activeTenantContext: { workspace_id: "workspace-1" } }, {
    generate: async (_file, options) => {
      receivedWorkspace = options.workspaceId;
      return { draft: createEmptyDraft(), validation: {}, extractionStatus: "SUCCESS", ocrResponse: response };
    },
  });
  assert.equal(receivedWorkspace, "workspace-1");
  assert.equal(result.review.provider, "gemini");
  await assert.rejects(
    extractSmartChitDocument({ file, activeTenantContext: null }, { generate: async () => ({}) }),
    (error) => error.code === "WORKSPACE_ACCESS_DENIED"
  );
});

test("save draft records authenticated audit metadata through the injected repository boundary", async () => {
  const file = new File(["png"], "receipt.png", { type: "image/png" });
  const review = applyReviewValue(mapOCRResponseToReview(response), "memberName", "Anika Rao");
  let persisted = null;
  const sourceDraft = createEmptyDraft();
  sourceDraft.business.installmentPattern = { value: "FIXED_MONTHLY", state: "FOUND" };
  const outcome = await saveSmartChitDraft({
    draft: sourceDraft, review, file,
    activeTenantContext: { workspace_id: "workspace-1", tenant_id: "tenant-1", data_scope: "real_tenant" },
  }, {
    getSession: async () => ({ user: { id: "user-1" } }),
    saveDraftImpl: async (draft, context) => { persisted = { draft, context }; return { id: "draft-1", status: "PENDING_REVIEW" }; },
  });
  assert.equal(outcome.saved.id, "draft-1");
  assert.equal(persisted.context.workspace_id, "workspace-1");
  assert.equal(persisted.draft.extractionMetadata.audit.authenticatedUserId, "user-1");
  assert.equal(persisted.draft.extractionMetadata.audit.userCorrections.memberName.to, "Anika Rao");
  assert.equal(persisted.draft.schedule.length, 10);
  assert.equal(outcome.validation.status, "VALID");
  const confirmed = confirmBusinessUnderstanding(outcome.draft).draft;
  assert.equal(evaluateCreationReadiness(confirmed).ready, true);
  const reloaded = await loadSmartChitDraft("draft-1", persisted.context, {
    loadDraftImpl: async () => ({
      id: "draft-1",
      provider: "gemini",
      file_name: "receipt.png",
      file_mime_type: "image/png",
      file_size: 3,
      parsed_draft: persisted.draft,
    }),
  });
  assert.equal(reloaded.review.fields.memberName.value, "Anika Rao");
  assert.equal(reloaded.review.fields.memberName.corrected, true);
  assert.equal(reloaded.file.name, "receipt.png");
  const deleted = await deleteSmartChitDraft("draft-1", persisted.context, {
    deleteDraftImpl: async (id, context) => ({ id, workspaceId: context.workspace_id, deleted: true }),
  });
  assert.deepEqual(deleted, { id: "draft-1", workspaceId: "workspace-1", deleted: true });
  assert.equal(JSON.stringify(persisted.draft).includes("Bearer "), false);
  await assert.rejects(
    saveSmartChitDraft({ draft: createEmptyDraft(), review, file, activeTenantContext: { workspace_id: "workspace-1" } }, {
      getSession: async () => ({ user: null }),
      saveDraftImpl: async () => { throw new Error("must not persist"); },
    }),
    (error) => error.code === "SESSION_EXPIRED"
  );
});

test("component contract covers extraction, correction, draft save, workspace denial, retry and cancellation", async () => {
  const [source, repository, cleanupMigration] = await Promise.all([
    readFile(new URL("../../components/ai/SmartChitCapture.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../repositories/supabase/AIChitExtractionRepository.js", import.meta.url), "utf8"),
    readFile(new URL("../../../supabase/migrations/006_ai_chit_draft_cleanup.sql", import.meta.url), "utf8"),
  ]);
  for (const contract of [
    "extractSmartChitDocument", "applyReviewValue", "saveSmartChitDraft", "createSmartChitRecord",
    "Select a valid business workspace", "Retry OCR", "Cancel upload", "Raw OCR text and warnings",
    "onSessionExpired", "disabled={busy}", "loadSmartChitDraft", "deleteSmartChitDraft", "Delete Draft",
  ]) assert.match(source, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /localStorage|supabase\.from|Bearer\s+[A-Za-z0-9]/);
  assert.match(repository, /delete_pending_ai_chit_draft/);
  for (const constraint of ["created_by = auth.uid()", "status = 'PENDING_REVIEW'", "membership.workspace_id = extraction.workspace_id"]) {
    assert.match(cleanupMigration, new RegExp(constraint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
