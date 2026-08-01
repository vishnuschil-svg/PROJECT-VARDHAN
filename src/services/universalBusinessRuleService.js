/**
 * Universal Business Rule Service
 *
 * Draft → Validate → Commit pipeline.
 *
 * Phase 1 (Draft):  AI populates DraftBusinessModel ONLY.
 *                    NEVER creates chit groups, members, ledgers, or financial rules.
 * Phase 2 (Validate): ValidationService checks the draft.
 *                     Returns VALID | INVALID | NEEDS_OWNER_CONFIRMATION.
 * Phase 3 (Commit):  Only when VALID + owner confirmed → create ERP records.
 *
 * This service sits BEFORE the financial calculation engine.
 * No financial logic changes. No ledger changes. No repository changes.
 */

import { UniversalBusinessRuleEngine } from "../domain/chit/services/UniversalBusinessRuleEngine.js";
import { ChitDocumentUnderstandingEngine } from "../domain/chit/services/ChitDocumentUnderstandingEngine.js";
import { GroupsRepository } from "../repositories/chits/GroupsRepository.js";
import { CaptureRepository } from "../repositories/CaptureRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitTemplateRepository } from "../repositories/ChitTemplateRepository.js";
import { ActivityRepository } from "../repositories/ActivityRepository.js";
import { AIChitExtractionRepository } from "../repositories/supabase/AIChitExtractionRepository.js";
import { extractDocumentEvidence } from "./documentExtractionCore.js";
import {
  buildDraftFromNormalizedJSON,
  applyOwnerCorrectionsToDraft,
  confirmDraft,
} from "../domain/chit/models/DraftBusinessModel.js";
import { validateDraft, VALIDATION_STATUS } from "../domain/chit/validation/ValidationService.js";
import { mapDraftToBusinessDSL } from "../domain/chit/dsl/BusinessDSLMapper.js";
import { BUSINESS_DSL_STATUS } from "../domain/chit/dsl/BusinessDSLModel.js";
import { simulateBusinessDSL, SIMULATION_STATUS } from "../domain/chit/simulation/SimulationEngine.js";
import { executeBusinessRules, RULE_ENGINE_STATUS } from "../domain/chit/rules/DeterministicRuleEngine.js";
import { createLedger, verifyLedger, LEDGER_STATUS } from "../domain/chit/ledger/ImmutableLedgerEngine.js";

/**
 * Phase 1: Analyze document and generate a DraftBusinessModel.
 * AI ONLY populates the draft. NEVER creates records.
 *
 * @param {File} file - Uploaded document
 * @param {Object} options
 * @param {string} [options.manualText] - Manual text fallback
 * @param {Array} [options.members] - Pre-parsed member entries
 * @returns {{ draft: Object, validation: Object, normalizedJSON: Object }}
 */
export async function generateBusinessUnderstanding(file, options = {}) {
  const evidence = await extractDocumentEvidence(file, options);

  // Generate the normalized JSON using the Universal Business Rule Engine
  const normalizedJSON = UniversalBusinessRuleEngine.generateNormalizedJSON({
    file,
    rawText: evidence.rawText,
    rows: evidence.rows,
    members: evidence.members,
    provider: evidence.provider,
    structuredExtraction: evidence.structuredExtraction,
    providerMetadata: evidence.providerMetadata,
  });

  // Build DraftBusinessModel from normalized JSON
  const draft = buildDraftFromNormalizedJSON(normalizedJSON);

  // Validate the draft
  const draftValidation = validateDraft(draft);

  return {
    draft,
    validation: draftValidation,
    normalizedJSON,
    // Legacy compatibility for existing UI
    legacy: ChitDocumentUnderstandingEngine.buildAnalysis({
      file,
      rawText: evidence.rawText,
      rows: normalizedJSON["Month Schedule"],
      provider: evidence.provider,
    }),
    extractionStatus: evidence.status,
    confidence: evidence.providerMetadata?.confidenceScore ?? normalizedJSON.Confidence?.overall ?? 0,
    warnings: evidence.providerMetadata?.warnings || [],
    ocrResponse: evidence.providerResponse,
  };
}

/**
 * Phase 2: Apply owner corrections to the DraftBusinessModel.
 * Owner can fill in missing values, confirm/deny detected rules.
 *
 * @param {Object} draft - The current DraftBusinessModel
 * @param {Object} corrections - Owner corrections
 * @returns {{ draft: Object, validation: Object }}
 */
