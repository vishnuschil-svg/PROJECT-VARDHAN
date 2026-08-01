import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDraft,
  VALIDATION_STATUS,
  REQUIRED_SCHEDULE_COLUMNS,
} from "../../domain/chit/validation/ValidationService.js";
import { confirmBusinessUnderstanding } from "../../services/universalBusinessRuleService.js";

function scheduleRow(monthNumber, standardPayment) {
  return Object.fromEntries(REQUIRED_SCHEDULE_COLUMNS.map((column) => [
    column,
    column === "monthNumber" ? monthNumber : column === "standardPayment" ? standardPayment : null,
  ]));
}

function completeDraft(pattern = "FIXED_MONTHLY", payments = [1000, 1000]) {
  return {
    business: {
      chitName: { value: "Validation Chit", state: "OWNER_DEFINED" },
      chitValue: { value: 2000, state: "OWNER_DEFINED" },
      duration: { value: payments.length, state: "OWNER_DEFINED" },
      memberCount: { value: 2, state: "OWNER_DEFINED" },
      installmentPattern: { value: pattern, state: "OWNER_DEFINED" },
    },
    financialPrimitives: {
      bidRule: { value: "Auction", state: "OWNER_DEFINED" },
      commission: { value: 5, state: "OWNER_DEFINED" },
      dividend: { value: 100, state: "OWNER_DEFINED" },
      penalty: { value: 25, state: "OWNER_DEFINED" },
      liftRule: { value: "NEXT_MONTH", state: "OWNER_DEFINED" },
      deposit: { value: 200, state: "OWNER_DEFINED" },
    },
    schedule: payments.map((payment, index) => scheduleRow(index + 1, payment)),
    rules: { detected: [], notDetected: [] },
    workspace: { ownerConfirmed: false, ownerChanges: [], auditLog: [] },
  };
}

test("returns the exact validation result contract", () => {
  assert.deepEqual(Object.keys(validateDraft(completeDraft())), [
    "status", "errors", "warnings", "missingFields", "unsupportedRules",
  ]);
});

test("fixed monthly DraftBusinessModel is VALID", () => {
  const result = validateDraft(completeDraft("FIXED_MONTHLY", [1000, 1000]));
  assert.equal(result.status, VALIDATION_STATUS.VALID);
  assert.deepEqual(result.errors, []);
});

test("variable monthly DraftBusinessModel is VALID", () => {
  const result = validateDraft(completeDraft("VARIABLE_MONTHLY", [1200, 800]));
  assert.equal(result.status, VALIDATION_STATUS.VALID);
});

test("fixed installment consistency, ISO start date, and percentage limits are enforced", () => {
  const draft = completeDraft("FIXED_MONTHLY", [1200, 800]);
  draft.business.startDate = { value: "24/07/2026", state: "OWNER_DEFINED" };
  draft.financialPrimitives.commission.value = 101;
  const result = validateDraft(draft);
  assert.equal(result.status, VALIDATION_STATUS.INVALID);
  assert.ok(result.errors.some((error) => error.includes("same standard payment")));
  assert.ok(result.errors.some((error) => error.includes("YYYY-MM-DD")));
  assert.ok(result.errors.some((error) => error.includes("0 to 100")));
});

test("lifted/non-lifted and custom month-wise patterns are supported", () => {
  assert.equal(validateDraft(completeDraft("LIFTED_NON_LIFTED", [1200, 800])).status, VALIDATION_STATUS.VALID);
  assert.equal(validateDraft(completeDraft("CUSTOM_RULE", [1200, 800])).status, VALIDATION_STATUS.VALID);
});

test("invalid business and schedule values return INVALID", () => {
  const draft = completeDraft();
  draft.business.chitValue.value = 0;
  draft.schedule[1].monthNumber = 1;
  draft.schedule[0].penalty = -1;
  const result = validateDraft(draft);
  assert.equal(result.status, VALIDATION_STATUS.INVALID);
  assert.ok(result.errors.some((error) => error.includes("chitValue")));
  assert.ok(result.errors.some((error) => error.includes("unique")));
  assert.ok(result.errors.some((error) => error.includes("negative")));
});

test("an optional financial primitive may remain not found", () => {
  const draft = completeDraft();
  draft.financialPrimitives.penalty = { value: null, state: "NOT_FOUND" };
  const result = validateDraft(draft);
  assert.equal(result.status, VALIDATION_STATUS.VALID);
  assert.ok(!result.missingFields.includes("Penalty"));
});

test("unsupported rule or installment pattern returns UNSUPPORTED_PATTERN", () => {
  const draft = completeDraft("DAILY_ROLLOVER");
  draft.rules.detected.push({ key: "cryptoSettlement", label: "Crypto Settlement", state: "DETECTED" });
  const result = validateDraft(draft);
  assert.equal(result.status, VALIDATION_STATUS.UNSUPPORTED_PATTERN);
  assert.ok(result.unsupportedRules.includes("Crypto Settlement"));
  assert.ok(result.unsupportedRules.some((rule) => rule.includes("DAILY_ROLLOVER")));
});

test("owner confirmation cannot pass a non-VALID draft to creation", () => {
  const draft = completeDraft();
  draft.business.memberCount = { value: null, state: "NOT_FOUND" };
  assert.throws(() => confirmBusinessUnderstanding(draft), /INVALID/);
});
