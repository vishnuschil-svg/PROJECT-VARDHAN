import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ChitDocumentUnderstandingEngine,
  DOCUMENT_TYPES,
  FIELD_STATUS,
} from "../../domain/chit/services/ChitDocumentUnderstandingEngine.js";
import { AILearningMemory } from "../../ai/AILearningMemory.js";
import { createExternalOCRProviderAdapter, ExternalOCRProviderAdapter } from "../../ai/providers/ExternalOCRProviderAdapter.js";

test("document intelligence parses fields, suggests a pattern, and preserves confidence evidence", () => {
  const analysis = ChitDocumentUnderstandingEngine.buildAnalysis({
    file: { name: "fixed-chit-plan.json", type: "application/json", size: 256 },
    rawText: JSON.stringify({
      chitName: "Owner Confirmed Plan",
      chitValue: 100000,
      memberCount: 10,
      duration: 10,
      monthlyPayment: 10000,
      notes: "fixed monthly commission dividend",
    }),
  });

  assert.ok(DOCUMENT_TYPES.includes(analysis.documentType));
  assert.equal(analysis.fields.chitName.status, FIELD_STATUS.FOUND);
  assert.ok(analysis.fields.chitName.confidence > 0);
  assert.ok(analysis.fields.chitName.evidence);
  assert.ok(analysis.detectedPattern.type);
  assert.ok(analysis.detectedPattern.confidence >= 0 && analysis.detectedPattern.confidence <= 1);
  assert.equal(analysis.status, "Needs Review");
  assert.equal(analysis.confirmedConfiguration, null);
  assert.equal(ExternalOCRProviderAdapter.isConfigured(), true);
});

test("supported-layout learning produces suggestions that still require an explicit owner action", () => {
  const suggestions = AILearningMemory.suggest([
    { key: "documentLayout", value: "Month-wise Schedule", confidence: 0.9, source: "CONFIRMED_TEMPLATE" },
  ]);
  assert.equal(suggestions[0].value, "Month-wise Schedule");
  assert.deepEqual(suggestions[0].actions, ["ACCEPT", "EDIT", "REJECT", "FORGET"]);
  assert.match(suggestions[0].message, /previous confirmed template/i);
});

test("the isolated document engine has no repository or ledger dependency", async () => {
  const source = await readFile(new URL("../../domain/chit/services/ChitDocumentUnderstandingEngine.js", import.meta.url), "utf8");
  const importLines = source.split(/\r?\n/).filter((line) => /^\s*import\s/.test(line));
  assert.equal(importLines.some((line) => /repositor|ledger|finance/i.test(line)), false);
  assert.doesNotMatch(source, /\.save\s*\(|\.createLedger\s*\(|\.approveBusiness\s*\(/);
  const requests = [];
  const adapter = createExternalOCRProviderAdapter({
    endpoint: "/api/ocr/extract",
    getAccessToken: async () => "test-token",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          status: "SUCCESS",
          documentId: "document-1",
          provider: "mock-vision",
          rawText: "verified OCR evidence",
          documentType: "CHIT_REGISTER",
          languageDetected: "ENGLISH",
          extraction: {
            chitName: "Verified",
            chitValue: 100000,
            durationMonths: 10,
            memberCount: 10,
            monthlyInstallment: 10000,
            installmentPattern: "FIXED_MONTHLY",
            members: [],
            installmentSchedule: [],
          },
          confidence: {
            overallScore: 0.9,
            fieldScores: {},
            mathValidated: true,
            requiresHumanReview: false,
          },
          missingFields: [],
          warnings: [],
        }),
      };
    },
  });
  const file = new File(["image"], "plan.png", { type: "image/png" });
  const extraction = await adapter.extract(file, { workspaceId: "workspace-1" });
  assert.equal(extraction.rawText, "verified OCR evidence");
  assert.equal(requests[0].url, "/api/ocr/extract");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
  const serviceSource = await readFile(new URL("../../services/universalBusinessRuleService.js", import.meta.url), "utf8");
  assert.match(serviceSource, /buildDraftFromNormalizedJSON/);
  assert.match(serviceSource, /validateDraft\(draft\)/);
});

test("OCR adapter preserves backend domain codes on 502/503 instead of collapsing them", async () => {
  const cases = [
    { status: 503, code: "OCR_NOT_CONFIGURED", message: "Document extraction is not configured." },
    { status: 502, code: "OCR_SCHEMA_INVALID", message: "Vision provider output is not valid JSON." },
    { status: 503, code: "OCR_PROVIDER_UNAVAILABLE", message: "The OCR provider is temporarily unavailable." },
  ];
  for (const sample of cases) {
    const adapter = createExternalOCRProviderAdapter({
      endpoint: "/api/v1/ocr/extract",
      getAccessToken: async () => "test-token",
      fetchImpl: async () => ({
        ok: false,
        status: sample.status,
        headers: { get: () => "application/json" },
        json: async () => ({ detail: { code: sample.code, message: sample.message, retryable: true } }),
      }),
    });
    await assert.rejects(
      () => adapter.extract(new File(["image"], "plan.png", { type: "image/png" }), { workspaceId: "workspace-1" }),
      (error) => {
        assert.equal(error.code, sample.code);
        assert.match(error.message, new RegExp(sample.message.slice(0, 20)));
        return true;
      }
    );
  }
});