export function applyOwnerCorrections(draft, corrections = {}) {
  const updatedDraft = applyOwnerCorrectionsToDraft(draft, corrections);
  const validation = validateDraft(updatedDraft);
  return { draft: updatedDraft, validation };
}

/**
 * Phase 3: Owner approval gate.
 * Only after owner confirms AND validation passes does the engine create records.
 *
 * @param {Object} draft - Owner-reviewed DraftBusinessModel
 * @returns {{ draft: Object, validation: Object }}
 */
export function confirmBusinessUnderstanding(draft) {
  // Validate before confirming
  const validation = validateDraft(draft);
  if (validation.status !== VALIDATION_STATUS.VALID) {
    throw new Error(
      `Cannot confirm: validation status is ${validation.status}. ${[...validation.errors, ...validation.warnings].join(" ")}`
    );
  }

  const confirmedDraft = confirmDraft(draft);
  return { draft: confirmedDraft, validation };
}

/**
 * Persist a tenant-scoped review draft when the production repository is active.
 * Local development keeps the existing browser-only behavior.
 */
export async function saveBusinessUnderstandingDraft(draft, tenantContext) {
  if (!usesProductionPersistence()) {
    return {
      id: draft?.extractionMetadata?.sourceDocument?.documentId || `local-draft-${Date.now()}`,
      status: "PENDING_REVIEW",
      parsed_draft: draft,
    };
  }
  return AIChitExtractionRepository.saveDraft(draft, tenantContext);
}

export async function loadBusinessUnderstandingDraft(extractionId, tenantContext) {
  if (!usesProductionPersistence()) return null;
  return AIChitExtractionRepository.getDraft(extractionId, tenantContext);
}

export async function deleteBusinessUnderstandingDraft(extractionId, tenantContext) {
  if (!usesProductionPersistence()) return { id: extractionId, deleted: true };
  return AIChitExtractionRepository.deleteDraft(extractionId, tenantContext);
}

/** Pure, read-only readiness evaluation. No repository or persistence calls. */
export function evaluateCreationReadiness(draft, { ownerApproved = draft?.workspace?.ownerConfirmed === true } = {}) {
  const validation = validateDraft(draft);
  const mapping = validation.status === VALIDATION_STATUS.VALID
    ? mapDraftToBusinessDSL(draft)
    : { status: BUSINESS_DSL_STATUS.UNSUPPORTED_PATTERN, model: null, unsupportedRules: validation.errors };
  const simulation = mapping.status === BUSINESS_DSL_STATUS.SUCCESS
    ? simulateBusinessDSL(mapping.model)
    : { status: SIMULATION_STATUS.FAIL, errors: mapping.unsupportedRules || [], warnings: [] };
  const rules = mapping.status === BUSINESS_DSL_STATUS.SUCCESS
    ? executeBusinessRules(mapping.model)
    : { status: RULE_ENGINE_STATUS.FAIL, financialObjects: {}, errors: mapping.unsupportedRules || [] };
  const ledger = createLedger({ ledgerId: "pending-chit-ledger" });
  const ledgerVerification = verifyLedger(ledger);
  const ready = Boolean(
    validation.status === VALIDATION_STATUS.VALID &&
    mapping.status === BUSINESS_DSL_STATUS.SUCCESS &&
    simulation.status === SIMULATION_STATUS.PASS &&
    ownerApproved &&
    rules.status === RULE_ENGINE_STATUS.PASS &&
    ledgerVerification.status === LEDGER_STATUS.READY
  );

  return {
    ready,
    validationStatus: validation.status,
    dslMappingStatus: mapping.status,
    simulationStatus: simulation.status,
    ownerApprovalStatus: ownerApproved ? "APPROVED" : "PENDING",
    ruleEngineStatus: rules.status,
    ledgerStatus: ledgerVerification.status,
    validation,
    dslModel: mapping.model,
    simulationReport: simulation,
    financialObjects: rules.financialObjects,
    ledger,
  };
}

/**
 * Phase 4: Create chit from the owner-approved DraftBusinessModel.
 * Called ONLY after owner approval + VALID status.
 * Integrates with existing repositories WITHOUT modifying them.
 *
 * @param {Object} draft - Owner-approved and confirmed DraftBusinessModel
 * @param {Object} tenantContext - Tenant context for repository calls
 * @param {Object} [options]
 * @param {boolean} [options.saveTemplate=false] - Whether to save as template
 * @returns {Object} Created chit group, schedule, rules, etc.
 */
