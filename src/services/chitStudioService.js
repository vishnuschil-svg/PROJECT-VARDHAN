import { GroupsRepository } from "../repositories/chits/index.js";
import { ChitRuleRepository } from "../repositories/ChitRuleRepository.js";
import { ChitScheduleRepository } from "../repositories/ChitScheduleRepository.js";
import { ChitTemplateRepository } from "../repositories/ChitTemplateRepository.js";
import { LocalRuleProvider } from "../ai/providers/LocalRuleProvider.js";
import { RuleEngine } from "../domain/chit/services/RuleEngine.js";
import { ScheduleEngine } from "../domain/chit/services/ScheduleEngine.js";
import { TemplateEngine } from "../domain/chit/services/TemplateEngine.js";
import { ScheduleValidator } from "../domain/chit/validators/ScheduleValidator.js";
import { RuleSetValidator } from "../domain/chit/validators/RuleSetValidator.js";

export function getChitCreationModes() {
  return [
    { id: "AI_DESIGN", title: "AI Design - Beginner Mode", description: "Answer simple questions and compare three local rule-based proposals." },
    { id: "IMPORT_EXISTING_PLAN", title: "Import Existing Pattern", description: "Use image, PDF, CSV, Excel or JSON capture with owner confirmation." },
    { id: "USE_SAVED_TEMPLATE", title: "Use Saved Template", description: "Reuse a tenant-isolated confirmed organizer template." },
    { id: "ADVANCED_MANUAL_DESIGNER", title: "Advanced Manual Designer", description: "Configure every month, rule and override manually." },
  ];
}

export function generateChitStudioProposals(input) {
  return LocalRuleProvider.designProposals(input);
}

export function createDraftFromManualDesign({ basic = {}, ruleSet = {}, schedule = [], activeTenantContext } = {}) {
  const normalizedRuleSet = RuleEngine.createDefault(ruleSet);
  const normalizedSchedule = schedule.length ? schedule : ScheduleEngine.generateRows({
    totalMonths: basic.totalMonths || basic.duration,
    standardPayment: basic.monthlyAmount,
    chitValue: basic.chitValue,
    groupId: basic.groupId,
    sourceType: "MANUAL_DESIGNER",
  });
  const validation = {
    ruleSet: RuleSetValidator.validate(normalizedRuleSet),
    schedule: ScheduleValidator.validate(normalizedSchedule, normalizedRuleSet),
  };
  const template = TemplateEngine.buildTemplate({
    name: basic.chitName || "Chit Studio Draft",
    description: "Owner-confirmed Chit Studio draft",
    category: normalizedRuleSet.paymentPatternType,
    ruleSet: normalizedRuleSet,
    schedule: normalizedSchedule,
    sourceType: "CHIT_STUDIO",
    status: "DRAFT",
  });

  return {
    template: ChitTemplateRepository.save(template, activeTenantContext),
    validation,
  };
}

export function createChitGroupFromStudio({ basic = {}, ruleSet = {}, schedule = [], activeTenantContext } = {}) {
  const groupId = basic.groupId || `chit-${Date.now()}`;
  const normalizedRuleSet = RuleEngine.createDefault({ ...ruleSet, groupId });
  const normalizedSchedule = schedule.map((row) => ({ ...row, groupId }));
  const scheduleValidation = ScheduleValidator.validate(normalizedSchedule, normalizedRuleSet);
  const ruleValidation = RuleSetValidator.validate(normalizedRuleSet);

  if (!scheduleValidation.isValid || !ruleValidation.isValid) {
    return { success: false, validation: { schedule: scheduleValidation, ruleSet: ruleValidation }, message: "Validation errors must be fixed before creating group." };
  }

  const firstRow = normalizedSchedule[0] || {};
  const group = GroupsRepository.upsert({
    id: groupId,
    chit_name: basic.chitName || "Schedule Driven Chit",
    chit_code: basic.chitCode || `STUDIO-${Date.now()}`,
    chit_value: Number(basic.chitValue || 0),
    monthly_amount: Number(firstRow.standardPayment || firstRow.nonLiftedPayment || 0),
    total_members: Number(basic.totalMembers || basic.members || 0),
    total_months: Number(normalizedSchedule.length || basic.totalMonths || 0),
    start_date: basic.startDate || "",
    end_date: basic.endDate || "",
    organizer: basic.organizer || "",
    branch: basic.branch || "",
    currency: basic.currency || "INR",
    language: basic.language || "en",
    status: basic.status || "Upcoming",
    schedule_driven: true,
    payment_pattern_type: normalizedRuleSet.paymentPatternType,
    tenant_id: activeTenantContext?.tenant_id,
    data_scope: activeTenantContext?.data_scope,
  }, { activeTenantContext });

  ChitRuleRepository.save({ ...normalizedRuleSet, groupId: group.id }, activeTenantContext);
  ChitScheduleRepository.saveMany(normalizedSchedule.map((row) => ({ ...row, groupId: group.id })), activeTenantContext);

  return { success: true, group, schedule: normalizedSchedule, ruleSet: normalizedRuleSet };
}
