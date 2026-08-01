import test from "node:test";
import assert from "node:assert/strict";
import { parseChitNaturalText } from "../../domain/chit/parsers/ChitNaturalTextParser.js";
import { normalizeOCRResponse, OCRProviderError } from "../../ai/providers/ExternalOCRProviderAdapter.js";
import { generateBusinessUnderstanding } from "../../services/universalBusinessRuleService.js";
import { VALIDATION_STATUS } from "../../domain/chit/validation/ValidationService.js";

const structuredResponse = (overrides = {}) => ({
  status: "SUCCESS",
  documentId: "doc-jpg-1",
  provider: "mock-gemini-vision",
  rawText: "Chit Name: Mitra Nidhi Gold",
  documentType: "CHIT_REGISTER",
  languageDetected: "ENGLISH",
  extraction: {
    chitName: "Mitra Nidhi Gold",
    chitCode: null,
    organizerName: null,
    chitValue: 100000,
    durationMonths: 20,
    memberCount: 20,
    monthlyInstallment: 5000,
    installmentPattern: "FIXED_MONTHLY",
    members: [],
    installmentSchedule: Array.from({ length: 20 }, (_, index) => ({
      monthNumber: index + 1,
      standardPayment: 5000,
      confidence: 0.94,
    })),
    auctionHistory: [],
    collections: [],
    dividends: [],
  },
  confidence: {
    overallScore: 0.94,
    fieldScores: {
      chitName: 0.96,
      chitValue: 0.95,
      duration: 0.93,
      memberCount: 0.93,
      installmentPattern: 0.92,
    },
    mathValidated: true,
    requiresHumanReview: false,
  },
  missingFields: [],
  warnings: [],
  ...overrides,
});

test("English and Telugu mixed natural text normalizes mandatory fields and patterns", () => {
  const english = parseChitNaturalText(
    "Chit Name: Mitra Gold\nChit Value: 100000\nDuration: 20 months\nMembers: 20\nMonthly Installment: 5000\nPattern: Fixed Monthly"
  );
  assert.deepEqual(
    [english.chitName, english.chitValue, english.duration, english.memberCount, english.monthlyPayment, english.installmentPattern],
    ["Mitra Gold", 100000, 20, 20, 5000, "FIXED_MONTHLY"]
  );

  const telugu = parseChitNaturalText(
    "చిట్ పేరు: మిత్ర నిధి; మొత్తం: ౧౦౦౦౦౦; కాలం: ౨౦; సభ్యుల సంఖ్య: ౨౦; వాయిదా: ౫౦౦౦; స్థిర వాయిదా"
  );
  assert.equal(telugu.chitValue, 100000);
  assert.equal(telugu.duration, 20);
  assert.equal(telugu.memberCount, 20);
  assert.equal(telugu.installmentPattern, "FIXED_MONTHLY");
  assert.equal(parseChitNaturalText("Pattern: variable monthly").installmentPattern, "VARIABLE_MONTHLY");
  assert.equal(parseChitNaturalText("lifted/non-lifted payment").installmentPattern, "LIFTED_NON_LIFTED");
});

test("mock JPG OCR populates mandatory Business Workspace draft fields and metadata", async () => {
  const response = normalizeOCRResponse(structuredResponse());
  const file = new File(["\xff\xd8\xff"], "printed-chit.jpg", { type: "image/jpeg" });
  const result = await generateBusinessUnderstanding(file, {
    workspaceId: "workspace-1",
    ocrAdapter: { extract: async () => response },
  });

  assert.deepEqual(
    [
      result.draft.business.chitName.value,
      result.draft.business.chitValue.value,
      result.draft.business.duration.value,
      result.draft.business.memberCount.value,
      result.draft.business.installmentPattern.value,
    ],
    ["Mitra Nidhi Gold", 100000, 20, 20, "FIXED_MONTHLY"]
  );
  assert.equal(result.validation.status, VALIDATION_STATUS.VALID);
  assert.equal(result.draft.extractionMetadata.sourceDocument.provider, "mock-gemini-vision");
  assert.equal(result.draft.extractionMetadata.sourceDocument.documentId, "doc-jpg-1");
  assert.equal(result.draft.extractionMetadata.rawTextLength, response.rawText.length);
});

test("PDF uses the same structured bridge and low confidence remains visible", async () => {
  const response = normalizeOCRResponse(structuredResponse({
    documentId: "doc-pdf-1",
    confidence: {
      ...structuredResponse().confidence,
      overallScore: 0.74,
      requiresHumanReview: true,
    },
  }));
  const file = new File(["%PDF-1.7"], "chit-sheet.pdf", { type: "application/pdf" });
  const result = await generateBusinessUnderstanding(file, {
    workspaceId: "workspace-1",
    ocrAdapter: { extract: async () => response },
  });
  assert.equal(result.draft.business.installmentPattern.value, "FIXED_MONTHLY");
  assert.equal(result.confidence, 0.74);
  assert.equal(result.draft.extractionMetadata.sourceDocument.mimeType, "application/pdf");
});

test("manual natural text is a deliberate fallback and JSON manual input stays supported", async () => {
  const failedAdapter = {
    extract: async () => {
      throw new OCRProviderError("OCR_TIMEOUT", "timed out", { retryable: true });
    },
  };
  const file = new File(["\x89PNG"], "chit.png", { type: "image/png" });
  const manual = await generateBusinessUnderstanding(file, {
    workspaceId: "workspace-1",
    manualText: "Chit Name: Manual Gold; Chit Value: 60000; Duration: 12; Members: 12; Installment: 5000; Fixed Monthly",
    ocrAdapter: failedAdapter,
  });
  assert.equal(manual.extractionStatus, "MANUAL_FALLBACK_USED");
  assert.equal(manual.draft.business.chitName.value, "Manual Gold");
  assert.equal(manual.draft.schedule.length, 12);

  const json = await generateBusinessUnderstanding(file, {
    workspaceId: "workspace-1",
    manualText: JSON.stringify({
      chitName: "JSON Gold",
      chitValue: 60000,
      duration: 12,
      memberCount: 12,
      monthlyPayment: 5000,
      installmentPattern: "FIXED_MONTHLY",
    }),
    ocrAdapter: failedAdapter,
  });
  assert.equal(json.draft.business.chitName.value, "JSON Gold");
});

test("provider errors are preserved and empty/invalid output is never success", async () => {
  const file = new File(["image"], "failed.jpg", { type: "image/jpeg" });
  await assert.rejects(
    generateBusinessUnderstanding(file, {
      workspaceId: "workspace-1",
      ocrAdapter: {
        extract: async () => {
          throw new OCRProviderError("OCR_TIMEOUT", "Provider timed out.", { retryable: true });
        },
      },
    }),
    (error) => error.code === "OCR_TIMEOUT"
  );
  assert.throws(
    () => normalizeOCRResponse(structuredResponse({
      extraction: {
        chitName: null,
        chitValue: null,
        durationMonths: null,
        memberCount: null,
        monthlyInstallment: null,
        installmentPattern: "UNKNOWN",
        members: [],
        installmentSchedule: [],
      },
    })),
    (error) => error.code === "DOCUMENT_UNREADABLE"
  );
  assert.throws(
    () => normalizeOCRResponse({ status: "SUCCESS" }),
    (error) => error.code === "OCR_SCHEMA_INVALID"
  );
});