export function createChitFromBusinessUnderstanding(draft, tenantContext, { saveTemplate = false } = {}) {
  // SAFETY CHECK: Must have owner approval
  if (!draft.workspace?.ownerConfirmed) {
    throw new Error(
      "Owner confirmation is required before chit creation. The business understanding must be reviewed and approved."
    );
  }

  // FINAL SAFETY CHECK: every mandatory boundary must pass before repositories.
  const readiness = evaluateCreationReadiness(draft);
  if (!readiness.ready) {
    throw new Error(
      `Cannot create chit: readiness gate failed (${readiness.validationStatus}/${readiness.dslMappingStatus}/${readiness.simulationStatus}/${readiness.ownerApprovalStatus}/${readiness.ruleEngineStatus}/${readiness.ledgerStatus}).`
    );
  }

  if (!tenantContext?.tenant_id || !tenantContext?.data_scope) {
    throw new Error("Tenant and workspace scope are required.");
  }

  if (usesProductionPersistence()) {
    return commitProductionDraft(draft, tenantContext);
  }

  const business = draft.business || {};
  const schedule = Array.isArray(draft.schedule) ? draft.schedule : [];
  const detectedRules = Array.isArray(draft.rules?.detected) ? draft.rules.detected : [];
  const unknownRules = Array.isArray(draft.rules?.notDetected) ? draft.rules.notDetected : [];
  const members = Array.isArray(draft.members) ? draft.members : [];

  // Extract safe values — NEVER default to 0 for missing values
  const getBusinessValue = (key) => {
    const field = business[key];
    if (!field) return null;
    if (field.state === "NOT_FOUND" || field.value === null || field.value === undefined) return null;
    return field.value;
  };

  const chitName = getBusinessValue("chitName") || `Chit from ${draft.extractionMetadata?.sourceDocument?.name || "document"}`;
  const chitValue = getBusinessValue("chitValue");
  const memberCount = getBusinessValue("memberCount");
  const duration = getBusinessValue("duration");

  // Create the group record
  const groupId = `group-draft-${Date.now()}`;

  // Build rule set from detected + unknown rules
  const ruleSet = buildRuleSetFromDetectedRules(detectedRules, unknownRules);

  // Build schedule rows — only include values that were extracted or owner-defined
  const scheduleRows = buildScheduleFromNormalized(schedule, groupId);

  const group = GroupsRepository.upsert({
    id: groupId,
    chit_name: chitName,
    chit_code: `DRAFT-${Date.now()}`,
    chit_value: chitValue,
    monthly_amount: scheduleRows[0]?.standardPayment ?? null,
    total_members: memberCount,
    total_months: duration || scheduleRows.length,
    status: "active",
    source: "DRAFT_BUSINESS_MODEL",
    document_reference: draft.extractionMetadata?.sourceDocument?.name || null,
    business_rules: ruleSet,
    detected_rules: detectedRules,
    unknown_rules: unknownRules,
  }, { activeTenantContext: tenantContext });

  // Save schedule
  const savedSchedule = scheduleRows.length > 0
    ? ChitScheduleRepository.saveMany(scheduleRows, tenantContext)
    : [];

  // Save rules
  const savedRules = ChitRuleRepository.save({
    groupId: group.id,
    status: "CONFIRMED",
    ...ruleSet,
    terms: [],
    relationships: [],
  }, tenantContext);

  // Save the document/analysis record
  const document = CaptureRepository.save({
    ...draft,
    status: "CONFIRMED",
    confirmedConfiguration: { groupId: group.id },
    auditLog: [
      ...(draft.workspace?.auditLog || []),
      { action: "CHIT_CREATED", at: new Date().toISOString(), details: { groupId: group.id, source: "DRAFT_BUSINESS_MODEL" } },
    ],
  }, tenantContext);

  // Optionally save as template
  const template = saveTemplate
    ? ChitTemplateRepository.save({
        name: `${chitName} template`,
        description: "Owner-approved DraftBusinessModel reconstruction",
        groupId: group.id,
        schedule: savedSchedule,
        rules: savedRules,
        sourceDocumentId: document.id,
      }, tenantContext)
    : null;

  // Log activity
  ActivityRepository.addActivity({
    title: "Chit created from Business Understanding",
    description: `${chitName} created after owner approval via DraftBusinessModel pipeline.`,
    icon: "AI",
    route: "/chits/groups",
  }, tenantContext);

  return {
    group,
    schedule: savedSchedule,
    rules: savedRules,
    document,
    template,
    members,
    draft,
    creationReadiness: readiness,
  };
}

async function commitProductionDraft(draft, tenantContext) {
  const extraction = await AIChitExtractionRepository.saveDraft(
    draft,
    tenantContext,
    { status: "VERIFIED" }
  );
  const committed = await AIChitExtractionRepository.commitDraft(extraction.id, draft);
  return {
    group: committed.group,
    schedule: draft.schedule,
    rules: draft.rules,
    document: { id: extraction.id, status: committed.status },
    template: null,
    members: draft.members,
    draft,
    creationReadiness: evaluateCreationReadiness(draft),
  };
}

function usesProductionPersistence() {
  const environment = import.meta.env || {};
  return String(environment.VITE_REPOSITORY_BACKEND || "").toLowerCase() === "supabase"
    || Boolean(environment.PROD);
}

/**
 * Build a rule set from detected and unknown rules.
 * Rules are never assumed — only confirmed by owner are active.
 */
function buildRuleSetFromDetectedRules(detectedRules, unknownRules) {
  const allRules = [...detectedRules, ...unknownRules];

  const getRuleState = (key) => {
    const rule = allRules.find((r) => r.key === key);
    return rule?.ownerConfirmed === true;
  };

  return {
    paymentPatternType: getRuleState("paymentPattern") ? "MONTH_WISE_VARIABLE" : null,
    auctionEnabled: getRuleState("winnerSelection") && allRules.find((r) => r.key === "winnerSelection")?.evidence?.some(
      (e) => e.toLowerCase().includes("bid") || e.toLowerCase().includes("auction")
    ) ? true : null,
    luckyDrawEnabled: getRuleState("winnerSelection") && allRules.find((r) => r.key === "winnerSelection")?.evidence?.some(
      (e) => e.toLowerCase().includes("lucky") || e.toLowerCase().includes("draw")
    ) ? true : null,
    liftEffectiveRule: getRuleState("liftMechanism") ? "NEXT_MONTH" : null,
    commissionType: getRuleState("hasCommission") ? "PERCENTAGE" : null,
    commissionValue: null,
    penaltyType: getRuleState("hasPenalty") ? "LATE_FEE" : null,
    penaltyValue: null,
    depositRule: getRuleState("hasDeposit") ? "REQUIRED" : null,
    minimumBidType: null,
    maximumBidType: null,
    minimumBidValue: null,
    maximumBidValue: null,
    dividendEnabled: getRuleState("hasDividend") ? true : null,
    payoutEnabled: getRuleState("prizePayout") ? true : null,
    memberReplacementAllowed: null,
    receiptCancellationRequiresReason: true,
    monthReopenRequiresPermission: true,
    overpaymentRule: null,
    advancePaymentRule: null,
    partialPaymentRule: null,
    customRules: {},
  };
}

/**
 * Build schedule rows from normalized schedule.
 * Only includes values that were extracted or owner-edited.
 * Missing values remain null, never default to 0.
 */
function buildScheduleFromNormalized(schedule, groupId) {
  return schedule.map((row, index) => ({
    groupId,
    group_id: groupId,
    monthNumber: row.monthNumber || index + 1,
    monthLabel: row.monthLabel || `Month ${index + 1}`,
    standardPayment: row.standardPayment ?? null,
    nonLiftedPayment: row.nonLiftedPayment ?? null,
    liftedPayment: row.liftedPayment ?? null,
    prizeAmount: row.prizeAmount ?? null,
    bidAmount: row.bidAmount ?? null,
    commissionValue: row.commissionValue ?? null,
    deposit: row.deposit ?? null,
    dividendPerMember: row.dividendPerMember ?? null,
    penalty: row.penalty ?? null,
    otherDeductions: row.otherDeductions ?? null,
    netAmount: row.netAmount ?? null,
    confidence: row.confidence || 0,
    evidence: row.evidence || `Schedule row ${index + 1}`,
    isUserConfirmed: Boolean(row.isOwnerEdited),
    sourceType: "DRAFT_BUSINESS_MODEL",
  }));
}
